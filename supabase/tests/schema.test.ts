import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'

const migrations = fileURLToPath(new URL('../migrations/', import.meta.url))

// Just enough of Supabase for the migrations to run: auth schema, roles and the realtime publication.
const supabaseStub = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated;
  create publication supabase_realtime;
`

const alice = '00000000-0000-4000-8000-00000000000a'
const bob = '00000000-0000-4000-8000-00000000000b'

let db: PGlite

beforeEach(async () => {
  db = new PGlite()
  await db.exec(supabaseStub)
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(migrations + file, 'utf8'))
  }
  await db.exec(`
    grant usage on schema public to authenticated;
    grant all on all tables in schema public to authenticated;
    insert into auth.users values ('${alice}'), ('${bob}');
  `)
})

/** Runs a query as a signed-in user, like PostgREST does. */
async function asUser<T>(userId: string, sql: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId])
    await tx.exec('set local role authenticated')
    return (await tx.query<T>(sql, params)).rows
  })
}

/** The upsert the app sends through PostgREST. */
function upsertHabit(userId: string, id: string, name: string, slug: string, updatedAt: string, deleted = false) {
  return asUser(
    userId,
    `insert into public.habits (user_id, id, name, slug, schedules, updated_at, deleted)
     values ($1, $2, $3, $4, '[]', $5, $6)
     on conflict (user_id, id) do update set
       name = excluded.name, slug = excluded.slug, updated_at = excluded.updated_at, deleted = excluded.deleted`,
    [userId, id, name, slug, updatedAt, deleted],
  )
}

type HabitRow = { name: string; slug: string; synced_at: Date }

describe('last write wins', () => {
  it('keeps the newer row when an older update arrives later', async () => {
    await upsertHabit(alice, 'h1', 'Neu', 'lesen', '2026-10-25T10:00:02Z')
    await upsertHabit(alice, 'h1', 'Alt', 'lesen', '2026-10-25T10:00:01Z')
    const rows = await asUser<HabitRow>(alice, 'select name from public.habits')
    expect(rows).toEqual([{ name: 'Neu' }])
  })

  it('applies a newer update and moves synced_at forward', async () => {
    await upsertHabit(alice, 'h1', 'Alt', 'lesen', '2026-10-25T10:00:01Z')
    const [before] = await asUser<HabitRow>(alice, 'select synced_at from public.habits')
    await upsertHabit(alice, 'h1', 'Neu', 'lesen', '2026-10-25T10:00:02Z')
    const [after] = await asUser<HabitRow>(alice, 'select name, synced_at from public.habits')
    expect(after.name).toBe('Neu')
    expect(after.synced_at.getTime()).toBeGreaterThanOrEqual(before.synced_at.getTime())
  })
})

describe('row level security', () => {
  it('shows every user only their own rows', async () => {
    await upsertHabit(alice, 'h1', 'Lesen', 'lesen', '2026-10-25T10:00:00Z')
    await upsertHabit(bob, 'h1', 'Laufen', 'laufen', '2026-10-25T10:00:00Z')
    expect(await asUser<HabitRow>(alice, 'select name from public.habits')).toEqual([{ name: 'Lesen' }])
    expect(await asUser<HabitRow>(bob, 'select name from public.habits')).toEqual([{ name: 'Laufen' }])
  })

  it('refuses to write rows for another user', async () => {
    await expect(upsertHabit(bob, 'h1', 'Fremd', 'fremd', '2026-10-25T10:00:00Z')).resolves.toBeDefined()
    await expect(
      asUser(bob, `insert into public.settings (user_id, id, value, updated_at) values ($1, 'x', '1', now())`, [alice]),
    ).rejects.toThrow(/row-level security/)
  })

  it('shows nothing without a signed-in user', async () => {
    const rows = await asUser<HabitRow>('', 'select name from public.habits')
    expect(rows).toEqual([])
  })
})

describe('slugs', () => {
  it('are unique per user among habits that are not deleted', async () => {
    await upsertHabit(alice, 'h1', 'Lesen', 'lesen', '2026-10-25T10:00:00Z')
    await expect(upsertHabit(alice, 'h2', 'Lesen 2', 'lesen', '2026-10-25T10:00:00Z')).rejects.toThrow(/habits_slug/)
    await upsertHabit(bob, 'h3', 'Lesen', 'lesen', '2026-10-25T10:00:00Z')
    await upsertHabit(alice, 'h1', 'Lesen', 'lesen', '2026-10-25T10:00:01Z', true)
    await upsertHabit(alice, 'h2', 'Lesen 2', 'lesen', '2026-10-25T10:00:02Z')
  })

  it('must be lowercase words joined by dashes', async () => {
    await expect(upsertHabit(alice, 'h1', 'Lesen', 'Lesen!', '2026-10-25T10:00:00Z')).rejects.toThrow(/check constraint/)
  })
})

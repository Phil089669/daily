import { uniqueSlug } from '../domain/slug.ts'
import type { Clock } from './clock.ts'
import { outboxKey, syncedTables, type DailyDb, type HabitRecord, type OutboxEntry, type SyncedTable } from './db.ts'

export type RemoteRow = Record<string, unknown>

/** The server side of the sync. The database keeps the newer version of each row (see the migration). */
export interface Remote {
  push(table: SyncedTable, rows: RemoteRow[]): Promise<void>
  /** Rows written after `since` (all rows if null), oldest first, at most `limit`. */
  pull(table: SyncedTable, since: string | null, limit: number): Promise<RemoteRow[]>
}

export class RemoteError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

const uniqueViolation = '23505'
const pageSize = 500
// Pull again from a little before the cursor, in case a row committed late with an earlier timestamp.
const overlapMs = 30_000

const timestampFields = new Set(['updatedAt', 'createdAt'])

const toSnake = (key: string) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)
const toCamel = (key: string) => key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())

export function toRemoteRow(record: object, userId: string): RemoteRow {
  const row: RemoteRow = { user_id: userId }
  for (const [key, value] of Object.entries(record)) row[toSnake(key)] = value
  return row
}

type LocalRecord = Record<string, unknown> & { id: string; updatedAt: string }

export function fromRemoteRow(row: RemoteRow): LocalRecord {
  const record: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'user_id' || key === 'synced_at') continue
    const field = toCamel(key)
    // Postgres returns "…+00:00"; local timestamps are ISO strings that compare correctly as text.
    record[field] = timestampFields.has(field) && typeof value === 'string' ? new Date(value).toISOString() : value
  }
  return record as LocalRecord
}

function laterOf(a: string | undefined, b: string): string {
  return a && new Date(a) > new Date(b) ? a : b
}

/** Uploads queued local changes and downloads remote ones. The newer version of a record wins. */
export class SyncEngine {
  private readonly db: DailyDb
  private readonly remote: Remote
  private readonly userId: string
  private readonly clock: Clock

  constructor(db: DailyDb, remote: Remote, userId: string, clock: Clock) {
    this.db = db
    this.remote = remote
    this.userId = userId
    this.clock = clock
  }

  async sync(): Promise<void> {
    await this.push()
    await this.pull()
  }

  async push(): Promise<number> {
    const entries = await this.db.outbox.toArray()
    let pushed = 0
    for (const table of syncedTables) {
      const queued = entries.filter((entry) => entry.table === table)
      for (let start = 0; start < queued.length; start += pageSize) {
        pushed += await this.pushChunk(table, queued.slice(start, start + pageSize))
      }
    }
    return pushed
  }

  private async pushChunk(table: SyncedTable, entries: OutboxEntry[]): Promise<number> {
    const found = await this.db.recordTable(table).bulkGet(entries.map((entry) => entry.id))
    const records = found.filter((record) => record !== undefined)
    // Deletions first, so a deleted habit frees its slug before another one takes it.
    records.sort((a, b) => Number(b.deleted) - Number(a.deleted))

    let failed = new Set<string>()
    if (records.length > 0) {
      try {
        await this.remote.push(table, records.map((record) => toRemoteRow(record, this.userId)))
      } catch (error) {
        if (!(table === 'habits' && error instanceof RemoteError && error.code === uniqueViolation)) throw error
        failed = await this.pushHabitsOneByOne(records as HabitRecord[])
      }
    }

    // Entries that changed again during the upload stay queued.
    const sentAt = new Map(records.map((record) => [record.id, record.updatedAt]))
    await this.db.transaction('rw', this.db.outbox, async () => {
      for (const entry of entries) {
        if (failed.has(entry.id)) continue
        const current = await this.db.outbox.get(entry.key)
        const sent = sentAt.get(entry.id)
        if (current && (sent === undefined || current.updatedAt === sent)) await this.db.outbox.delete(entry.key)
      }
    })
    return records.length - failed.size
  }

  /** Another device took a slug: upload the others and give the clashing habits a free slug for the next try. */
  private async pushHabitsOneByOne(habits: HabitRecord[]): Promise<Set<string>> {
    const failed = new Set<string>()
    for (const habit of habits) {
      try {
        await this.remote.push('habits', [toRemoteRow(habit, this.userId)])
      } catch (error) {
        if (!(error instanceof RemoteError && error.code === uniqueViolation)) throw error
        failed.add(habit.id)
      }
    }
    if (failed.size === 0) return failed
    const all = await this.db.habits.toArray()
    const taken = new Set(all.filter((habit) => !habit.deleted).map((habit) => habit.slug))
    for (const habit of habits.filter((candidate) => failed.has(candidate.id))) {
      taken.add(habit.slug)
      const renamed: HabitRecord = { ...habit, slug: uniqueSlug(habit.slug, taken), updatedAt: this.clock.next() }
      taken.add(renamed.slug)
      await this.db.transaction('rw', this.db.habits, this.db.outbox, async () => {
        await this.db.habits.put(renamed)
        await this.db.outbox.put({ key: outboxKey('habits', habit.id), table: 'habits', id: habit.id, updatedAt: renamed.updatedAt })
      })
    }
    return failed
  }

  async pull(): Promise<number> {
    let received = 0
    for (const table of syncedTables) {
      const cursorKey = `cursor:${table}`
      let cursor = (await this.db.meta.get(cursorKey))?.value as string | undefined
      let since = cursor ? new Date(new Date(cursor).getTime() - overlapMs).toISOString() : null
      for (;;) {
        const rows = await this.remote.pull(table, since, pageSize)
        if (rows.length === 0) break
        await this.apply(table, rows)
        received += rows.length
        since = rows[rows.length - 1].synced_at as string
        cursor = laterOf(cursor, since)
        await this.db.meta.put({ key: cursorKey, value: cursor })
        if (rows.length < pageSize) break
      }
    }
    return received
  }

  private async apply(table: SyncedTable, rows: RemoteRow[]): Promise<void> {
    const target = this.db.recordTable(table)
    await this.db.transaction('rw', target, this.db.outbox, async () => {
      for (const row of rows) {
        const remote = fromRemoteRow(row)
        this.clock.observe(remote.updatedAt)
        const local = await target.get(remote.id)
        // A newer local version wins; it is queued or already on its way up.
        if (local && local.updatedAt > remote.updatedAt) continue
        await target.put(remote as never)
        await this.db.outbox.delete(outboxKey(table, remote.id))
      }
    })
  }
}

// A fake server and fake devices for data-layer tests.
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { createClock } from './clock.ts'
import { DailyDb, type SyncedTable } from './db.ts'
import { Store } from './store.ts'
import { RemoteError, SyncEngine, type Remote, type RemoteRow } from './sync.ts'

/** Behaves like the Postgres tables: keeps the newer row, sets synced_at, rejects duplicate slugs. */
export class FakeRemote implements Remote {
  private rows = new Map<string, RemoteRow & { table: SyncedTable }>()
  private tick = 0
  /** Runs at the start of every push, e.g. to change data while an upload is in flight. */
  beforePush?: () => Promise<void>

  async push(table: SyncedTable, rows: RemoteRow[]): Promise<void> {
    await this.beforePush?.()
    // Like one upsert statement: all rows or none.
    const next = new Map(this.rows)
    for (const row of rows) {
      const key = `${table}:${String(row.id)}`
      const existing = next.get(key)
      if (existing && String(row.updated_at) < String(existing.updated_at)) continue
      next.set(key, { ...row, table, synced_at: new Date(Date.UTC(2026, 9, 25, 12) + ++this.tick).toISOString() })
      if (table === 'habits' && !row.deleted) {
        for (const [otherKey, other] of next) {
          if (otherKey !== key && other.table === 'habits' && !other.deleted && other.slug === row.slug) {
            throw new RemoteError('duplicate key value violates unique constraint "habits_slug"', '23505')
          }
        }
      }
    }
    this.rows = next
  }

  async pull(table: SyncedTable, since: string | null, limit: number): Promise<RemoteRow[]> {
    return [...this.rows.values()]
      .filter((row) => row.table === table && (since === null || String(row.synced_at) > since))
      .sort((a, b) => (String(a.synced_at) < String(b.synced_at) ? -1 : 1))
      .slice(0, limit)
      .map(({ table: _table, ...row }) => row)
  }

  row(table: SyncedTable, id: string): RemoteRow | undefined {
    return this.rows.get(`${table}:${id}`)
  }
}

/** A device with its own database and a clock that only moves when told to. */
export function makeDevice(remote: Remote, startMs = Date.UTC(2026, 9, 25, 10)) {
  let now = startMs
  const clock = createClock(() => now)
  const db = new DailyDb(`test-${crypto.randomUUID()}`, { indexedDB: new IDBFactory(), IDBKeyRange })
  const store = new Store(db, clock)
  const engine = new SyncEngine(db, remote, 'user-1', clock)
  return {
    db,
    store,
    engine,
    advance(ms: number) {
      now += ms
    },
  }
}

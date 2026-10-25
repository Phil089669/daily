import { createClock, type Clock } from './clock.ts'
import { outboxKey, type DailyDb, type RecordOf, type SyncedTable } from './db.ts'

/** Writes to the local database. Every write is queued for upload in the same transaction. */
export class Store {
  readonly db: DailyDb
  readonly clock: Clock
  private readonly listeners = new Set<() => void>()

  constructor(db: DailyDb, clock: Clock = createClock()) {
    this.db = db
    this.clock = clock
  }

  /** Saves records as newer than the versions they replace. With `keepTimestamps`, their own timestamps stay (seeds). */
  async save<T extends SyncedTable>(table: T, records: RecordOf[T][], keepTimestamps = false): Promise<RecordOf[T][]> {
    if (records.length === 0) return []
    const saved = keepTimestamps
      ? records
      : records.map((record) => {
          this.clock.observe(record.updatedAt)
          return { ...record, updatedAt: this.clock.next() }
        })
    const target = this.db.recordTable(table)
    await this.db.transaction('rw', target, this.db.outbox, async () => {
      await target.bulkPut(saved)
      await this.db.outbox.bulkPut(
        saved.map((record) => ({ key: outboxKey(table, record.id), table, id: record.id, updatedAt: record.updatedAt })),
      )
    })
    for (const listener of this.listeners) listener()
    return saved
  }

  /** Called after every save, e.g. to start a sync. */
  onSave(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

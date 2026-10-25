import Dexie, { type DexieOptions, type EntityTable } from 'dexie'
import type { Habit, HabitEvent } from '../domain/habits.ts'

/** On every synced record: when it last changed (the newer change wins) and whether it is deleted. */
export type SyncFields = { updatedAt: string; deleted: boolean }

export type Category = { id: string; name: string; sortOrder: number }

export type CategoryRecord = Category & SyncFields
export type HabitRecord = Habit & SyncFields
export type HabitEventRecord = HabitEvent & SyncFields & { source: 'app' | 'api' }
export type SettingRecord = SyncFields & { id: string; value: unknown }

export type RecordOf = {
  categories: CategoryRecord
  habits: HabitRecord
  habitEvents: HabitEventRecord
  settings: SettingRecord
}

export type SyncedTable = keyof RecordOf

export const syncedTables: SyncedTable[] = ['categories', 'habits', 'habitEvents', 'settings']

/** A locally changed record that still has to be uploaded. */
export type OutboxEntry = { key: string; table: SyncedTable; id: string; updatedAt: string }

export type MetaEntry = { key: string; value: unknown }

export function outboxKey(table: SyncedTable, id: string): string {
  return `${table}:${id}`
}

export class DailyDb extends Dexie {
  categories!: EntityTable<CategoryRecord, 'id'>
  habits!: EntityTable<HabitRecord, 'id'>
  habitEvents!: EntityTable<HabitEventRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'id'>
  outbox!: EntityTable<OutboxEntry, 'key'>
  meta!: EntityTable<MetaEntry, 'key'>

  constructor(name = 'daily', options?: DexieOptions) {
    super(name, options)
    this.version(1).stores({
      categories: 'id',
      habits: 'id, slug',
      habitEvents: 'id, [habitId+day], day',
      settings: 'id',
      outbox: 'key',
      meta: 'key',
    })
  }

  recordTable<T extends SyncedTable>(table: T): EntityTable<RecordOf[T], 'id'> {
    return this[table] as unknown as EntityTable<RecordOf[T], 'id'>
  }
}

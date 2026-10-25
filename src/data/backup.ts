import { z } from 'zod'
import type { DailyDb, RecordOf, SyncedTable } from './db.ts'
import type { Store } from './store.ts'

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const frequency = z.discriminatedUnion('type', [
  z.object({ type: z.literal('daily') }),
  z.object({ type: z.literal('weekdays'), days: z.array(z.number().int().min(0).max(6)) }),
  z.object({ type: z.literal('perWeek'), times: z.number().int().min(1).max(7) }),
  z.object({ type: z.literal('paused') }),
])

const category = z.object({ id: z.string(), name: z.string(), sortOrder: z.number() })

const habit = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  categoryId: z.string().nullable(),
  schedules: z
    .array(z.object({ from: dayKey, frequency, target: z.number().int().min(1), unit: z.string().nullable() }))
    .min(1),
  sortOrder: z.number(),
  archived: z.boolean(),
  system: z.string().nullable(),
})

const habitEvent = z.object({
  id: z.string(),
  habitId: z.string(),
  day: dayKey,
  type: z.enum(['add', 'skip']),
  amount: z.number().int(),
  createdAt: z.string(),
  source: z.enum(['app', 'api']),
})

const setting = z.object({ id: z.string(), value: z.json() })

export const backupSchema = z.object({
  app: z.literal('daily'),
  version: z.literal(1),
  exportedAt: z.string(),
  categories: z.array(category),
  habits: z.array(habit),
  habitEvents: z.array(habitEvent),
  settings: z.array(setting),
})

export type Backup = z.infer<typeof backupSchema>

type BackupTable = Exclude<keyof Backup, 'app' | 'version' | 'exportedAt'> & SyncedTable

const backupTables: BackupTable[] = ['categories', 'habits', 'habitEvents', 'settings']

function withoutSyncFields<T extends { updatedAt: string; deleted: boolean }>(record: T): Omit<T, 'updatedAt' | 'deleted'> {
  const { updatedAt: _updatedAt, deleted: _deleted, ...rest } = record
  return rest
}

/** Everything that is not deleted; events of deleted habits are left out. */
export async function exportBackup(db: DailyDb, now = new Date()): Promise<Backup> {
  const [categories, habits, habitEvents, settings] = await Promise.all([
    db.categories.toArray(),
    db.habits.toArray(),
    db.habitEvents.toArray(),
    db.settings.toArray(),
  ])
  const liveHabits = habits.filter((record) => !record.deleted)
  const habitIds = new Set(liveHabits.map((record) => record.id))
  return {
    app: 'daily',
    version: 1,
    exportedAt: now.toISOString(),
    categories: categories.filter((record) => !record.deleted).map(withoutSyncFields),
    habits: liveHabits.map(withoutSyncFields),
    habitEvents: habitEvents.filter((record) => !record.deleted && habitIds.has(record.habitId)).map(withoutSyncFields),
    settings: settings.filter((record) => !record.deleted).map(withoutSyncFields) as Backup['settings'],
  }
}

export class BackupError extends Error {}

export function parseBackup(text: string): Backup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new BackupError('Die Datei ist kein gültiges JSON.')
  }
  const result = backupSchema.safeParse(json)
  if (!result.success) throw new BackupError('Die Datei ist kein Daily-Backup oder beschädigt.')
  return result.data
}

/** Replaces all data with the backup. Fresh timestamps make the backup win on every device after the next sync. */
export async function importBackup(store: Store, backup: Backup): Promise<void> {
  const { db } = store
  await db.transaction('rw', [db.categories, db.habits, db.habitEvents, db.settings, db.outbox], async () => {
    for (const table of backupTables) {
      const incoming = backup[table] as Omit<RecordOf[typeof table], 'updatedAt' | 'deleted'>[]
      const keep = new Set(incoming.map((record) => record.id))
      const existing = await db.recordTable(table).toArray()
      const removed = existing.filter((record) => !record.deleted && !keep.has(record.id)).map((record) => ({ ...record, deleted: true }))
      const added = incoming.map((record) => ({ ...record, updatedAt: '', deleted: false }))
      await store.save(table, [...removed, ...added] as never)
    }
  })
}

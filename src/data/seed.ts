import type { DayKey } from '../domain/day.ts'
import type { CategoryRecord, HabitRecord, SettingRecord } from './db.ts'
import { deviceTimeZone } from './settings.ts'
import type { Store } from './store.ts'

// Seeds carry an old timestamp, so any real edit or deletion (on any device) wins over them.
const seedStamp = '2000-01-01T00:00:00.000Z'

function seedHabit(id: string, name: string, slug: string, sortOrder: number, today: DayKey): HabitRecord {
  return {
    id,
    name,
    slug,
    categoryId: 'seed-fokus',
    schedules: [{ from: today, frequency: { type: 'daily' }, target: 1, unit: null }],
    sortOrder,
    archived: false,
    system: null,
    updatedAt: seedStamp,
    deleted: false,
  }
}

/** Adds the preset habits once. Ids are fixed, so two devices create the same records. */
export async function ensureSeeds(store: Store, today: DayKey): Promise<void> {
  const categories: CategoryRecord[] = [{ id: 'seed-fokus', name: 'Fokus', sortOrder: 0, updatedAt: seedStamp, deleted: false }]
  const habits: HabitRecord[] = [
    seedHabit('seed-schlafzimmer', 'Handy nicht im Schlafzimmer', 'schlafzimmer', 0, today),
    seedHabit('seed-erste-stunde', 'Erste Stunde nach dem Aufstehen ohne Handy', 'erste-stunde', 1, today),
    seedHabit('seed-lesen', '20 Min. lesen', 'lesen', 2, today),
  ]
  const settings: SettingRecord[] = [{ id: 'timeZone', value: deviceTimeZone(), updatedAt: seedStamp, deleted: false }]

  const { db } = store
  const [knownCategories, knownHabits, knownSettings] = await Promise.all([
    db.categories.bulkGet(categories.map((record) => record.id)),
    db.habits.bulkGet(habits.map((record) => record.id)),
    db.settings.bulkGet(settings.map((record) => record.id)),
  ])
  await store.save('categories', categories.filter((_, index) => !knownCategories[index]), true)
  await store.save('habits', habits.filter((_, index) => !knownHabits[index]), true)
  await store.save('settings', settings.filter((_, index) => !knownSettings[index]), true)
}

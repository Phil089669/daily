import type { DayKey } from '../domain/day.ts'
import { lastActiveSchedule, scheduleOn, withSchedule, type DayItem, type Frequency } from '../domain/habits.ts'
import type { CategoryRecord, HabitEventRecord, HabitRecord } from './db.ts'
import type { Store } from './store.ts'

export type HabitInput = {
  name: string
  slug: string
  categoryId: string | null
  frequency: Frequency
  target: number
  unit: string | null
}

/** Reverses an action, for the undo bar. */
export type Undo = () => Promise<void>

export async function createHabit(store: Store, input: HabitInput, today: DayKey, sortOrder: number): Promise<HabitRecord> {
  const [habit] = await store.save('habits', [
    {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      slug: input.slug,
      categoryId: input.categoryId,
      schedules: [{ from: today, frequency: input.frequency, target: input.target, unit: input.unit }],
      sortOrder,
      archived: false,
      system: null,
      updatedAt: '',
      deleted: false,
    },
  ])
  return habit
}

/** Frequency and target changes apply from `today` on, so earlier days keep their rules. */
export async function updateHabit(store: Store, habit: HabitRecord, input: HabitInput, today: DayKey): Promise<void> {
  const schedules = habit.archived
    ? habit.schedules
    : withSchedule(habit.schedules, today, { frequency: input.frequency, target: input.target, unit: input.unit })
  await store.save('habits', [
    { ...habit, name: input.name.trim(), slug: input.slug, categoryId: input.categoryId, schedules },
  ])
}

/** Pauses the habit from today on: nothing is due and nothing counts as missed. */
export async function archiveHabit(store: Store, habit: HabitRecord, today: DayKey): Promise<void> {
  const current = scheduleOn(habit, today) ?? lastActiveSchedule(habit)
  const schedules = withSchedule(habit.schedules, today, { frequency: { type: 'paused' }, target: current.target, unit: current.unit })
  await store.save('habits', [{ ...habit, archived: true, schedules }])
}

export async function restoreHabit(store: Store, habit: HabitRecord, today: DayKey): Promise<void> {
  const { frequency, target, unit } = lastActiveSchedule(habit)
  const schedules = withSchedule(habit.schedules, today, { frequency, target, unit })
  await store.save('habits', [{ ...habit, archived: false, schedules }])
}

export async function deleteHabit(store: Store, habit: HabitRecord): Promise<void> {
  await store.save('habits', [{ ...habit, deleted: true }])
}

/** Saves a new order; `ordered` lists the records in their new order. */
export async function reorder<T extends HabitRecord | CategoryRecord>(
  store: Store,
  table: T extends HabitRecord ? 'habits' : 'categories',
  ordered: T[],
): Promise<void> {
  const changed = ordered.flatMap((record, index) => (record.sortOrder === index ? [] : [{ ...record, sortOrder: index }]))
  // The generic table parameter cannot narrow the record type for TypeScript.
  await store.save(table, changed as never)
}

function newEvent(habitId: string, day: DayKey, type: 'add' | 'skip', amount: number): HabitEventRecord {
  return {
    id: crypto.randomUUID(),
    habitId,
    day,
    type,
    amount,
    createdAt: new Date().toISOString(),
    source: 'app',
    updatedAt: '',
    deleted: false,
  }
}

async function setDeleted(store: Store, events: HabitEventRecord[], deleted: boolean): Promise<void> {
  await store.save(
    'habitEvents',
    events.map((event) => ({ ...event, deleted })),
  )
}

export async function changeCount(store: Store, habitId: string, day: DayKey, amount: number): Promise<Undo> {
  const [event] = await store.save('habitEvents', [newEvent(habitId, day, 'add', amount)])
  return () => setDeleted(store, [event], true)
}

export async function skipDay(store: Store, habitId: string, day: DayKey): Promise<Undo> {
  const [event] = await store.save('habitEvents', [newEvent(habitId, day, 'skip', 0)])
  return () => setDeleted(store, [event], true)
}

/** `skipEvents` are the day's active skip events of the habit. */
export async function unskipDay(store: Store, skipEvents: HabitEventRecord[]): Promise<Undo> {
  await setDeleted(store, skipEvents, true)
  return () => setDeleted(store, skipEvents, false)
}

/**
 * The one-tap action: ticks a habit or adds one to a counter. A ticked habit with target 1 is unticked,
 * a skipped day is resumed.
 */
export async function tap(store: Store, item: DayItem, day: DayKey, skipEvents: HabitEventRecord[]): Promise<Undo> {
  if (item.state.skipped) return unskipDay(store, skipEvents)
  if (item.schedule.target === 1 && item.state.count >= 1) return changeCount(store, item.habit.id, day, -item.state.count)
  return changeCount(store, item.habit.id, day, 1)
}

export async function createCategory(store: Store, name: string, sortOrder: number): Promise<CategoryRecord> {
  const [category] = await store.save('categories', [
    { id: crypto.randomUUID(), name: name.trim(), sortOrder, updatedAt: '', deleted: false },
  ])
  return category
}

export async function renameCategory(store: Store, category: CategoryRecord, name: string): Promise<void> {
  await store.save('categories', [{ ...category, name: name.trim() }])
}

/** Deletes the category; its habits keep going without one. */
export async function deleteCategory(store: Store, category: CategoryRecord, habits: HabitRecord[]): Promise<void> {
  await store.save(
    'habits',
    habits.filter((habit) => habit.categoryId === category.id).map((habit) => ({ ...habit, categoryId: null })),
  )
  await store.save('categories', [{ ...category, deleted: true }])
}

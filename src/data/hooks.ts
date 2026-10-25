import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { DayStates } from '../domain/habits.ts'
import type { CategoryRecord, HabitEventRecord, HabitRecord } from './db.ts'
import { db } from './instance.ts'
import { readSettings, type Settings } from './settings.ts'

export type HabitData = {
  /** Active habits in display order: by category, then by their own order. */
  habits: HabitRecord[]
  archived: HabitRecord[]
  /** Active and archived, for statistics. */
  allHabits: HabitRecord[]
  categories: CategoryRecord[]
  events: HabitEventRecord[]
  states: DayStates
  settings: Settings
}

const bySortOrder = (a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder

/** Everything the habit screens need, kept up to date with the local database. Undefined while loading. */
export function useHabitData(): HabitData | undefined {
  const habits = useLiveQuery(() => db.habits.toArray())
  const categories = useLiveQuery(() => db.categories.toArray())
  const events = useLiveQuery(() => db.habitEvents.toArray())
  const settings = useLiveQuery(() => db.settings.toArray())

  return useMemo(() => {
    if (!habits || !categories || !events || !settings) return undefined
    const liveCategories = categories.filter((category) => !category.deleted).sort(bySortOrder)
    const rank = new Map(liveCategories.map((category, index) => [category.id, index]))
    const categoryRank = (habit: HabitRecord) => rank.get(habit.categoryId ?? '') ?? liveCategories.length
    const live = habits
      .filter((habit) => !habit.deleted)
      .sort((a, b) => categoryRank(a) - categoryRank(b) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'de'))
    return {
      habits: live.filter((habit) => !habit.archived),
      archived: live.filter((habit) => habit.archived),
      allHabits: live,
      categories: liveCategories,
      events,
      states: new DayStates(events),
      settings: readSettings(settings),
    }
  }, [habits, categories, events, settings])
}

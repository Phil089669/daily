// Builders for domain tests.
import type { Frequency, Habit, HabitEvent, Schedule } from './habits.ts'

let sequence = 0

export function makeHabit(frequency: Frequency, from = '2026-10-01', target = 1): Habit {
  const id = `h${++sequence}`
  return {
    id,
    name: id,
    slug: id,
    categoryId: null,
    schedules: [{ from, frequency, target, unit: null }],
    sortOrder: 0,
    archived: false,
    system: null,
  }
}

export function withSchedules(habit: Habit, schedules: Schedule[]): Habit {
  return { ...habit, schedules }
}

export function adds(habitId: string, days: string[], amount = 1): HabitEvent[] {
  return days.map((day) => ({
    id: `e${++sequence}`,
    habitId,
    day,
    type: 'add',
    amount,
    createdAt: `${day}T12:00:00.000Z`,
    deleted: false,
  }))
}

export function skips(habitId: string, days: string[]): HabitEvent[] {
  return days.map((day) => ({
    id: `e${++sequence}`,
    habitId,
    day,
    type: 'skip',
    amount: 0,
    createdAt: `${day}T12:00:00.000Z`,
    deleted: false,
  }))
}

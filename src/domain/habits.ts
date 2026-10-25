// Habit rules, shared with the Edge Functions (Deno): no DOM, imports with .ts extensions.
import { addDays, startOfWeek, weekdayIndex, type DayKey } from './day.ts'

export type Frequency =
  | { type: 'daily' }
  /** 0 = Monday … 6 = Sunday */
  | { type: 'weekdays'; days: number[] }
  | { type: 'perWeek'; times: number }
  /** Archived: nothing is due, nothing counts as missed. */
  | { type: 'paused' }

/** How a habit is planned from `from` on. A habit's schedules are sorted by `from`; the first one is its start. */
export type Schedule = {
  from: DayKey
  frequency: Frequency
  /** Daily target, at least 1 (e.g. 8 for "8 Gläser"). */
  target: number
  unit: string | null
}

export type Habit = {
  id: string
  name: string
  /** Short fixed name for the Shortcuts API, e.g. "lesen". */
  slug: string
  categoryId: string | null
  schedules: Schedule[]
  sortOrder: number
  archived: boolean
  /** Set for habits the app checks itself, e.g. the training session. */
  system: string | null
}

/** One tap: a count change or skipping the day. Undoing marks the event deleted. */
export type HabitEvent = {
  id: string
  habitId: string
  day: DayKey
  type: 'add' | 'skip'
  /** Change of the day's count for 'add' (+1, −1, …); 0 for 'skip'. */
  amount: number
  createdAt: string
  deleted: boolean
}

export type DayState = { count: number; skipped: boolean }

const emptyState: DayState = { count: 0, skipped: false }

/** The state of every habit on every day, folded from the events. */
export class DayStates {
  private readonly byHabit = new Map<string, Map<DayKey, DayState>>()

  constructor(events: Iterable<HabitEvent>) {
    for (const event of events) {
      if (event.deleted) continue
      let days = this.byHabit.get(event.habitId)
      if (!days) {
        days = new Map()
        this.byHabit.set(event.habitId, days)
      }
      const state = days.get(event.day) ?? { count: 0, skipped: false }
      if (event.type === 'skip') state.skipped = true
      else state.count += event.amount
      days.set(event.day, state)
    }
    // Clamp after summing so the result does not depend on the order events arrive in.
    for (const days of this.byHabit.values()) {
      for (const state of days.values()) state.count = Math.max(0, state.count)
    }
  }

  get(habitId: string, day: DayKey): DayState {
    return this.byHabit.get(habitId)?.get(day) ?? emptyState
  }
}

/** The schedule in force on `day`, or null before the habit started. */
export function scheduleOn(habit: Habit, day: DayKey): Schedule | null {
  let current: Schedule | null = null
  for (const schedule of habit.schedules) {
    if (schedule.from > day) break
    current = schedule
  }
  return current
}

export function startDay(habit: Habit): DayKey {
  return habit.schedules[0].from
}

/** Whether a day-based frequency (daily or weekdays) asks for the habit on `day`. */
export function isDueOn(frequency: Frequency, day: DayKey): boolean {
  if (frequency.type === 'daily') return true
  if (frequency.type === 'weekdays') return frequency.days.includes(weekdayIndex(day))
  return false
}

export type WeekProgress = { done: number; required: number }

/**
 * Progress of a "times per week" habit in the week that contains `day`.
 * Skipped and paused days, and days before the start, lower the requirement.
 */
export function weekProgress(habit: Habit, states: DayStates, day: DayKey): WeekProgress {
  const schedule = scheduleOn(habit, day)
  if (!schedule || schedule.frequency.type !== 'perWeek') return { done: 0, required: 0 }
  const monday = startOfWeek(day)
  let done = 0
  let unavailable = 0
  for (let i = 0; i < 7; i++) {
    const current = addDays(monday, i)
    const scheduleThatDay = scheduleOn(habit, current)
    const state = states.get(habit.id, current)
    if (!scheduleThatDay || scheduleThatDay.frequency.type === 'paused' || state.skipped) unavailable++
    else if (state.count >= scheduleThatDay.target) done++
  }
  return { done, required: Math.min(schedule.frequency.times, 7 - unavailable) }
}

export type DayItem = {
  habit: Habit
  schedule: Schedule
  state: DayState
  /** Only for "times per week" habits. */
  week: WeekProgress | null
  /** The day's target is reached, or the weekly quota is met. */
  done: boolean
}

/** The habits to show on `day`, in the order given. */
export function itemsForDay(habits: Habit[], states: DayStates, day: DayKey): DayItem[] {
  const items: DayItem[] = []
  for (const habit of habits) {
    const schedule = scheduleOn(habit, day)
    if (!schedule || schedule.frequency.type === 'paused') continue
    const state = states.get(habit.id, day)
    const dayDone = state.count >= schedule.target
    if (schedule.frequency.type === 'perWeek') {
      const week = weekProgress(habit, states, day)
      items.push({ habit, schedule, state, week, done: dayDone || week.done >= week.required })
    } else if (isDueOn(schedule.frequency, day)) {
      items.push({ habit, schedule, state, week: null, done: dayDone })
    }
  }
  return items
}

export function isOpen(item: DayItem): boolean {
  return !item.done && !item.state.skipped
}

type ScheduleFields = Omit<Schedule, 'from'>

function sameSchedule(a: ScheduleFields, b: ScheduleFields): boolean {
  return a.target === b.target && a.unit === b.unit && JSON.stringify(a.frequency) === JSON.stringify(b.frequency)
}

/** Plans the habit as `next` from `day` on. A change made earlier the same day is replaced. */
export function withSchedule(schedules: Schedule[], day: DayKey, next: ScheduleFields): Schedule[] {
  const earlier = schedules.filter((schedule) => schedule.from < day)
  const previous = earlier.at(-1)
  if (previous && sameSchedule(previous, next)) return earlier
  return [...earlier, { from: day, ...next }]
}

/** The last schedule that was not paused, e.g. to restore an archived habit. */
export function lastActiveSchedule(habit: Habit): Schedule {
  return habit.schedules.findLast((schedule) => schedule.frequency.type !== 'paused') ?? habit.schedules[0]
}

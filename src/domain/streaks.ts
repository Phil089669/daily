import { addDays, startOfWeek, type DayKey } from './day.ts'
import { isDueOn, scheduleOn, weekProgress, type DayStates, type Frequency, type Habit } from './habits.ts'

export type Streak = { current: number; longest: number; unit: 'days' | 'weeks' }

type Kind = Streak['unit']

function kindOf(frequency: Frequency): Kind | null {
  if (frequency.type === 'paused') return null
  return frequency.type === 'perWeek' ? 'weeks' : 'days'
}

/** Start and unit of the latest stretch planned the same way (day-based or weekly); pauses do not interrupt it. */
function currentStretch(habit: Habit, today: DayKey): { unit: Kind; from: DayKey } | null {
  let unit: Kind | null = null
  let from: DayKey | null = null
  const schedules = habit.schedules.filter((schedule) => schedule.from <= today)
  for (let i = schedules.length - 1; i >= 0; i--) {
    const kind = kindOf(schedules[i].frequency)
    if (kind === null) continue
    if (unit === null) unit = kind
    else if (kind !== unit) break
    from = schedules[i].from
  }
  return unit && from ? { unit, from } : null
}

/**
 * Fulfilled days in a row (daily and weekday habits) or weeks in a row (times per week).
 * Days that are not due, skipped or paused are neutral, and an unfinished today or current week never breaks it.
 * Switching between day-based and weekly planning starts a new count.
 */
export function streak(habit: Habit, states: DayStates, today: DayKey): Streak {
  const stretch = currentStretch(habit, today)
  if (!stretch) return { current: 0, longest: 0, unit: 'days' }
  let run = 0
  let longest = 0

  if (stretch.unit === 'days') {
    for (let day = stretch.from; day <= today; day = addDays(day, 1)) {
      const schedule = scheduleOn(habit, day)
      if (!schedule || !isDueOn(schedule.frequency, day)) continue
      const state = states.get(habit.id, day)
      if (state.skipped) continue
      if (state.count >= schedule.target) longest = Math.max(longest, ++run)
      else if (day !== today) run = 0
    }
  } else {
    const thisWeek = startOfWeek(today)
    for (let monday = startOfWeek(stretch.from); monday <= thisWeek; monday = addDays(monday, 7)) {
      const isCurrent = monday === thisWeek
      const { done, required } = weekProgress(habit, states, isCurrent ? today : addDays(monday, 6))
      if (required === 0) continue
      if (done >= required) longest = Math.max(longest, ++run)
      else if (!isCurrent) run = 0
    }
  }
  return { current: run, longest, unit: stretch.unit }
}

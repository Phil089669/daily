import { addDays, dayRange, startOfWeek, type DayKey } from './day.ts'
import { isDueOn, scheduleOn, startDay, weekProgress, type DayStates, type Habit } from './habits.ts'

/** Fulfilment as done out of due; the quota is done / due. */
export type Rate = { done: number; due: number }

export function addRates(rates: Rate[]): Rate {
  return rates.reduce((sum, rate) => ({ done: sum.done + rate.done, due: sum.due + rate.due }), { done: 0, due: 0 })
}

/**
 * Fulfilment of a habit from `from` to `to` (both included), counted up to `today`.
 * Day-based habits count each due day, weekly habits their required days per week;
 * a week belongs to the range that contains its Thursday. Skipped and paused days do not count,
 * and an unfinished today or current week only counts once it is fulfilled.
 */
export function habitRate(habit: Habit, states: DayStates, from: DayKey, to: DayKey, today: DayKey): Rate {
  let done = 0
  let due = 0
  const first = startDay(habit)
  const end = to < today ? to : today

  for (let day = from < first ? first : from; day <= end; day = addDays(day, 1)) {
    const schedule = scheduleOn(habit, day)
    if (!schedule || !isDueOn(schedule.frequency, day)) continue
    const state = states.get(habit.id, day)
    if (state.skipped) continue
    const fulfilled = state.count >= schedule.target
    if (day === today && !fulfilled) continue
    due++
    if (fulfilled) done++
  }

  const thisWeek = startOfWeek(today)
  for (let monday = startOfWeek(from); monday <= end; monday = addDays(monday, 7)) {
    const thursday = addDays(monday, 3)
    if (thursday < from || thursday > to || addDays(monday, 6) < first) continue
    const isCurrent = monday === thisWeek
    const probe = isCurrent ? today : addDays(monday, 6)
    if (scheduleOn(habit, probe)?.frequency.type !== 'perWeek') continue
    const week = weekProgress(habit, states, probe)
    if (week.required === 0 || (isCurrent && week.done < week.required)) continue
    due += week.required
    done += Math.min(week.done, week.required)
  }
  return { done, due }
}

/** level: null = nothing planned, 0 = missed, 1–3 = partly done, 4 = done */
export type HeatCell = { day: DayKey; level: number | null; skipped: boolean }

function partialLevel(count: number, target: number): number {
  return Math.min(3, Math.max(1, Math.floor((count / target) * 4)))
}

export function habitHeatmap(habit: Habit, states: DayStates, from: DayKey, to: DayKey): HeatCell[] {
  return dayRange(from, to).map((day) => {
    const schedule = scheduleOn(habit, day)
    const state = states.get(habit.id, day)
    if (!schedule) return { day, level: null, skipped: false }
    if (state.skipped) return { day, level: null, skipped: true }
    if (state.count >= schedule.target) return { day, level: 4, skipped: false }
    if (state.count > 0) return { day, level: partialLevel(state.count, schedule.target), skipped: false }
    return { day, level: isDueOn(schedule.frequency, day) ? 0 : null, skipped: false }
  })
}

/** How complete each day was across all habits; weekly habits only add when done. */
export function overallHeatmap(habits: Habit[], states: DayStates, from: DayKey, to: DayKey): HeatCell[] {
  return dayRange(from, to).map((day) => {
    let due = 0
    let done = 0
    for (const habit of habits) {
      const schedule = scheduleOn(habit, day)
      if (!schedule || schedule.frequency.type === 'paused') continue
      const state = states.get(habit.id, day)
      const fulfilled = state.count >= schedule.target
      if (isDueOn(schedule.frequency, day) && !state.skipped) due++
      if (fulfilled) done++
    }
    if (due === 0) return { day, level: done > 0 ? 4 : null, skipped: false }
    if (done === 0) return { day, level: 0, skipped: false }
    return { day, level: Math.max(1, Math.round(Math.min(1, done / due) * 4)), skipped: false }
  })
}

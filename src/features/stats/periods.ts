import { addDays, endOfMonth, startOfMonth, startOfWeek, type DayKey } from '../../domain/day.ts'
import type { Rate } from '../../domain/stats.ts'

export type Period = { label: string; from: DayKey; to: DayKey }

export function periods(today: DayKey): Period[] {
  const monday = startOfWeek(today)
  const firstOfMonth = startOfMonth(today)
  const endOfLastMonth = addDays(firstOfMonth, -1)
  return [
    { label: 'Diese Woche', from: monday, to: addDays(monday, 6) },
    { label: 'Letzte Woche', from: addDays(monday, -7), to: addDays(monday, -1) },
    { label: 'Dieser Monat', from: firstOfMonth, to: endOfMonth(today) },
    { label: 'Letzter Monat', from: startOfMonth(endOfLastMonth), to: endOfLastMonth },
  ]
}

export function percent(rate: Rate): string {
  return rate.due === 0 ? '–' : `${Math.round((rate.done / rate.due) * 100)} %`
}

/** 53 weeks up to today, starting on a Monday. */
export function heatmapStart(today: DayKey): DayKey {
  return startOfWeek(addDays(today, -52 * 7))
}

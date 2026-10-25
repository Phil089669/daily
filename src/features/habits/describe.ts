import type { DayItem, Frequency, Schedule } from '../../domain/habits.ts'
import type { Streak } from '../../domain/streaks.ts'

const weekdayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function describeFrequency(frequency: Frequency): string {
  switch (frequency.type) {
    case 'daily':
      return 'Täglich'
    case 'weekdays':
      return frequency.days.length === 7
        ? 'Täglich'
        : [...frequency.days].sort((a, b) => a - b).map((day) => weekdayNames[day]).join(', ')
    case 'perWeek':
      return `${frequency.times}× pro Woche`
    case 'paused':
      return 'Archiviert'
  }
}

/** E.g. "Mo, Mi, Fr" or "Täglich, Ziel 8 Gläser". */
export function describeSchedule(schedule: Schedule): string {
  const text = describeFrequency(schedule.frequency)
  if (schedule.frequency.type === 'paused' || schedule.target === 1) return text
  return `${text}, Ziel ${schedule.target}${schedule.unit ? ` ${schedule.unit}` : ''}`
}

/** Short progress line for a row on Heute, e.g. "5 von 8 Gläser" or "2 von 3 diese Woche". */
export function describeProgress(item: DayItem): string | null {
  if (item.state.skipped) return 'Ausgesetzt'
  if (item.week) return `${item.week.done} von ${item.week.required} diese Woche`
  const { target, unit } = item.schedule
  if (target > 1) return `${item.state.count} von ${target}${unit ? ` ${unit}` : ''}`
  return null
}

/** For the row on Heute; nothing below two in a row. */
export function describeStreak(streak: Streak, frequency: Frequency): string | null {
  if (streak.current < 2) return null
  return `${streak.current} ${streakUnit(streak.current, streak.unit, frequency)} in Folge`
}

/** "Tage", "Wochen" or "mal" for a streak count. */
export function streakUnit(count: number, unit: Streak['unit'], frequency: Frequency): string {
  if (unit === 'weeks') return count === 1 ? 'Woche' : 'Wochen'
  if (frequency.type === 'daily') return count === 1 ? 'Tag' : 'Tage'
  return 'mal'
}

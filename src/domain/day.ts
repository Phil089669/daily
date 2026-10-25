// Pure date logic, shared with the Edge Functions (Deno): no DOM, imports with .ts extensions.

/** A calendar day as 'YYYY-MM-DD'. */
export type DayKey = string

/** By default a day runs from 04:00 to 03:59 the next morning. */
export const DEFAULT_DAY_START_MINUTES = 4 * 60

// Calendar arithmetic runs on UTC dates, so results do not depend on the zone the code runs in.
function toUtc(key: DayKey): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function fromUtc(date: Date): DayKey {
  return date.toISOString().slice(0, 10)
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = toUtc(key)
  date.setUTCDate(date.getUTCDate() + days)
  return fromUtc(date)
}

/** Whole days from `from` to `to`, negative if `to` is earlier. */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000)
}

/** Days from `from` to `to`, both included. */
export function dayRange(from: DayKey, to: DayKey): DayKey[] {
  const days: DayKey[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(key: DayKey): number {
  return (toUtc(key).getUTCDay() + 6) % 7
}

/** Monday of the week that contains `key`. */
export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -weekdayIndex(key))
}

export function startOfMonth(key: DayKey): DayKey {
  return `${key.slice(0, 8)}01`
}

export function endOfMonth(key: DayKey): DayKey {
  const date = toUtc(startOfMonth(key))
  date.setUTCMonth(date.getUTCMonth() + 1, 0)
  return fromUtc(date)
}

type WallClock = { year: number; month: number; day: number; minutes: number }

function wallClock(now: Date, timeZone?: string): WallClock {
  if (!timeZone) {
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      minutes: now.getHours() * 60 + now.getMinutes(),
    }
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day'), minutes: part('hour') * 60 + part('minute') }
}

/**
 * The day an instant belongs to when days start `dayStartMinutes` after midnight.
 * Uses wall-clock time in `timeZone` (default: the zone the code runs in), so DST changes cannot shift it.
 */
export function logicalDay(now: Date, dayStartMinutes = DEFAULT_DAY_START_MINUTES, timeZone?: string): DayKey {
  const { year, month, day, minutes } = wallClock(now, timeZone)
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return minutes < dayStartMinutes ? addDays(key, -1) : key
}

/** German date text for a day, e.g. `formatDay(key, { weekday: 'long' })` → "Sonntag". */
export function formatDay(key: DayKey, options: Intl.DateTimeFormatOptions): string {
  return toUtc(key).toLocaleDateString('de-DE', { ...options, timeZone: 'UTC' })
}

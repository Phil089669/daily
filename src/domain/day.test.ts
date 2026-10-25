import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayRange,
  daysBetween,
  endOfMonth,
  formatDay,
  logicalDay,
  startOfMonth,
  startOfWeek,
  weekdayIndex,
} from './day.ts'

// Runs with TZ=Europe/Berlin (see vitest.config.ts).
it('runs in the Europe/Berlin time zone', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Berlin')
})

describe('logicalDay in the device zone', () => {
  it('counts the hours before the day start to the previous day', () => {
    expect(logicalDay(new Date('2026-10-20T03:59:00+02:00'))).toBe('2026-10-19')
    expect(logicalDay(new Date('2026-10-20T04:00:00+02:00'))).toBe('2026-10-20')
  })

  it('handles the repeated hour when DST ends', () => {
    // 25 Oct 2026: clocks go back from 03:00 CEST to 02:00 CET, so 02:30 happens twice.
    expect(logicalDay(new Date('2026-10-25T02:30:00+02:00'))).toBe('2026-10-24')
    expect(logicalDay(new Date('2026-10-25T02:30:00+01:00'))).toBe('2026-10-24')
    expect(logicalDay(new Date('2026-10-25T04:00:00+01:00'))).toBe('2026-10-25')
  })

  it('handles the skipped hour when DST starts', () => {
    // 29 Mar 2026: clocks jump from 02:00 CET to 03:00 CEST.
    expect(logicalDay(new Date('2026-03-29T03:59:00+02:00'))).toBe('2026-03-28')
    expect(logicalDay(new Date('2026-03-29T04:00:00+02:00'))).toBe('2026-03-29')
  })

  it('supports other day starts', () => {
    expect(logicalDay(new Date('2026-10-20T00:30:00+02:00'), 0)).toBe('2026-10-20')
    expect(logicalDay(new Date('2026-10-20T05:15:00+02:00'), 5 * 60 + 30)).toBe('2026-10-19')
  })
})

describe('logicalDay in a given zone', () => {
  it('uses the wall clock of that zone, wherever the code runs', () => {
    // 00:30 UTC is 02:30 CEST, 03:00 UTC is 04:00 CET (after the switch back).
    expect(logicalDay(new Date('2026-10-25T00:30:00Z'), 240, 'Europe/Berlin')).toBe('2026-10-24')
    expect(logicalDay(new Date('2026-10-25T03:00:00Z'), 240, 'Europe/Berlin')).toBe('2026-10-25')
    // New York is still on EDT (UTC−4) that day.
    expect(logicalDay(new Date('2026-10-25T07:59:00Z'), 240, 'America/New_York')).toBe('2026-10-24')
    expect(logicalDay(new Date('2026-10-25T08:00:00Z'), 240, 'America/New_York')).toBe('2026-10-25')
  })

  it('handles midnight in the zone', () => {
    expect(logicalDay(new Date('2026-10-25T23:00:00Z'), 0, 'Europe/Berlin')).toBe('2026-10-26')
  })
})

describe('calendar helpers', () => {
  it('adds days across DST changes, leap days and years', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('counts days between two days', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-25', '2026-10-19')).toBe(-6)
    expect(dayRange('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  })

  it('starts weeks on Monday', () => {
    expect(weekdayIndex('2026-10-19')).toBe(0)
    expect(weekdayIndex('2026-10-25')).toBe(6)
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19')
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19')
  })

  it('finds month boundaries', () => {
    expect(startOfMonth('2026-10-25')).toBe('2026-10-01')
    expect(endOfMonth('2026-10-25')).toBe('2026-10-31')
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28')
    expect(endOfMonth('2028-02-01')).toBe('2028-02-29')
  })

  it('formats days in German', () => {
    expect(formatDay('2026-10-25', { weekday: 'long' })).toBe('Sonntag')
    expect(formatDay('2026-10-25', { day: 'numeric', month: 'long' })).toBe('25. Oktober')
  })
})

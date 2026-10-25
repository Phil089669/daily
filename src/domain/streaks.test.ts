import { describe, expect, it } from 'vitest'
import { DayStates } from './habits.ts'
import { streak } from './streaks.ts'
import { adds, makeHabit, skips, withSchedules } from './test-helpers.ts'

// Today is Sunday, 25 Oct 2026.
const today = '2026-10-25'

describe('streak of daily habits', () => {
  it('counts done days up to yesterday while today is still open', () => {
    const habit = makeHabit({ type: 'daily' })
    const states = new DayStates(adds(habit.id, ['2026-10-22', '2026-10-23', '2026-10-24']))
    expect(streak(habit, states, today)).toEqual({ current: 3, longest: 3, unit: 'days' })
  })

  it('includes today once it is done', () => {
    const habit = makeHabit({ type: 'daily' })
    const states = new DayStates(adds(habit.id, ['2026-10-23', '2026-10-24', '2026-10-25']))
    expect(streak(habit, states, today).current).toBe(3)
  })

  it('breaks on a missed day and keeps the longest run', () => {
    const habit = makeHabit({ type: 'daily' })
    const states = new DayStates(adds(habit.id, ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-24']))
    expect(streak(habit, states, today)).toEqual({ current: 1, longest: 4, unit: 'days' })
  })

  it('treats skipped days as neutral', () => {
    const habit = makeHabit({ type: 'daily' })
    const states = new DayStates([
      ...adds(habit.id, ['2026-10-21', '2026-10-23', '2026-10-24']),
      ...skips(habit.id, ['2026-10-22']),
    ])
    expect(streak(habit, states, today).current).toBe(3)
  })

  it('needs the full target on counter habits', () => {
    const habit = makeHabit({ type: 'daily' }, '2026-10-01', 8)
    const states = new DayStates([
      ...adds(habit.id, ['2026-10-23'], 8),
      ...adds(habit.id, ['2026-10-24'], 7),
    ])
    expect(streak(habit, states, today).current).toBe(0)
  })
})

describe('streak of weekday habits', () => {
  it('only looks at due days', () => {
    // Monday, Wednesday, Friday from Thursday, 1 Oct.
    const habit = makeHabit({ type: 'weekdays', days: [0, 2, 4] })
    const states = new DayStates(
      adds(habit.id, ['2026-10-02', '2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-23']),
    )
    // Friday, 9 Oct was missed.
    expect(streak(habit, states, today)).toEqual({ current: 6, longest: 6, unit: 'days' })
  })
})

describe('streak of weekly habits', () => {
  it('counts fulfilled weeks while the current week is still open', () => {
    const habit = makeHabit({ type: 'perWeek', times: 3 }, '2026-10-05')
    const states = new DayStates(
      adds(habit.id, ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-17', '2026-10-20']),
    )
    expect(streak(habit, states, today)).toEqual({ current: 2, longest: 2, unit: 'weeks' })
  })

  it('breaks on a week below the quota', () => {
    const habit = makeHabit({ type: 'perWeek', times: 3 }, '2026-10-05')
    const states = new DayStates(adds(habit.id, ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-13']))
    expect(streak(habit, states, today)).toEqual({ current: 0, longest: 1, unit: 'weeks' })
  })
})

describe('streak across schedule changes', () => {
  it('continues over an archived stretch', () => {
    const habit = withSchedules(makeHabit({ type: 'daily' }), [
      { from: '2026-10-01', frequency: { type: 'daily' }, target: 1, unit: null },
      { from: '2026-10-18', frequency: { type: 'paused' }, target: 1, unit: null },
      { from: '2026-10-22', frequency: { type: 'daily' }, target: 1, unit: null },
    ])
    const states = new DayStates(adds(habit.id, ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-22', '2026-10-23', '2026-10-24']))
    expect(streak(habit, states, today).current).toBe(6)
  })

  it('starts afresh when switching from weekly to daily', () => {
    const habit = withSchedules(makeHabit({ type: 'daily' }), [
      { from: '2026-10-01', frequency: { type: 'perWeek', times: 1 }, target: 1, unit: null },
      { from: '2026-10-20', frequency: { type: 'daily' }, target: 1, unit: null },
    ])
    const states = new DayStates(adds(habit.id, ['2026-10-02', '2026-10-06', '2026-10-13', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']))
    expect(streak(habit, states, today)).toEqual({ current: 5, longest: 5, unit: 'days' })
  })
})

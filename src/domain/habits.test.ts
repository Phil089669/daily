import { describe, expect, it } from 'vitest'
import {
  DayStates,
  isOpen,
  itemsForDay,
  lastActiveSchedule,
  scheduleOn,
  weekProgress,
  withSchedule,
  type Schedule,
} from './habits.ts'
import { adds, makeHabit, skips, withSchedules } from './test-helpers.ts'

describe('DayStates', () => {
  it('sums the taps of a day and ignores undone ones', () => {
    const habit = makeHabit({ type: 'daily' }, '2026-10-01', 8)
    const events = [...adds(habit.id, ['2026-10-25', '2026-10-25', '2026-10-25'])]
    events[1].deleted = true
    const states = new DayStates(events)
    expect(states.get(habit.id, '2026-10-25')).toEqual({ count: 2, skipped: false })
    expect(states.get(habit.id, '2026-10-24')).toEqual({ count: 0, skipped: false })
  })

  it('gives the same count whatever order increments and decrements arrive in', () => {
    const habit = makeHabit({ type: 'daily' })
    const plus = adds(habit.id, ['2026-10-25', '2026-10-25'])
    const minus = adds(habit.id, ['2026-10-25', '2026-10-25', '2026-10-25'], -1)
    expect(new DayStates([...plus, ...minus]).get(habit.id, '2026-10-25').count).toBe(0)
    expect(new DayStates([...minus, ...plus]).get(habit.id, '2026-10-25').count).toBe(0)
  })

  it('marks skipped days', () => {
    const habit = makeHabit({ type: 'daily' })
    const states = new DayStates(skips(habit.id, ['2026-10-25']))
    expect(states.get(habit.id, '2026-10-25').skipped).toBe(true)
  })
})

describe('schedules', () => {
  const daily: Schedule = { from: '2026-10-01', frequency: { type: 'daily' }, target: 1, unit: null }
  const weekly: Schedule = { from: '2026-10-20', frequency: { type: 'perWeek', times: 3 }, target: 1, unit: null }

  it('picks the schedule in force on a day', () => {
    const habit = withSchedules(makeHabit({ type: 'daily' }), [daily, weekly])
    expect(scheduleOn(habit, '2026-09-30')).toBeNull()
    expect(scheduleOn(habit, '2026-10-19')).toBe(daily)
    expect(scheduleOn(habit, '2026-10-20')).toBe(weekly)
  })

  it('adds a change from today on, replaces one from the same day and drops a reverted one', () => {
    const changed = withSchedule([daily], '2026-10-25', { frequency: { type: 'perWeek', times: 2 }, target: 1, unit: null })
    expect(changed).toEqual([daily, { from: '2026-10-25', frequency: { type: 'perWeek', times: 2 }, target: 1, unit: null }])

    const changedAgain = withSchedule(changed, '2026-10-25', { frequency: { type: 'daily' }, target: 3, unit: 'Gläser' })
    expect(changedAgain).toEqual([daily, { from: '2026-10-25', frequency: { type: 'daily' }, target: 3, unit: 'Gläser' }])

    const reverted = withSchedule(changedAgain, '2026-10-25', { frequency: { type: 'daily' }, target: 1, unit: null })
    expect(reverted).toEqual([daily])
  })

  it('replaces the first schedule when a new habit is edited on its first day', () => {
    const fresh: Schedule = { from: '2026-10-25', frequency: { type: 'daily' }, target: 1, unit: null }
    expect(withSchedule([fresh], '2026-10-25', { frequency: { type: 'daily' }, target: 2, unit: null })).toEqual([
      { from: '2026-10-25', frequency: { type: 'daily' }, target: 2, unit: null },
    ])
  })

  it('remembers the last active schedule of an archived habit', () => {
    const paused: Schedule = { from: '2026-10-22', frequency: { type: 'paused' }, target: 1, unit: null }
    const habit = withSchedules(makeHabit({ type: 'daily' }), [daily, weekly, paused])
    expect(lastActiveSchedule(habit)).toBe(weekly)
  })
})

describe('weekProgress', () => {
  it('counts done days in the week of the day', () => {
    const habit = makeHabit({ type: 'perWeek', times: 3 })
    const states = new DayStates(adds(habit.id, ['2026-10-18', '2026-10-19', '2026-10-21']))
    expect(weekProgress(habit, states, '2026-10-25')).toEqual({ done: 2, required: 3 })
  })

  it('lowers the requirement for skipped days and days before the start', () => {
    const late = makeHabit({ type: 'perWeek', times: 3 }, '2026-10-24')
    expect(weekProgress(late, new DayStates([]), '2026-10-25')).toEqual({ done: 0, required: 2 })

    const habit = makeHabit({ type: 'perWeek', times: 3 })
    const states = new DayStates(skips(habit.id, ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']))
    expect(weekProgress(habit, states, '2026-10-25')).toEqual({ done: 0, required: 2 })
  })
})

describe('itemsForDay', () => {
  it('shows daily habits, weekday habits on their days and weekly habits every day', () => {
    const daily = makeHabit({ type: 'daily' })
    const mondays = makeHabit({ type: 'weekdays', days: [0] })
    const sundays = makeHabit({ type: 'weekdays', days: [6] })
    const weekly = makeHabit({ type: 'perWeek', times: 2 })
    const states = new DayStates([])
    const items = itemsForDay([daily, mondays, sundays, weekly], states, '2026-10-25')
    expect(items.map((item) => item.habit.id)).toEqual([daily.id, sundays.id, weekly.id])
    expect(items[2].week).toEqual({ done: 0, required: 2 })
  })

  it('leaves out habits before their start and while paused', () => {
    const future = makeHabit({ type: 'daily' }, '2026-10-26')
    const archived = withSchedules(makeHabit({ type: 'daily' }), [
      { from: '2026-10-01', frequency: { type: 'daily' }, target: 1, unit: null },
      { from: '2026-10-20', frequency: { type: 'paused' }, target: 1, unit: null },
    ])
    expect(itemsForDay([future, archived], new DayStates([]), '2026-10-25')).toEqual([])
    expect(itemsForDay([archived], new DayStates([]), '2026-10-19')).toHaveLength(1)
  })

  it('marks items done by target, by weekly quota, and open otherwise', () => {
    const water = makeHabit({ type: 'daily' }, '2026-10-01', 8)
    const weekly = makeHabit({ type: 'perWeek', times: 2 })
    const states = new DayStates([
      ...adds(water.id, ['2026-10-25'], 5),
      ...adds(weekly.id, ['2026-10-19', '2026-10-22']),
    ])
    const [waterItem, weeklyItem] = itemsForDay([water, weekly], states, '2026-10-25')
    expect(waterItem.state.count).toBe(5)
    expect(waterItem.done).toBe(false)
    expect(isOpen(waterItem)).toBe(true)
    expect(weeklyItem.done).toBe(true)
  })

  it('does not count skipped items as open', () => {
    const habit = makeHabit({ type: 'daily' })
    const [item] = itemsForDay([habit], new DayStates(skips(habit.id, ['2026-10-25'])), '2026-10-25')
    expect(isOpen(item)).toBe(false)
  })
})

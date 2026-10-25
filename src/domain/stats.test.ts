import { describe, expect, it } from 'vitest'
import { DayStates } from './habits.ts'
import { addRates, habitHeatmap, habitRate, overallHeatmap } from './stats.ts'
import { adds, makeHabit, skips } from './test-helpers.ts'

// Today is Sunday, 25 Oct 2026; this week runs from Monday, 19 Oct.
const today = '2026-10-25'

describe('habitRate', () => {
  it('counts due days and leaves an unfinished today out', () => {
    const habit = makeHabit({ type: 'daily' })
    const states = new DayStates(adds(habit.id, ['2026-10-19', '2026-10-20', '2026-10-22', '2026-10-23', '2026-10-24']))
    expect(habitRate(habit, states, '2026-10-19', '2026-10-25', today)).toEqual({ done: 5, due: 6 })
  })

  it('counts today once it is done', () => {
    const habit = makeHabit({ type: 'daily' })
    const states = new DayStates(adds(habit.id, ['2026-10-24', '2026-10-25']))
    expect(habitRate(habit, states, '2026-10-24', '2026-10-25', today)).toEqual({ done: 2, due: 2 })
  })

  it('leaves skipped days and days before the start out', () => {
    const habit = makeHabit({ type: 'daily' }, '2026-10-21')
    const states = new DayStates([...adds(habit.id, ['2026-10-21', '2026-10-23']), ...skips(habit.id, ['2026-10-22'])])
    expect(habitRate(habit, states, '2026-10-19', '2026-10-24', today)).toEqual({ done: 2, due: 3 })
  })

  it('counts the required days of weekly habits per week', () => {
    const habit = makeHabit({ type: 'perWeek', times: 3 }, '2026-10-05')
    const states = new DayStates(
      adds(habit.id, ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-12', '2026-10-14', '2026-10-19', '2026-10-20', '2026-10-21']),
    )
    // Weeks from 5, 12 and 19 Oct have their Thursday in October; the current week is fulfilled.
    expect(habitRate(habit, states, '2026-10-01', '2026-10-31', today)).toEqual({ done: 8, due: 9 })
  })

  it('leaves an unfinished current week out', () => {
    const habit = makeHabit({ type: 'perWeek', times: 3 }, '2026-10-12')
    const states = new DayStates(adds(habit.id, ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-19']))
    expect(habitRate(habit, states, '2026-10-01', '2026-10-31', today)).toEqual({ done: 3, due: 3 })
  })

  it('adds rates of several habits', () => {
    expect(addRates([{ done: 1, due: 2 }, { done: 3, due: 3 }])).toEqual({ done: 4, due: 5 })
  })
})

describe('heatmaps', () => {
  it('grades counter habits by how much of the target was reached', () => {
    const habit = makeHabit({ type: 'daily' }, '2026-10-20', 8)
    const states = new DayStates([
      ...adds(habit.id, ['2026-10-21'], 2),
      ...adds(habit.id, ['2026-10-22'], 4),
      ...adds(habit.id, ['2026-10-23'], 7),
      ...adds(habit.id, ['2026-10-24'], 8),
      ...skips(habit.id, ['2026-10-25']),
    ])
    const cells = habitHeatmap(habit, states, '2026-10-19', '2026-10-25')
    expect(cells.map((cell) => cell.level)).toEqual([null, 0, 1, 2, 3, 4, null])
    expect(cells[6].skipped).toBe(true)
  })

  it('shows weekly habits only on done days', () => {
    const habit = makeHabit({ type: 'perWeek', times: 2 })
    const states = new DayStates(adds(habit.id, ['2026-10-20']))
    expect(habitHeatmap(habit, states, '2026-10-19', '2026-10-21').map((cell) => cell.level)).toEqual([null, 4, null])
  })

  it('grades whole days across habits', () => {
    const first = makeHabit({ type: 'daily' })
    const second = makeHabit({ type: 'daily' })
    const weekly = makeHabit({ type: 'perWeek', times: 1 }, '2026-10-24')
    const states = new DayStates([
      ...adds(first.id, ['2026-10-21', '2026-10-22']),
      ...adds(second.id, ['2026-10-22']),
      ...skips(first.id, ['2026-10-23']),
      ...skips(second.id, ['2026-10-23']),
      ...adds(weekly.id, ['2026-10-23']),
    ])
    const cells = overallHeatmap([first, second, weekly], states, '2026-10-20', '2026-10-23')
    expect(cells.map((cell) => cell.level)).toEqual([0, 2, 4, null])
  })
})

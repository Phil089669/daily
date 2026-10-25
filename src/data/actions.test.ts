import { describe, expect, it } from 'vitest'
import { DayStates, itemsForDay } from '../domain/habits.ts'
import { habitRate } from '../domain/stats.ts'
import { archiveHabit, createHabit, restoreHabit, skipDay, tap, updateHabit, type HabitInput } from './actions.ts'
import { FakeRemote, makeDevice } from './test-helpers.ts'

const input: HabitInput = { name: ' Wasser ', slug: 'wasser', categoryId: null, frequency: { type: 'daily' }, target: 1, unit: null }

async function itemFor(device: ReturnType<typeof makeDevice>, habitId: string, day: string) {
  const habits = await device.db.habits.toArray()
  const events = await device.db.habitEvents.toArray()
  const item = itemsForDay(habits, new DayStates(events), day).find((candidate) => candidate.habit.id === habitId)
  const skips = events.filter((event) => event.habitId === habitId && event.day === day && event.type === 'skip' && !event.deleted)
  return { item: item!, skips }
}

describe('habit actions', () => {
  it('trims the name and starts the schedule today', async () => {
    const device = makeDevice(new FakeRemote())
    const habit = await createHabit(device.store, input, '2026-10-25', 3)
    expect(habit).toMatchObject({ name: 'Wasser', sortOrder: 3, schedules: [{ from: '2026-10-25', target: 1 }] })
  })

  it('applies a new target from the day of the change on', async () => {
    const device = makeDevice(new FakeRemote())
    const habit = await createHabit(device.store, input, '2026-10-20', 0)
    await updateHabit(device.store, habit, { ...input, target: 8, unit: 'Gläser' }, '2026-10-25')
    const saved = await device.db.habits.get(habit.id)
    expect(saved?.schedules.map((schedule) => [schedule.from, schedule.target])).toEqual([
      ['2026-10-20', 1],
      ['2026-10-25', 8],
    ])
  })

  it('does not count the archived time as missed', async () => {
    const device = makeDevice(new FakeRemote())
    const habit = await createHabit(device.store, input, '2026-10-01', 0)
    await archiveHabit(device.store, habit, '2026-10-10')
    await restoreHabit(device.store, (await device.db.habits.get(habit.id))!, '2026-10-20')
    const restored = (await device.db.habits.get(habit.id))!
    expect(restored.archived).toBe(false)
    expect(restored.schedules.map((schedule) => schedule.frequency.type)).toEqual(['daily', 'paused', 'daily'])
    // 9 days before the pause and 5 after it are due, none done.
    expect(habitRate(restored, new DayStates([]), '2026-10-01', '2026-10-24', '2026-10-25')).toEqual({ done: 0, due: 14 })
  })

  it('archiving and restoring on the same day leaves the schedule as it was', async () => {
    const device = makeDevice(new FakeRemote())
    const habit = await createHabit(device.store, input, '2026-10-01', 0)
    await archiveHabit(device.store, habit, '2026-10-25')
    await restoreHabit(device.store, (await device.db.habits.get(habit.id))!, '2026-10-25')
    expect((await device.db.habits.get(habit.id))?.schedules).toEqual(habit.schedules)
  })
})

describe('tap', () => {
  it('ticks and unticks a habit with target 1', async () => {
    const device = makeDevice(new FakeRemote())
    const habit = await createHabit(device.store, input, '2026-10-25', 0)
    let { item, skips } = await itemFor(device, habit.id, '2026-10-25')
    await tap(device.store, item, '2026-10-25', skips)
    ;({ item, skips } = await itemFor(device, habit.id, '2026-10-25'))
    expect(item.done).toBe(true)
    await tap(device.store, item, '2026-10-25', skips)
    ;({ item } = await itemFor(device, habit.id, '2026-10-25'))
    expect(item.state.count).toBe(0)
  })

  it('adds one per tap to a counter and undoes the last tap', async () => {
    const device = makeDevice(new FakeRemote())
    const habit = await createHabit(device.store, { ...input, target: 8 }, '2026-10-25', 0)
    let undo = async () => {}
    for (let i = 0; i < 3; i++) {
      const { item, skips } = await itemFor(device, habit.id, '2026-10-25')
      undo = await tap(device.store, item, '2026-10-25', skips)
    }
    expect((await itemFor(device, habit.id, '2026-10-25')).item.state.count).toBe(3)
    await undo()
    expect((await itemFor(device, habit.id, '2026-10-25')).item.state.count).toBe(2)
  })

  it('resumes a skipped day and can undo that', async () => {
    const device = makeDevice(new FakeRemote())
    const habit = await createHabit(device.store, input, '2026-10-25', 0)
    await skipDay(device.store, habit.id, '2026-10-25')
    const { item, skips } = await itemFor(device, habit.id, '2026-10-25')
    expect(item.state.skipped).toBe(true)
    const undo = await tap(device.store, item, '2026-10-25', skips)
    expect((await itemFor(device, habit.id, '2026-10-25')).item.state.skipped).toBe(false)
    await undo()
    expect((await itemFor(device, habit.id, '2026-10-25')).item.state.skipped).toBe(true)
  })
})

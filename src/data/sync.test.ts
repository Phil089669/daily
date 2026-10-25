import { describe, expect, it } from 'vitest'
import { DayStates } from '../domain/habits.ts'
import { changeCount, createHabit, deleteHabit, updateHabit, type HabitInput } from './actions.ts'
import { ensureSeeds } from './seed.ts'
import { fromRemoteRow, toRemoteRow } from './sync.ts'
import { FakeRemote, makeDevice } from './test-helpers.ts'

const today = '2026-10-25'

const reading: HabitInput = {
  name: 'Lesen',
  slug: 'lesen',
  categoryId: null,
  frequency: { type: 'daily' },
  target: 1,
  unit: null,
}

async function countOn(device: ReturnType<typeof makeDevice>, habitId: string) {
  return new DayStates(await device.db.habitEvents.toArray()).get(habitId, today).count
}

describe('row mapping', () => {
  it('maps camelCase fields to snake_case columns and back', () => {
    const row = toRemoteRow({ id: 'a', habitId: 'h', updatedAt: '2026-10-25T10:00:00.000Z' }, 'user-1')
    expect(row).toEqual({ user_id: 'user-1', id: 'a', habit_id: 'h', updated_at: '2026-10-25T10:00:00.000Z' })
  })

  it('normalises Postgres timestamps so they compare as text', () => {
    const record = fromRemoteRow({ id: 'a', user_id: 'u', synced_at: 'x', updated_at: '2026-10-25T10:00:00.5+00:00' })
    expect(record).toEqual({ id: 'a', updatedAt: '2026-10-25T10:00:00.500Z' })
  })
})

describe('SyncEngine', () => {
  it('uploads queued changes and empties the outbox', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const habit = await createHabit(phone.store, reading, today, 0)
    expect(await phone.db.outbox.count()).toBe(1)

    await phone.engine.sync()
    expect(await phone.db.outbox.count()).toBe(0)
    expect(remote.row('habits', habit.id)).toMatchObject({ name: 'Lesen', slug: 'lesen', user_id: 'user-1' })
  })

  it('brings habits and taps from one device to the other', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const pc = makeDevice(remote)
    const habit = await createHabit(phone.store, reading, today, 0)
    await changeCount(phone.store, habit.id, today, 1)
    await phone.engine.sync()

    await pc.engine.sync()
    expect(await pc.db.habits.get(habit.id)).toMatchObject({ name: 'Lesen', schedules: habit.schedules })
    expect(await countOn(pc, habit.id)).toBe(1)
  })

  it('keeps the later edit when both devices edit offline, whichever syncs first', async () => {
    for (const order of ['phone first', 'pc first']) {
      const remote = new FakeRemote()
      const phone = makeDevice(remote)
      const pc = makeDevice(remote)
      const habit = await createHabit(phone.store, reading, today, 0)
      await phone.engine.sync()
      await pc.engine.sync()

      await updateHabit(phone.store, habit, { ...reading, name: 'Lesen (Handy)' }, today)
      pc.advance(5_000)
      const onPc = (await pc.db.habits.get(habit.id))!
      await updateHabit(pc.store, onPc, { ...reading, name: 'Lesen (PC)' }, today)

      const devices = order === 'phone first' ? [phone, pc, phone] : [pc, phone, pc]
      for (const device of devices) await device.engine.sync()

      expect((await phone.db.habits.get(habit.id))?.name, order).toBe('Lesen (PC)')
      expect((await pc.db.habits.get(habit.id))?.name, order).toBe('Lesen (PC)')
      expect(await phone.db.outbox.count()).toBe(0)
    }
  })

  it('lets an edit made after syncing win even if that device clock is behind', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote, Date.UTC(2026, 9, 25, 10, 2))
    const pc = makeDevice(remote, Date.UTC(2026, 9, 25, 10, 0))
    const habit = await createHabit(phone.store, reading, today, 0)
    await updateHabit(phone.store, habit, { ...reading, name: 'Lesen (Handy)' }, today)
    await phone.engine.sync()
    await pc.engine.sync()

    await updateHabit(pc.store, (await pc.db.habits.get(habit.id))!, { ...reading, name: 'Lesen (PC)' }, today)
    await pc.engine.sync()
    await phone.engine.sync()
    expect((await phone.db.habits.get(habit.id))?.name).toBe('Lesen (PC)')
  })

  it('adds up counter taps made on two devices at the same time', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const pc = makeDevice(remote)
    const water = await createHabit(phone.store, { ...reading, name: 'Wasser', slug: 'wasser', target: 8 }, today, 0)
    await phone.engine.sync()
    await pc.engine.sync()

    await changeCount(phone.store, water.id, today, 1)
    await changeCount(phone.store, water.id, today, 1)
    await changeCount(pc.store, water.id, today, 1)
    for (const device of [phone, pc, phone]) await device.engine.sync()

    expect(await countOn(phone, water.id)).toBe(3)
    expect(await countOn(pc, water.id)).toBe(3)
  })

  it('syncs an undo', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const pc = makeDevice(remote)
    const habit = await createHabit(phone.store, reading, today, 0)
    const undo = await changeCount(phone.store, habit.id, today, 1)
    await phone.engine.sync()
    await pc.engine.sync()
    expect(await countOn(pc, habit.id)).toBe(1)

    phone.advance(1_000)
    await undo()
    await phone.engine.sync()
    await pc.engine.sync()
    expect(await countOn(pc, habit.id)).toBe(0)
  })

  it('keeps a record queued that changed while it was being uploaded', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const habit = await createHabit(phone.store, reading, today, 0)
    remote.beforePush = async () => {
      remote.beforePush = undefined
      await updateHabit(phone.store, habit, { ...reading, name: 'Lesen, geändert' }, today)
    }
    await phone.engine.push()
    expect(await phone.db.outbox.count()).toBe(1)

    await phone.engine.sync()
    expect(remote.row('habits', habit.id)?.name).toBe('Lesen, geändert')
    expect(await phone.db.outbox.count()).toBe(0)
  })

  it('does not let an older remote version overwrite a newer local change', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const pc = makeDevice(remote)
    const habit = await createHabit(phone.store, reading, today, 0)
    await phone.engine.sync()
    await pc.engine.sync()

    await updateHabit(pc.store, (await pc.db.habits.get(habit.id))!, { ...reading, name: 'Neu' }, today)
    await pc.engine.pull()
    expect((await pc.db.habits.get(habit.id))?.name).toBe('Neu')
    expect(await pc.db.outbox.count()).toBe(1)
  })

  it('pages through more rows than fit in one request', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const pc = makeDevice(remote)
    const habit = await createHabit(phone.store, reading, today, 0)
    for (let i = 0; i < 1_200; i++) await changeCount(phone.store, habit.id, today, 1)
    await phone.engine.sync()

    await pc.engine.sync()
    expect(await pc.db.habitEvents.count()).toBe(1_200)
    expect(await countOn(pc, habit.id)).toBe(1_200)
  })

  it('gives a habit a free slug when the other device took it first', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const pc = makeDevice(remote)
    await createHabit(phone.store, reading, today, 0)
    const second = await createHabit(pc.store, reading, today, 0)
    await phone.engine.sync()

    await pc.engine.sync()
    await pc.engine.sync()
    expect((await pc.db.habits.get(second.id))?.slug).toBe('lesen-2')
    expect(remote.row('habits', second.id)?.slug).toBe('lesen-2')
    expect(await pc.db.outbox.count()).toBe(0)
  })

  it('lets a deleted habit free its slug in the same upload', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const old = await createHabit(phone.store, reading, today, 0)
    await phone.engine.sync()
    await deleteHabit(phone.store, old)
    const replacement = await createHabit(phone.store, reading, today, 1)
    await phone.engine.sync()
    expect(remote.row('habits', replacement.id)?.slug).toBe('lesen')
  })
})

describe('seeds', () => {
  it('creates the same records on two devices without duplicates', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const pc = makeDevice(remote)
    await ensureSeeds(phone.store, today)
    await ensureSeeds(pc.store, '2026-10-26')
    for (const device of [phone, pc, phone]) await device.engine.sync()

    const onPhone = await phone.db.habits.toArray()
    const onPc = await pc.db.habits.toArray()
    expect(onPhone.map((habit) => habit.slug).sort()).toEqual(['erste-stunde', 'lesen', 'schlafzimmer'])
    expect(onPc).toEqual(expect.arrayContaining(onPhone))
    expect(onPc).toHaveLength(3)
  })

  it('never brings back a deleted seed', async () => {
    const remote = new FakeRemote()
    const phone = makeDevice(remote)
    const pc = makeDevice(remote)
    await ensureSeeds(phone.store, today)
    await phone.engine.sync()
    await deleteHabit(phone.store, (await phone.db.habits.get('seed-lesen'))!)
    await phone.engine.sync()

    // The PC seeds before its first sync, e.g. offline.
    await ensureSeeds(pc.store, today)
    await pc.engine.sync()
    expect((await pc.db.habits.get('seed-lesen'))?.deleted).toBe(true)
    expect(remote.row('habits', 'seed-lesen')?.deleted).toBe(true)
  })
})

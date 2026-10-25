import { describe, expect, it } from 'vitest'
import { changeCount, createCategory, createHabit, deleteHabit, type HabitInput } from './actions.ts'
import { BackupError, exportBackup, importBackup, parseBackup } from './backup.ts'
import { saveSetting } from './settings.ts'
import { FakeRemote, makeDevice } from './test-helpers.ts'

const input: HabitInput = { name: 'Lesen', slug: 'lesen', categoryId: null, frequency: { type: 'daily' }, target: 1, unit: null }

describe('backup', () => {
  it('restores everything after export and import on another device', async () => {
    const phone = makeDevice(new FakeRemote())
    const category = await createCategory(phone.store, 'Fokus', 0)
    const habit = await createHabit(phone.store, { ...input, categoryId: category.id }, '2026-10-20', 0)
    await changeCount(phone.store, habit.id, '2026-10-24', 1)
    await saveSetting(phone.store, 'dayStartMinutes', 300)
    const backup = parseBackup(JSON.stringify(await exportBackup(phone.db)))

    const pc = makeDevice(new FakeRemote())
    await importBackup(pc.store, backup)
    expect(await exportBackup(pc.db, new Date(backup.exportedAt))).toEqual(backup)
  })

  it('leaves out deleted habits and their events', async () => {
    const phone = makeDevice(new FakeRemote())
    const habit = await createHabit(phone.store, input, '2026-10-20', 0)
    await changeCount(phone.store, habit.id, '2026-10-24', 1)
    await deleteHabit(phone.store, habit)
    const backup = await exportBackup(phone.db)
    expect(backup.habits).toEqual([])
    expect(backup.habitEvents).toEqual([])
  })

  it('deletes what is not in the backup and queues everything for upload', async () => {
    const phone = makeDevice(new FakeRemote())
    await createHabit(phone.store, input, '2026-10-20', 0)
    const backup = await exportBackup(phone.db)
    const extra = await createHabit(phone.store, { ...input, slug: 'extra' }, '2026-10-21', 1)
    await phone.db.outbox.clear()

    await importBackup(phone.store, backup)
    expect((await phone.db.habits.get(extra.id))?.deleted).toBe(true)
    expect(await phone.db.outbox.count()).toBe(2)
  })

  it('rejects files that are no Daily backup', () => {
    expect(() => parseBackup('nicht json')).toThrow(BackupError)
    expect(() => parseBackup('{"app":"other"}')).toThrow('kein Daily-Backup')
  })
})

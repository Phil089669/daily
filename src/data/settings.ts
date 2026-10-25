import { DEFAULT_DAY_START_MINUTES } from '../domain/day.ts'
import type { SettingRecord } from './db.ts'
import type { Store } from './store.ts'

export type Settings = {
  /** Minutes after midnight when a new day starts. */
  dayStartMinutes: number
  /** IANA zone the day boundary is computed in, shared with the Shortcuts API. */
  timeZone: string
  lastBackupAt: string | null
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function readSettings(records: SettingRecord[]): Settings {
  const values = new Map(records.filter((record) => !record.deleted).map((record) => [record.id, record.value]))
  const dayStart = values.get('dayStartMinutes')
  const timeZone = values.get('timeZone')
  const lastBackupAt = values.get('lastBackupAt')
  return {
    dayStartMinutes: typeof dayStart === 'number' ? dayStart : DEFAULT_DAY_START_MINUTES,
    timeZone: typeof timeZone === 'string' ? timeZone : deviceTimeZone(),
    lastBackupAt: typeof lastBackupAt === 'string' ? lastBackupAt : null,
  }
}

export async function saveSetting<K extends keyof Settings>(store: Store, key: K, value: Settings[K]): Promise<void> {
  await store.save('settings', [{ id: key, value, updatedAt: '', deleted: false }])
}

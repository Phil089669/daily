import { DailyDb } from './db.ts'
import { Store } from './store.ts'

/** The app's local database and the store that writes to it. */
export const db = new DailyDb()
export const store = new Store(db)

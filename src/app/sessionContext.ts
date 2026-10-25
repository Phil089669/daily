import { createContext, use } from 'react'
import { db } from '../data/instance.ts'
import { supabase } from '../data/supabase.ts'
import type { SyncService } from '../data/syncService.ts'

export type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** `sync` is null when the app runs without Supabase (local development). */
  | { status: 'signedIn'; email: string | null; sync: SyncService | null; firstSyncDone: boolean }

export const SessionContext = createContext<Session>({ status: 'loading' })

export function useSession(): Session {
  return use(SessionContext)
}

/** Signs out and clears this device. The data stays in Supabase. */
export async function signOut() {
  await supabase?.auth.signOut()
  await db.delete()
  window.location.reload()
}

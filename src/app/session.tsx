import type { Session as AuthSession } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { db, store } from '../data/instance.ts'
import { supabaseRemote } from '../data/remote.ts'
import { ensureSeeds } from '../data/seed.ts'
import { supabase } from '../data/supabase.ts'
import { SyncEngine } from '../data/sync.ts'
import { SyncService } from '../data/syncService.ts'
import { logicalDay } from '../domain/day.ts'
import { SessionContext, type Session } from './sessionContext.ts'

async function seed() {
  await ensureSeeds(store, logicalDay(new Date()))
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() =>
    supabase ? { status: 'loading' } : { status: 'signedIn', email: null, sync: null, firstSyncDone: true },
  )

  useEffect(() => {
    if (!supabase) {
      void seed()
      return
    }
    const client = supabase
    let sync: SyncService | null = null
    let active = true

    const handle = (authSession: AuthSession | null) => {
      if (!active) return
      if (!authSession) {
        sync?.stop()
        sync = null
        setSession({ status: 'signedOut' })
        return
      }
      // Token refreshes also land here; the sync keeps running.
      if (sync) return
      const engine = new SyncEngine(db, supabaseRemote(client), authSession.user.id, store.clock)
      const service = new SyncService(engine)
      sync = service
      service.start(store, client)
      const email = authSession.user.email ?? null
      setSession({ status: 'signedIn', email, sync: service, firstSyncDone: false })
      // Seed only after the first download, so presets deleted on another device stay deleted.
      void service
        .run()
        .then(seed)
        .finally(() => {
          if (active) setSession({ status: 'signedIn', email, sync: service, firstSyncDone: true })
        })
    }

    // Supabase calls must not run inside the auth callback, hence the timeout.
    const { data } = client.auth.onAuthStateChange((_event, authSession) => {
      setTimeout(() => handle(authSession), 0)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
      sync?.stop()
    }
  }, [])

  return <SessionContext value={session}>{children}</SessionContext>
}

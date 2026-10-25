import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Store } from './store.ts'
import type { SyncEngine } from './sync.ts'

export type SyncStatus = {
  state: 'idle' | 'syncing' | 'offline' | 'error'
  lastSyncedAt: string | null
  error: string | null
}

const saveDelayMs = 800
const remoteDelayMs = 400
const pollMs = 60_000
const retryMs = 30_000

/** Runs the sync when something changed: a local save, coming online, returning to the app, or a change elsewhere. */
export class SyncService {
  private readonly engine: SyncEngine
  private status: SyncStatus = { state: 'idle', lastSyncedAt: null, error: null }
  private readonly listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private running = false
  private runAgain = false
  private cleanups: (() => void)[] = []

  constructor(engine: SyncEngine) {
    this.engine = engine
  }

  start(store: Store, client: SupabaseClient) {
    const now = () => this.request(0)
    const whenVisible = () => {
      if (document.visibilityState === 'visible') this.request(0)
    }
    window.addEventListener('online', now)
    document.addEventListener('visibilitychange', whenVisible)
    const poll = setInterval(whenVisible, pollMs)
    const stopListening = store.onSave(() => this.request(saveDelayMs))
    // Changes from the other device (or the Shortcuts API) arrive within a second.
    const channel: RealtimeChannel = client
      .channel('daily-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => this.request(remoteDelayMs))
      .subscribe()
    this.cleanups = [
      () => window.removeEventListener('online', now),
      () => document.removeEventListener('visibilitychange', whenVisible),
      () => clearInterval(poll),
      stopListening,
      () => void client.removeChannel(channel),
    ]
  }

  stop() {
    for (const cleanup of this.cleanups) cleanup()
    this.cleanups = []
    clearTimeout(this.timer)
  }

  request(delayMs: number) {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.run(), delayMs)
  }

  async run(): Promise<void> {
    if (this.running) {
      this.runAgain = true
      return
    }
    if (!navigator.onLine) {
      this.update({ state: 'offline' })
      return
    }
    this.running = true
    this.update({ state: 'syncing', error: null })
    try {
      await this.engine.sync()
      this.update({ state: 'idle', lastSyncedAt: new Date().toISOString() })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.update({ state: navigator.onLine ? 'error' : 'offline', error: message })
      this.request(retryMs)
    } finally {
      this.running = false
      if (this.runAgain) {
        this.runAgain = false
        this.request(0)
      }
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getStatus = () => this.status

  private update(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch }
    for (const listener of this.listeners) listener()
  }
}

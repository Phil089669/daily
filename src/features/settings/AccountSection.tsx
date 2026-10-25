import { useLiveQuery } from 'dexie-react-hooks'
import { useState, useSyncExternalStore } from 'react'
import { signOut } from '../../app/sessionContext.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { primaryButton, quietButton, secondaryButton, sectionTitle } from '../../components/styles.ts'
import { db } from '../../data/instance.ts'
import type { SyncService, SyncStatus } from '../../data/syncService.ts'

function changes(count: number): string {
  return count === 1 ? '1 Änderung' : `${count} Änderungen`
}

function statusText(status: SyncStatus, pending: number): string {
  switch (status.state) {
    case 'syncing':
      return 'Wird synchronisiert …'
    case 'offline':
      return pending > 0 ? `Offline. ${changes(pending)} werden übertragen, sobald du wieder online bist.` : 'Offline. Alles ist gespeichert.'
    case 'error':
      return `Synchronisieren fehlgeschlagen (${status.error ?? 'unbekannter Fehler'}). Neuer Versuch in Kürze.`
    case 'idle': {
      const time = status.lastSyncedAt
        ? new Date(status.lastSyncedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : null
      const base = time ? `Synchronisiert um ${time}.` : 'Noch nicht synchronisiert.'
      return pending > 0 ? `${base} ${changes(pending)} warten.` : base
    }
  }
}

export function AccountSection({ email, sync }: { email: string | null; sync: SyncService }) {
  const status = useSyncExternalStore(sync.subscribe, sync.getStatus)
  const pending = useLiveQuery(() => db.outbox.count(), [], 0)
  const [confirm, setConfirm] = useState(false)

  return (
    <section aria-labelledby="account" className="mb-10">
      <h2 id="account" className={sectionTitle}>
        Konto
      </h2>
      {email && <p className="text-small text-muted">Angemeldet als {email}</p>}
      <p className="mt-2 text-small" aria-live="polite">
        {statusText(status, pending)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} disabled={status.state === 'syncing'} onClick={() => void sync.run()}>
          Jetzt synchronisieren
        </button>
        <button type="button" className={quietButton} onClick={() => setConfirm(true)}>
          Abmelden
        </button>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Abmelden?">
        <p className="mb-2 text-muted">Die Daten auf diesem Gerät werden gelöscht. In deinem Konto bleiben sie erhalten.</p>
        {pending > 0 && <p className="mb-2">{changes(pending)} sind noch nicht hochgeladen und gehen dabei verloren.</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={primaryButton} onClick={() => void signOut()}>
            Abmelden
          </button>
          <button type="button" className={secondaryButton} onClick={() => setConfirm(false)}>
            Abbrechen
          </button>
        </div>
      </Sheet>
    </section>
  )
}

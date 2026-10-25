import { useRef, useState, type ChangeEvent } from 'react'
import { Sheet } from '../../components/Sheet.tsx'
import { primaryButton, secondaryButton, sectionTitle } from '../../components/styles.ts'
import { BackupError, exportBackup, importBackup, parseBackup, type Backup } from '../../data/backup.ts'
import { db, store } from '../../data/instance.ts'
import { saveSetting, type Settings } from '../../data/settings.ts'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

/** On the phone the share sheet offers "In Dateien sichern"; on the PC a download is simpler. */
async function saveFile(file: File): Promise<boolean> {
  const touch = window.matchMedia('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Daily-Backup' })
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
    }
  }
  download(file)
  return true
}

export function BackupSection({ settings }: { settings: Settings }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<Backup | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function exportNow() {
    setMessage(null)
    const backup = await exportBackup(db)
    const file = new File([JSON.stringify(backup, null, 2)], `daily-backup-${backup.exportedAt.slice(0, 10)}.json`, {
      type: 'application/json',
    })
    if (await saveFile(file)) await saveSetting(store, 'lastBackupAt', backup.exportedAt)
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage(null)
    try {
      setPendingImport(parseBackup(await file.text()))
    } catch (error) {
      setMessage(error instanceof BackupError ? error.message : 'Die Datei konnte nicht gelesen werden.')
    }
  }

  async function importNow() {
    if (!pendingImport) return
    await importBackup(store, pendingImport)
    setPendingImport(null)
    setMessage('Backup importiert.')
  }

  return (
    <section aria-labelledby="backup" className="mb-10">
      <h2 id="backup" className={sectionTitle}>
        Backup
      </h2>
      <p className="text-small text-muted">
        {settings.lastBackupAt ? `Letztes Backup: ${formatDate(settings.lastBackupAt)}` : 'Noch kein Backup.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} onClick={() => void exportNow()}>
          Backup exportieren
        </button>
        <button type="button" className={secondaryButton} onClick={() => fileInput.current?.click()}>
          Backup importieren
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void chooseFile(event)} />
      </div>
      {message && (
        <p className="mt-3 text-small" role="status">
          {message}
        </p>
      )}

      <Sheet open={pendingImport !== null} onClose={() => setPendingImport(null)} title="Backup importieren?">
        <p className="mb-5 text-muted">
          {pendingImport &&
            `Das Backup vom ${formatDate(pendingImport.exportedAt)} ersetzt alle Daten, nach dem nächsten Sync auch auf deinen anderen Geräten.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButton} onClick={() => void importNow()}>
            Daten ersetzen
          </button>
          <button type="button" className={secondaryButton} onClick={() => setPendingImport(null)}>
            Abbrechen
          </button>
        </div>
      </Sheet>
    </section>
  )
}

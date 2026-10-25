import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { reloadWithUpdate, useUpdateReady } from '../../app/pwa'
import { useSession } from '../../app/sessionContext.ts'
import { applyTheme, readTheme, type ThemeChoice } from '../../app/theme'
import { PageHeader } from '../../components/PageHeader.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { primaryButton, sectionTitle, textInput } from '../../components/styles.ts'
import { useHabitData } from '../../data/hooks.ts'
import { store } from '../../data/instance.ts'
import { saveSetting } from '../../data/settings.ts'
import { AccountSection } from './AccountSection.tsx'
import { BackupSection } from './BackupSection.tsx'

const buildTime = new Date(__APP_BUILD__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })

// 00:00 to 06:00 in half hours.
const dayStartOptions = Array.from({ length: 13 }, (_, index) => index * 30)

function clockTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function SettingsPage() {
  const data = useHabitData()
  const session = useSession()
  const [theme, setTheme] = useState(readTheme)
  const updateReady = useUpdateReady()

  function chooseTheme(choice: ThemeChoice) {
    applyTheme(choice)
    setTheme(choice)
  }

  return (
    <>
      <PageHeader title="Einstellungen" showSettingsLink={false} />

      {session.status === 'signedIn' && session.sync && <AccountSection email={session.email} sync={session.sync} />}

      {data && (
        <section aria-labelledby="day" className="mb-10">
          <h2 id="day" className={sectionTitle}>
            Tageswechsel
          </h2>
          <p className="mb-3 text-small text-muted">Bis zu dieser Uhrzeit zählt alles noch zum Vortag.</p>
          <select
            aria-label="Tageswechsel"
            className={`${textInput} w-32`}
            value={data.settings.dayStartMinutes}
            onChange={(event) => void saveSetting(store, 'dayStartMinutes', Number(event.target.value))}
          >
            {dayStartOptions.map((minutes) => (
              <option key={minutes} value={minutes}>
                {clockTime(minutes)}
              </option>
            ))}
          </select>
        </section>
      )}

      <section aria-labelledby="habits" className="mb-10">
        <h2 id="habits" className={sectionTitle}>
          Gewohnheiten
        </h2>
        <ul>
          {[
            { to: '/gewohnheiten', label: 'Gewohnheiten bearbeiten' },
            { to: '/kategorien', label: 'Kategorien bearbeiten' },
          ].map((link) => (
            <li key={link.to} className="border-b border-rule/70 last:border-b-0">
              <Link to={link.to} className="flex h-14 items-center justify-between">
                {link.label}
                <ChevronRight size={20} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {data && <BackupSection settings={data.settings} />}

      <section aria-labelledby="appearance" className="mb-10">
        <h2 id="appearance" className={sectionTitle}>
          Darstellung
        </h2>
        <Segmented
          name="theme"
          legend="Farbschema"
          value={theme}
          onChange={chooseTheme}
          options={[
            { value: 'dark', label: 'Dunkel' },
            { value: 'light', label: 'Hell' },
            { value: 'system', label: 'Wie System' },
          ]}
        />
      </section>

      <section aria-labelledby="app">
        <h2 id="app" className={sectionTitle}>
          App
        </h2>
        <p className="text-small text-muted">Version vom {buildTime}</p>
        {updateReady && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-small">Eine neue Version ist bereit. Sie wird beim nächsten Start geladen.</p>
            <button type="button" onClick={reloadWithUpdate} className={`${primaryButton} shrink-0`}>
              Jetzt laden
            </button>
          </div>
        )}
      </section>
    </>
  )
}

import { ChevronLeft, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useGoBack } from '../hooks/useGoBack.ts'

type Props = {
  title: string
  subtitle?: ReactNode
  /** Large type, used for the day on Heute. */
  hero?: boolean
  /** Shows a back button; the path is used when there is no history to go back to. */
  back?: string
  showSettingsLink?: boolean
}

export function PageHeader({ title, subtitle, hero = false, back, showSettingsLink = !back }: Props) {
  return (
    <header className="mb-6">
      {back && <BackButton fallback={back} />}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className={hero ? 'text-display font-bold tracking-tight' : 'text-heading font-bold'}>{title}</h1>
          {typeof subtitle === 'string' ? <p className="mt-1 text-title text-muted">{subtitle}</p> : subtitle}
        </div>
        {showSettingsLink && (
          <Link
            to="/einstellungen"
            aria-label="Einstellungen"
            className="-mt-1 -mr-3 grid size-12 shrink-0 place-items-center rounded-lg text-muted hover:text-fg md:hidden"
          >
            <Settings size={24} />
          </Link>
        )}
      </div>
    </header>
  )
}

function BackButton({ fallback }: { fallback: string }) {
  const goBack = useGoBack(fallback)
  return (
    <button
      type="button"
      onClick={goBack}
      className="-ml-2 mb-2 inline-flex h-10 items-center gap-1 rounded-lg pr-3 text-small font-semibold text-muted hover:text-fg"
    >
      <ChevronLeft size={20} />
      Zurück
    </button>
  )
}

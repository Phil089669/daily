import { ChartNoAxesColumn, Dumbbell, Hourglass, Settings } from 'lucide-react'
import type { ComponentType } from 'react'
import { NavLink } from 'react-router'
import { ThinkIcon, TodayIcon } from './icons'

type Tab = {
  to: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}

const tabs: Tab[] = [
  { to: '/', label: 'Heute', icon: TodayIcon },
  { to: '/sport', label: 'Sport', icon: Dumbbell },
  { to: '/denken', label: 'Denken', icon: ThinkIcon },
  { to: '/fokus', label: 'Fokus', icon: Hourglass },
  { to: '/statistik', label: 'Statistik', icon: ChartNoAxesColumn },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'flex h-16 flex-col items-center justify-center gap-1 text-caption',
    'md:h-12 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-body',
    isActive ? 'font-semibold text-fg md:bg-sheet' : 'text-muted hover:text-fg',
  ].join(' ')
}

/** Bottom tab bar on phones, side rail from tablet width up. */
export function TabBar() {
  return (
    <nav
      aria-label="Bereiche"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:flex md:h-dvh md:w-56 md:shrink-0 md:flex-col md:border-t-0 md:border-r md:px-3 md:pt-10 md:pb-6"
    >
      <p className="hidden px-3 pb-8 text-title font-bold md:block">Daily</p>
      <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-1">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'} className={linkClass}>
              <Icon size={24} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-auto hidden md:block">
        <NavLink to="/einstellungen" className={linkClass}>
          <Settings size={24} />
          <span>Einstellungen</span>
        </NavLink>
      </div>
    </nav>
  )
}

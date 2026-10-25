import { Ellipsis } from 'lucide-react'
import { TickBox } from '../../components/TickBox.tsx'
import type { DayItem } from '../../domain/habits.ts'

type Props = {
  item: DayItem
  detail: string | null
  justTicked: boolean
  onTap: () => void
  onMore: () => void
}

/** The whole row is one tap target; the button on the right opens more actions. */
export function HabitRow({ item, detail, justTicked, onTap, onMore }: Props) {
  const { habit, schedule, state, done } = item
  const isCounter = schedule.target > 1
  return (
    <li className="flex items-center border-b border-rule/70 last:border-b-0">
      <button
        type="button"
        onClick={onTap}
        aria-pressed={isCounter ? undefined : done}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-4 py-3 text-left"
      >
        <TickBox done={done} skipped={state.skipped} count={isCounter ? state.count : null} animate={justTicked} />
        <span className="min-w-0">
          <span className={`block ${done ? 'text-muted' : ''}`}>{habit.name}</span>
          {detail && <span className="block text-small text-muted">{detail}</span>}
        </span>
      </button>
      <button
        type="button"
        onClick={onMore}
        aria-label={`Mehr zu ${habit.name}`}
        className="-mr-3 grid size-12 shrink-0 place-items-center rounded-lg text-muted hover:text-fg"
      >
        <Ellipsis size={20} />
      </button>
    </li>
  )
}

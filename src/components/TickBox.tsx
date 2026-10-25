type Props = {
  done: boolean
  skipped: boolean
  /** Shown inside the box for counters that are not done yet. */
  count: number | null
  /** Draws the tick like a pen stroke; only right after the user ticked. */
  animate: boolean
}

/** The square box of the app icon. A done tick is drawn in ink and runs past the box. */
export function TickBox({ done, skipped, count, animate }: Props) {
  return (
    <span className="relative size-8 shrink-0" aria-hidden="true">
      <svg viewBox="0 0 32 32" className="absolute inset-0 size-8 overflow-visible">
        <rect
          x="2"
          y="6"
          width="24"
          height="24"
          rx="5"
          fill="none"
          strokeWidth="2"
          strokeDasharray={skipped ? '3 3' : undefined}
          className={skipped ? 'stroke-muted' : done ? 'stroke-fg/50' : 'stroke-fg/80'}
        />
        {done && (
          <path
            d="M8 18.5c1.6 1.5 3.2 3.2 4.8 5.3C17.6 15.2 22.4 8.6 29 2.5"
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className={`stroke-ink ${animate ? 'tick-draw' : ''}`}
          />
        )}
      </svg>
      {(skipped || (!done && count !== null && count > 0)) && (
        <span className="absolute top-[6px] left-[2px] grid size-6 place-items-center text-small font-bold">
          {skipped ? <span className="text-muted">–</span> : count}
        </span>
      )}
    </span>
  )
}

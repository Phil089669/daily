// Custom icons drawn in Lucide's style (24px grid, 2px stroke).

type IconProps = { size?: number; className?: string }

/** A box with a tick that overshoots it, as in the app icon. */
export function TodayIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="7" width="14" height="14" rx="2.5" />
      <path d="M7 13.5l3 3L20.5 4" />
    </svg>
  )
}

/** A 3×3 matrix with the last cell missing, as in the matrix puzzles. */
export function ThinkIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={2.75 + (i % 3) * 7} y={2.75 + Math.floor(i / 3) * 7} width="4.5" height="4.5" rx="1" />
      ))}
    </svg>
  )
}

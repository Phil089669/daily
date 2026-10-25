import { useLayoutEffect, useRef } from 'react'
import { formatDay } from '../domain/day.ts'
import type { HeatCell } from '../domain/stats.ts'

const size = 12
const gap = 3
const step = size + gap
const labelWidth = 26
const labelHeight = 18

const levelFill = ['fill-rule', 'fill-ink/30', 'fill-ink/55', 'fill-ink/80', 'fill-ink']

function describe(cell: HeatCell): string {
  if (cell.skipped) return 'ausgesetzt'
  if (cell.level === null) return 'nichts geplant'
  if (cell.level === 0) return 'verpasst'
  return cell.level === 4 ? 'erledigt' : 'teilweise'
}

type Props = {
  /** One cell per day, starting on a Monday. */
  cells: HeatCell[]
  label: string
}

/** GitHub-style year grid: one column per week, Monday on top, today at the right. The weekday labels stay put while the grid scrolls. */
export function Heatmap({ cells, label }: Props) {
  const scroller = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = scroller.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [cells.length])

  const weeks = Math.ceil(cells.length / 7)
  const width = weeks * step - gap
  const height = labelHeight + 7 * step - gap

  const months: { x: number; text: string }[] = []
  for (let week = 0; week < weeks; week++) {
    const month = cells[week * 7].day.slice(0, 7)
    if (week === 0 || month !== cells[(week - 1) * 7].day.slice(0, 7)) {
      const x = week * step
      // Leave out a label that would run into the previous one.
      if (months.length === 0 || x - months[months.length - 1].x >= 3 * step) {
        months.push({ x, text: formatDay(cells[week * 7].day, { month: 'short' }) })
      }
    }
  }

  return (
    <div className="flex">
      <svg width={labelWidth} height={height} aria-hidden="true" className="block shrink-0 text-[11px]">
        {['Mo', 'Mi', 'Fr'].map((weekday, index) => (
          <text key={weekday} x={0} y={labelHeight + index * 2 * step + size - 2} className="fill-muted">
            {weekday}
          </text>
        ))}
      </svg>
      <div ref={scroller} className="-mr-6 overflow-x-auto pr-6 pb-1 md:mr-0 md:pr-0">
        <svg width={width} height={height} role="img" aria-label={label} className="block text-[11px]">
          {months.map((month) => (
            <text key={month.x} x={month.x} y={11} className="fill-muted">
              {month.text}
            </text>
          ))}
          {cells.map((cell, index) => {
            const x = Math.floor(index / 7) * step
            const y = labelHeight + (index % 7) * step
            return (
              <g key={cell.day}>
                <rect
                  x={x}
                  y={y}
                  width={size}
                  height={size}
                  rx={2.5}
                  className={cell.level === null ? 'fill-rule/40' : levelFill[cell.level]}
                >
                  <title>{`${formatDay(cell.day, { weekday: 'short', day: 'numeric', month: 'short' })}: ${describe(cell)}`}</title>
                </rect>
                {cell.skipped && (
                  <path d={`M${x + 3} ${y + size - 3}L${x + size - 3} ${y + 3}`} strokeWidth={1.5} className="stroke-muted" />
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export function HeatmapLegend() {
  const items = [
    { label: 'verpasst', className: 'bg-rule' },
    { label: 'teilweise', className: 'bg-ink/55' },
    { label: 'erledigt', className: 'bg-ink' },
  ]
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={`size-3 rounded-[3px] ${item.className}`} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

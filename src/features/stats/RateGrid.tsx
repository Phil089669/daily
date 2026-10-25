import type { Rate } from '../../domain/stats.ts'
import { percent } from './periods.ts'

export function RateGrid({ rates }: { rates: { label: string; rate: Rate }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
      {rates.map(({ label, rate }) => (
        <div key={label}>
          <dt className="text-small text-muted">{label}</dt>
          <dd className="text-heading font-bold">{percent(rate)}</dd>
          <dd className="text-caption text-muted">{rate.due === 0 ? 'nichts fällig' : `${rate.done} von ${rate.due}`}</dd>
        </div>
      ))}
    </dl>
  )
}

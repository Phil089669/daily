import { Minus, Plus } from 'lucide-react'

type Props = {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  /** Names the value for screen readers, e.g. "Tagesziel". */
  label: string
}

export function Stepper({ value, min, max, onChange, label }: Props) {
  return (
    <div className="inline-flex items-center rounded-lg border border-rule bg-paper" role="group" aria-label={label}>
      <button
        type="button"
        className="grid size-12 place-items-center text-muted hover:text-fg disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`${label} verringern`}
      >
        <Minus size={20} />
      </button>
      <output className="w-10 text-center text-title font-semibold" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="grid size-12 place-items-center text-muted hover:text-fg disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`${label} erhöhen`}
      >
        <Plus size={20} />
      </button>
    </div>
  )
}

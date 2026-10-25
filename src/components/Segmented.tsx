type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  name: string
  legend: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

/** One choice out of a few, built on radio buttons so keyboard and screen readers work as usual. */
export function Segmented<T extends string>({ name, legend, options, value, onChange }: Props<T>) {
  return (
    <fieldset
      className="grid gap-1 rounded-xl border border-rule bg-paper p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span className="grid h-11 cursor-pointer place-items-center rounded-lg px-2 text-center text-small font-semibold text-muted peer-checked:bg-sheet peer-checked:text-fg peer-focus-visible:outline-2 peer-focus-visible:outline-fg">
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { Sheet } from '../../components/Sheet.tsx'
import { Stepper } from '../../components/Stepper.tsx'
import { fieldLabel, primaryButton, quietButton, secondaryButton, textInput } from '../../components/styles.ts'
import {
  archiveHabit,
  createCategory,
  createHabit,
  deleteHabit,
  restoreHabit,
  updateHabit,
  type HabitInput,
} from '../../data/actions.ts'
import type { HabitRecord } from '../../data/db.ts'
import { useHabitData, type HabitData } from '../../data/hooks.ts'
import { store } from '../../data/instance.ts'
import type { DayKey } from '../../domain/day.ts'
import { lastActiveSchedule, type Frequency } from '../../domain/habits.ts'
import { isValidSlug, slugify, uniqueSlug } from '../../domain/slug.ts'
import { useGoBack } from '../../hooks/useGoBack.ts'
import { useToday } from '../../hooks/useToday.ts'

export function HabitFormPage() {
  const { id } = useParams()
  const data = useHabitData()
  const today = useToday(data?.settings.dayStartMinutes, data?.settings.timeZone)
  if (!data) return null
  const habit = id ? data.allHabits.find((candidate) => candidate.id === id) : undefined
  if (id && !habit) {
    return (
      <>
        <PageHeader title="Gewohnheit" back="/gewohnheiten" />
        <p className="text-muted">Diese Gewohnheit gibt es nicht mehr.</p>
      </>
    )
  }
  return <HabitForm key={habit?.id ?? 'new'} habit={habit} data={data} today={today} />
}

type FrequencyType = 'daily' | 'weekdays' | 'perWeek'

const weekdayOptions = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const newCategory = 'new'

function HabitForm({ habit, data, today }: { habit: HabitRecord | undefined; data: HabitData; today: DayKey }) {
  const goBack = useGoBack('/gewohnheiten')
  const current = habit ? lastActiveSchedule(habit) : undefined
  const frequency = current?.frequency

  const [name, setName] = useState(habit?.name ?? '')
  const [slugInput, setSlugInput] = useState<string | null>(habit ? habit.slug : null)
  const [categoryId, setCategoryId] = useState(habit ? (habit.categoryId ?? '') : (data.categories[0]?.id ?? ''))
  const [categoryName, setCategoryName] = useState('')
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(
    frequency?.type === 'weekdays' || frequency?.type === 'perWeek' ? frequency.type : 'daily',
  )
  const [days, setDays] = useState<number[]>(frequency?.type === 'weekdays' ? frequency.days : [0, 2, 4])
  const [times, setTimes] = useState(frequency?.type === 'perWeek' ? frequency.times : 3)
  const [target, setTarget] = useState(current?.target ?? 1)
  const [unit, setUnit] = useState(current?.unit ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const taken = new Set(data.allHabits.filter((other) => other.id !== habit?.id).map((other) => other.slug))
  // Until the slug is edited by hand, it follows the name.
  const slug = slugInput ?? uniqueSlug(slugify(name), taken)
  const slugError = !isValidSlug(slug)
    ? 'Nur Kleinbuchstaben, Ziffern und Bindestriche, höchstens 32 Zeichen.'
    : taken.has(slug)
      ? 'Dieser Slug ist schon vergeben.'
      : null
  const archived = habit?.archived ?? false
  const canSave =
    name.trim() !== '' &&
    slugError === null &&
    !(frequencyType === 'weekdays' && days.length === 0) &&
    !(categoryId === newCategory && categoryName.trim() === '')

  function buildFrequency(): Frequency {
    if (frequencyType === 'weekdays') return { type: 'weekdays', days: [...days].sort((a, b) => a - b) }
    if (frequencyType === 'perWeek') return { type: 'perWeek', times }
    return { type: 'daily' }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!canSave) return
    let category: string | null = categoryId === '' ? null : categoryId
    if (categoryId === newCategory) category = (await createCategory(store, categoryName, data.categories.length)).id
    const input: HabitInput = {
      name,
      slug,
      categoryId: category,
      frequency: buildFrequency(),
      target,
      unit: unit.trim() || null,
    }
    if (habit) await updateHabit(store, habit, input, today)
    else await createHabit(store, input, today, data.habits.length)
    goBack()
  }

  return (
    <>
      <PageHeader title={habit ? 'Gewohnheit bearbeiten' : 'Neue Gewohnheit'} back="/gewohnheiten" />
      <form onSubmit={save} className="space-y-7">
        <div>
          <label htmlFor="name" className={fieldLabel}>
            Name
          </label>
          <input id="name" className={`${textInput} w-full`} value={name} onChange={(event) => setName(event.target.value)} required autoFocus={!habit} />
        </div>

        <div>
          <label htmlFor="category" className={fieldLabel}>
            Kategorie
          </label>
          <select id="category" className={`${textInput} w-full`} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value="">Ohne Kategorie</option>
            <option value={newCategory}>Neue Kategorie …</option>
          </select>
          {categoryId === newCategory && (
            <input
              className={`${textInput} mt-2 w-full`}
              aria-label="Name der neuen Kategorie"
              placeholder="Name der Kategorie"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
            />
          )}
        </div>

        {archived ? (
          <p className="text-small text-muted">
            Archivierte Gewohnheiten sind pausiert. Stelle sie wieder her, um Häufigkeit oder Ziel zu ändern.
          </p>
        ) : (
          <>
            <div>
              <p className={fieldLabel}>Häufigkeit</p>
              <Segmented
                name="frequency"
                legend="Häufigkeit"
                value={frequencyType}
                onChange={setFrequencyType}
                options={[
                  { value: 'daily', label: 'Täglich' },
                  { value: 'weekdays', label: 'Wochentage' },
                  { value: 'perWeek', label: 'Pro Woche' },
                ]}
              />
              {frequencyType === 'weekdays' && (
                <div className="mt-3 grid grid-cols-7 gap-1" role="group" aria-label="Wochentage">
                  {weekdayOptions.map((label, index) => {
                    const selected = days.includes(index)
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setDays(selected ? days.filter((day) => day !== index) : [...days, index])}
                        className={`h-11 rounded-lg border text-small font-semibold ${selected ? 'border-fg bg-fg text-paper' : 'border-rule text-muted'}`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
              {frequencyType === 'perWeek' && (
                <div className="mt-3 flex items-center gap-3">
                  <Stepper label="Mal pro Woche" value={times} min={1} max={7} onChange={setTimes} />
                  <span className="text-muted">mal pro Woche</span>
                </div>
              )}
            </div>

            <div>
              <p className={fieldLabel}>Tagesziel</p>
              <div className="flex flex-wrap items-center gap-3">
                <Stepper label="Tagesziel" value={target} min={1} max={99} onChange={setTarget} />
                <input
                  className={`${textInput} min-w-32 flex-1`}
                  aria-label="Einheit"
                  placeholder="Einheit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                />
              </div>
              <p className="mt-2 text-small text-muted">Ab 2 wird daraus ein Zähler, z. B. 8 Gläser Wasser. Jeder Tipp zählt eins hoch.</p>
            </div>
          </>
        )}

        <div>
          <label htmlFor="slug" className={fieldLabel}>
            Kurzname für Kurzbefehle
          </label>
          <input
            id="slug"
            className={`${textInput} w-full`}
            value={slug}
            onChange={(event) => setSlugInput(event.target.value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={slugError !== null}
            aria-describedby="slug-hint"
          />
          <p id="slug-hint" className="mt-2 text-small text-muted">
            {slugError ?? 'Damit sprechen iPhone-Kurzbefehle die Gewohnheit an, z. B. „lesen“.'}
          </p>
        </div>

        {habit && !archived && <p className="text-small text-muted">Änderungen an Häufigkeit und Ziel gelten ab heute.</p>}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryButton} disabled={!canSave}>
            Speichern
          </button>
          {habit && (
            <button
              type="button"
              className={secondaryButton}
              onClick={async () => {
                if (archived) await restoreHabit(store, habit, today)
                else await archiveHabit(store, habit, today)
                goBack()
              }}
            >
              {archived ? 'Wiederherstellen' : 'Archivieren'}
            </button>
          )}
          {habit && (
            <button type="button" className={quietButton} onClick={() => setConfirmDelete(true)}>
              Löschen
            </button>
          )}
        </div>
      </form>

      {habit && (
        <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`„${habit.name}“ löschen?`}>
          <p className="mb-5 text-muted">
            Alle Einträge dieser Gewohnheit verschwinden aus Statistik und Heatmap. Zum Pausieren kannst du sie stattdessen
            archivieren.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButton}
              onClick={async () => {
                await deleteHabit(store, habit)
                setConfirmDelete(false)
                goBack()
              }}
            >
              Endgültig löschen
            </button>
            <button type="button" className={secondaryButton} onClick={() => setConfirmDelete(false)}>
              Abbrechen
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}

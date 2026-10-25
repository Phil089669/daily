import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader.tsx'
import { iconButton, primaryButton, quietButton } from '../../components/styles.ts'
import { reorder } from '../../data/actions.ts'
import type { HabitRecord } from '../../data/db.ts'
import { useHabitData, type HabitData } from '../../data/hooks.ts'
import { store } from '../../data/instance.ts'
import { describeSchedule } from './describe.ts'

type Group = { id: string; name: string | null; habits: HabitRecord[] }

function groupHabits(data: HabitData): Group[] {
  const names = new Map(data.categories.map((category) => [category.id, category.name]))
  const groups: Group[] = []
  for (const habit of data.habits) {
    const id = habit.categoryId && names.has(habit.categoryId) ? habit.categoryId : ''
    let group = groups.at(-1)
    if (!group || group.id !== id) {
      group = { id, name: names.get(id) ?? null, habits: [] }
      groups.push(group)
    }
    group.habits.push(habit)
  }
  return groups
}

function HabitLink({ habit }: { habit: HabitRecord }) {
  return (
    <Link to={`/gewohnheiten/${habit.id}`} className="min-h-16 min-w-0 flex-1 py-3">
      <span className="block">{habit.name}</span>
      <span className="block text-small text-muted">{describeSchedule(habit.schedules[habit.schedules.length - 1])}</span>
    </Link>
  )
}

export function HabitsPage() {
  const data = useHabitData()
  if (!data) return null
  const groups = groupHabits(data)
  const showGroupNames = groups.some((group) => group.name !== null)

  function move(group: Group, index: number, offset: number) {
    const ordered = [...group.habits]
    const [habit] = ordered.splice(index, 1)
    ordered.splice(index + offset, 0, habit)
    void reorder(store, 'habits', ordered)
  }

  return (
    <>
      <PageHeader title="Gewohnheiten" back="/" />
      <Link to="/gewohnheiten/neu" className={`${primaryButton} mb-6`}>
        <Plus size={20} />
        Neue Gewohnheit
      </Link>

      {groups.map((group) => (
        <section key={group.id} aria-label={group.name ?? 'Ohne Kategorie'} className="mb-6">
          {showGroupNames && <h2 className="text-small font-semibold text-muted">{group.name ?? 'Sonstiges'}</h2>}
          <ul>
            {group.habits.map((habit, index) => (
              <li key={habit.id} className="flex items-center border-b border-rule/70 last:border-b-0">
                <HabitLink habit={habit} />
                <button
                  type="button"
                  className={iconButton}
                  aria-label={`${habit.name} nach oben`}
                  disabled={index === 0}
                  onClick={() => move(group, index, -1)}
                >
                  <ArrowUp size={20} />
                </button>
                <button
                  type="button"
                  className={`${iconButton} -mr-3`}
                  aria-label={`${habit.name} nach unten`}
                  disabled={index === group.habits.length - 1}
                  onClick={() => move(group, index, 1)}
                >
                  <ArrowDown size={20} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {data.archived.length > 0 && (
        <section aria-label="Archiv" className="mb-6">
          <h2 className="text-small font-semibold text-muted">Archiv</h2>
          <ul>
            {data.archived.map((habit) => (
              <li key={habit.id} className="flex border-b border-rule/70 last:border-b-0">
                <HabitLink habit={habit} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/kategorien" className={`${quietButton} -ml-3`}>
        Kategorien bearbeiten
      </Link>
    </>
  )
}

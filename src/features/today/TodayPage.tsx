import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useSession } from '../../app/sessionContext.ts'
import { PageHeader } from '../../components/PageHeader.tsx'
import { primaryButton, quietButton } from '../../components/styles.ts'
import { useUndo } from '../../components/undoContext.ts'
import { tap } from '../../data/actions.ts'
import { useHabitData, type HabitData } from '../../data/hooks.ts'
import { store } from '../../data/instance.ts'
import { addDays, formatDay, type DayKey } from '../../domain/day.ts'
import { itemsForDay, type DayItem } from '../../domain/habits.ts'
import { streak } from '../../domain/streaks.ts'
import { useToday } from '../../hooks/useToday.ts'
import { describeProgress, describeStreak } from '../habits/describe.ts'
import { HabitActions } from './HabitActions.tsx'
import { HabitRow } from './HabitRow.tsx'

const dayPattern = /^\d{4}-\d{2}-\d{2}$/

export function TodayPage() {
  const data = useHabitData()
  const today = useToday(data?.settings.dayStartMinutes, data?.settings.timeZone)
  const [params, setParams] = useSearchParams()
  const requested = params.get('tag')
  // Past days can be filled in; the future cannot.
  const day = requested && dayPattern.test(requested) && requested < today ? requested : today

  if (!data) return null
  const goTo = (target: DayKey) => setParams(target === today ? {} : { tag: target }, { replace: true })
  return <DayView data={data} day={day} today={today} goTo={goTo} />
}

type Group = { id: string; name: string | null; items: DayItem[] }

/** Items arrive sorted by category, so neighbours form the groups. */
function groupByCategory(items: DayItem[], data: HabitData): Group[] {
  const names = new Map(data.categories.map((category) => [category.id, category.name]))
  const groups: Group[] = []
  for (const item of items) {
    const id = item.habit.categoryId && names.has(item.habit.categoryId) ? item.habit.categoryId : ''
    let group = groups.at(-1)
    if (!group || group.id !== id) {
      group = { id, name: names.get(id) ?? null, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}

function tapMessage(item: DayItem): string {
  const { habit, schedule, state } = item
  if (state.skipped) return `„${habit.name}“ nicht mehr ausgesetzt`
  if (schedule.target > 1) return `${habit.name}: ${state.count + 1} von ${schedule.target}`
  return state.count >= 1 ? `„${habit.name}“ nicht mehr erledigt` : `„${habit.name}“ erledigt`
}

function DayView({ data, day, today, goTo }: { data: HabitData; day: DayKey; today: DayKey; goTo: (day: DayKey) => void }) {
  const session = useSession()
  const showUndo = useUndo()
  const [justTicked, setJustTicked] = useState<string | null>(null)
  const [actionsFor, setActionsFor] = useState<DayItem | null>(null)

  const items = useMemo(() => itemsForDay(data.habits, data.states, day), [data, day])
  const groups = groupByCategory(items, data)
  const showGroupNames = groups.some((group) => group.name !== null)
  const doneCount = items.filter((item) => item.done).length
  const isToday = day === today

  const skipEventsOf = (habitId: string) =>
    data.events.filter((event) => event.habitId === habitId && event.day === day && event.type === 'skip' && !event.deleted)

  async function onTap(item: DayItem) {
    const willBeDone =
      !item.state.skipped && !(item.schedule.target === 1 && item.state.count >= 1) && item.state.count + 1 >= item.schedule.target
    const message = tapMessage(item)
    const undo = await tap(store, item, day, skipEventsOf(item.habit.id))
    setJustTicked(willBeDone ? item.habit.id : null)
    showUndo(message, undo)
  }

  const stillLoading = session.status === 'signedIn' && !session.firstSyncDone && data.allHabits.length === 0

  return (
    <>
      <PageHeader
        hero
        title={formatDay(day, { weekday: 'long' })}
        subtitle={
          <div className="mt-1 flex items-center gap-1">
            <p className="mr-1 text-title text-muted">{formatDay(day, { day: 'numeric', month: 'long' })}</p>
            <button type="button" onClick={() => goTo(addDays(day, -1))} aria-label="Vorheriger Tag" className="grid size-10 place-items-center rounded-lg text-muted hover:text-fg">
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => goTo(addDays(day, 1))}
              disabled={isToday}
              aria-label="Nächster Tag"
              className="grid size-10 place-items-center rounded-lg text-muted hover:text-fg disabled:invisible"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        }
      />

      {!isToday && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-rule bg-sheet py-2 pr-2 pl-4">
          <p className="text-small">Du trägst für {formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })} nach.</p>
          <button type="button" onClick={() => goTo(today)} className="h-10 shrink-0 rounded-lg px-3 text-small font-semibold">
            Zu heute
          </button>
        </div>
      )}

      {items.length > 0 && (
        <p className="mb-2 text-small text-muted">{doneCount === items.length ? 'Alles erledigt.' : `${doneCount} von ${items.length} erledigt`}</p>
      )}

      {groups.map((group) => (
        <section key={group.id} aria-label={group.name ?? 'Ohne Kategorie'} className="mb-4">
          {showGroupNames && <h2 className="mt-4 text-small font-semibold text-muted">{group.name ?? 'Sonstiges'}</h2>}
          <ul>
            {group.items.map((item) => (
              <HabitRow
                key={item.habit.id}
                item={item}
                detail={[describeProgress(item), describeStreak(streak(item.habit, data.states, today), item.schedule.frequency)]
                  .filter(Boolean)
                  .join(', ') || null}
                justTicked={justTicked === item.habit.id}
                onTap={() => void onTap(item)}
                onMore={() => setActionsFor(item)}
              />
            ))}
          </ul>
        </section>
      ))}

      {stillLoading && <p className="text-muted">Deine Daten werden geladen …</p>}
      {!stillLoading && data.habits.length === 0 && (
        <div>
          <p className="mb-4 text-muted">Noch keine Gewohnheiten.</p>
          <Link to="/gewohnheiten/neu" className={primaryButton}>
            <Plus size={20} />
            Gewohnheit anlegen
          </Link>
        </div>
      )}
      {data.habits.length > 0 && items.length === 0 && <p className="text-muted">Für diesen Tag ist nichts geplant.</p>}

      {data.habits.length > 0 && (
        <Link to="/gewohnheiten" className={`${quietButton} -ml-3 mt-4`}>
          Gewohnheiten bearbeiten
        </Link>
      )}

      <HabitActions
        item={actionsFor}
        day={day}
        isToday={isToday}
        skipEvents={actionsFor ? skipEventsOf(actionsFor.habit.id) : []}
        onClose={() => setActionsFor(null)}
        onUndoable={showUndo}
      />
    </>
  )
}

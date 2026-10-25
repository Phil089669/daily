import { useNavigate } from 'react-router'
import { Sheet, SheetButton } from '../../components/Sheet.tsx'
import { changeCount, skipDay, unskipDay, type Undo } from '../../data/actions.ts'
import type { HabitEventRecord } from '../../data/db.ts'
import { store } from '../../data/instance.ts'
import type { DayKey } from '../../domain/day.ts'
import type { DayItem } from '../../domain/habits.ts'

type Props = {
  item: DayItem | null
  day: DayKey
  isToday: boolean
  skipEvents: HabitEventRecord[]
  onClose: () => void
  onUndoable: (message: string, undo: Undo) => void
}

export function HabitActions({ item, day, isToday, skipEvents, onClose, onUndoable }: Props) {
  const navigate = useNavigate()

  async function run(action: () => Promise<Undo>, message: string) {
    onClose()
    onUndoable(message, await action())
  }

  const name = item?.habit.name ?? ''
  const count = item?.state.count ?? 0
  const target = item?.schedule.target ?? 1

  return (
    <Sheet open={item !== null} onClose={onClose} title={name}>
      {item && (
        <div>
          {target > 1 && count > 0 && (
            <>
              <SheetButton onClick={() => run(() => changeCount(store, item.habit.id, day, -1), `${name}: ${count - 1} von ${target}`)}>
                Eins abziehen
              </SheetButton>
              <SheetButton onClick={() => run(() => changeCount(store, item.habit.id, day, -count), `${name}: zurück auf 0`)}>
                Auf 0 setzen
              </SheetButton>
            </>
          )}
          {item.state.skipped ? (
            <SheetButton onClick={() => run(() => unskipDay(store, skipEvents), `„${name}“ nicht mehr ausgesetzt`)}>
              Nicht mehr aussetzen
            </SheetButton>
          ) : (
            <SheetButton onClick={() => run(() => skipDay(store, item.habit.id, day), `„${name}“ ausgesetzt`)}>
              {isToday ? 'Heute aussetzen' : 'Diesen Tag aussetzen'}
            </SheetButton>
          )}
          <SheetButton
            onClick={() => {
              onClose()
              void navigate(`/statistik/${item.habit.id}`)
            }}
          >
            Statistik ansehen
          </SheetButton>
          <SheetButton
            onClick={() => {
              onClose()
              void navigate(`/gewohnheiten/${item.habit.id}`)
            }}
          >
            Bearbeiten
          </SheetButton>
        </div>
      )}
    </Sheet>
  )
}

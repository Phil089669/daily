import { Link, useParams } from 'react-router'
import { Heatmap, HeatmapLegend } from '../../components/Heatmap.tsx'
import { PageHeader } from '../../components/PageHeader.tsx'
import { secondaryButton, sectionTitle } from '../../components/styles.ts'
import { useHabitData } from '../../data/hooks.ts'
import { habitHeatmap, habitRate } from '../../domain/stats.ts'
import { streak } from '../../domain/streaks.ts'
import { useToday } from '../../hooks/useToday.ts'
import { describeSchedule, streakUnit } from '../habits/describe.ts'
import { heatmapStart, periods } from './periods.ts'
import { RateGrid } from './RateGrid.tsx'

export function HabitStatsPage() {
  const { id } = useParams()
  const data = useHabitData()
  const today = useToday(data?.settings.dayStartMinutes, data?.settings.timeZone)
  if (!data) return null
  const habit = data.allHabits.find((candidate) => candidate.id === id)
  if (!habit) {
    return (
      <>
        <PageHeader title="Statistik" back="/statistik" />
        <p className="text-muted">Diese Gewohnheit gibt es nicht mehr.</p>
      </>
    )
  }

  const current = habit.schedules[habit.schedules.length - 1]
  const { states } = data
  const habitStreak = streak(habit, states, today)
  const rates = periods(today).map(({ label, from, to }) => ({ label, rate: habitRate(habit, states, from, to, today) }))

  return (
    <>
      <PageHeader title={habit.name} subtitle={describeSchedule(current)} back="/statistik" />

      <section aria-label="Streak" className="mb-10 flex flex-wrap items-end gap-x-8 gap-y-2">
        <p>
          <span className="block text-display font-bold">{habitStreak.current}</span>
          <span className="block text-small text-muted">
            {streakUnit(habitStreak.current, habitStreak.unit, current.frequency)} in Folge
          </span>
        </p>
        <p className="pb-0.5 text-small text-muted">
          Rekord: {habitStreak.longest} {streakUnit(habitStreak.longest, habitStreak.unit, current.frequency)}
        </p>
      </section>

      <section aria-labelledby="rates" className="mb-10">
        <h2 id="rates" className={sectionTitle}>
          Erfüllungsquote
        </h2>
        <RateGrid rates={rates} />
      </section>

      <section aria-labelledby="year" className="mb-10">
        <h2 id="year" className={sectionTitle}>
          Letzte zwölf Monate
        </h2>
        <Heatmap cells={habitHeatmap(habit, states, heatmapStart(today), today)} label={`Heatmap für ${habit.name}`} />
        <HeatmapLegend />
      </section>

      <Link to={`/gewohnheiten/${habit.id}`} className={secondaryButton}>
        Bearbeiten
      </Link>
    </>
  )
}

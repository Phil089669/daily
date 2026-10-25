import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Heatmap, HeatmapLegend } from '../../components/Heatmap.tsx'
import { PageHeader } from '../../components/PageHeader.tsx'
import { sectionTitle } from '../../components/styles.ts'
import { useHabitData } from '../../data/hooks.ts'
import { addRates, habitRate, overallHeatmap } from '../../domain/stats.ts'
import { streak } from '../../domain/streaks.ts'
import { useToday } from '../../hooks/useToday.ts'
import { describeStreak } from '../habits/describe.ts'
import { heatmapStart, percent, periods } from './periods.ts'
import { RateGrid } from './RateGrid.tsx'

export function StatsPage() {
  const data = useHabitData()
  const today = useToday(data?.settings.dayStartMinutes, data?.settings.timeZone)
  if (!data) return null
  const { allHabits, states } = data

  if (allHabits.length === 0) {
    return (
      <>
        <PageHeader title="Statistik" />
        <p className="text-muted">Sobald du Gewohnheiten abhakst, siehst du hier Quoten, Streaks und die Heatmap.</p>
      </>
    )
  }

  const rates = periods(today).map(({ label, from, to }) => ({
    label,
    rate: addRates(allHabits.map((habit) => habitRate(habit, states, from, to, today))),
  }))
  const [, , thisMonth] = periods(today)

  return (
    <>
      <PageHeader title="Statistik" />

      <section aria-labelledby="overall" className="mb-10">
        <h2 id="overall" className={sectionTitle}>
          Alle Gewohnheiten
        </h2>
        <RateGrid rates={rates} />
        <div className="mt-6">
          <Heatmap cells={overallHeatmap(allHabits, states, heatmapStart(today), today)} label="Heatmap aller Gewohnheiten der letzten zwölf Monate" />
          <HeatmapLegend />
        </div>
      </section>

      <section aria-labelledby="single">
        <h2 id="single" className={sectionTitle}>
          Einzeln
        </h2>
        <ul>
          {allHabits.map((habit) => {
            const current = habit.schedules[habit.schedules.length - 1]
            const streakText = describeStreak(streak(habit, states, today), current.frequency)
            const monthRate = percent(habitRate(habit, states, thisMonth.from, thisMonth.to, today))
            return (
              <li key={habit.id} className="border-b border-rule/70 last:border-b-0">
                <Link to={`/statistik/${habit.id}`} className="flex min-h-16 items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block">{habit.name}</span>
                    <span className="block text-small text-muted">
                      {[habit.archived ? 'archiviert' : null, streakText, `Monat ${monthRate}`].filter(Boolean).join(', ')}
                    </span>
                  </span>
                  <ChevronRight size={20} className="shrink-0 text-muted" />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}

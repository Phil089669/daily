import { useEffect, useState } from 'react'
import { DEFAULT_DAY_START_MINUTES, logicalDay, type DayKey } from '../domain/day.ts'

/** Today's logical day. Moves on at the day start, also when the app stays open or wakes from the background. */
export function useToday(dayStartMinutes = DEFAULT_DAY_START_MINUTES, timeZone?: string): DayKey {
  const [today, setToday] = useState(() => logicalDay(new Date(), dayStartMinutes, timeZone))

  useEffect(() => {
    const update = () => setToday(logicalDay(new Date(), dayStartMinutes, timeZone))
    // Settings may load after the first render.
    const initial = setTimeout(update, 0)
    const timer = setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearTimeout(initial)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [dayStartMinutes, timeZone])

  return today
}

export type Clock = {
  /** A timestamp later than every one handed out or observed before. */
  next(): string
  /** Moves past a timestamp seen elsewhere, so an edit made after seeing a version always wins against it. */
  observe(timestamp: string): void
}

/** ISO timestamps that never repeat or go backwards, even when device clocks disagree a little. */
export function createClock(now: () => number = Date.now): Clock {
  let last = 0
  return {
    next() {
      last = Math.max(now(), last + 1)
      return new Date(last).toISOString()
    },
    observe(timestamp) {
      const time = Date.parse(timestamp)
      if (Number.isFinite(time)) last = Math.max(last, time)
    },
  }
}

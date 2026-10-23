// Pure date and progress math, kept free of React so it can be tested with plain Node.

export type Topic = { id: string; name: string; mastery: number; lessons: number }
export type Point = { date: string; mastery: number }

const DAY = 86_400_000

// Local calendar date (YYYY-MM-DD); toISOString would shift to UTC and drift a day in the evening.
export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export const today = () => isoDate()

export function daysUntil(date: string, from = new Date()) {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  return Math.round((new Date(date + "T00:00:00").getTime() - start.getTime()) / DAY)
}

export const average = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)

const clamp = (n: number) => Math.min(100, Math.max(0, n))

// Readiness is the mean topic mastery once topics exist; before that the prep keeps its own score.
export function readiness(p: { mastery: number; topics?: Topic[] }) {
  return p.topics?.length ? average(p.topics.map((t) => t.mastery)) : p.mastery
}

// Projects the pace of the last 14 days forward to the exam date.
export function forecast(current: number, history: Point[], examDate: string, now = new Date()) {
  const since = isoDate(new Date(now.getTime() - 14 * DAY))
  const base = history.find((h) => h.date >= since && h.date < isoDate(now))
  if (!base) return current
  const rate = (current - base.mastery) / Math.max(1, -daysUntil(base.date, now))
  return clamp(Math.round(current + rate * Math.max(0, daysUntil(examDate, now))))
}

// Keeps one snapshot per day (the latest) so the forecast has a clean series.
export function withSnapshot(history: Point[] = [], mastery: number, date = today()) {
  return [...history.filter((h) => h.date !== date), { date, mastery }].slice(-90)
}

export const bump = (mastery: number, by: number) => clamp(mastery + by)

// A quiz score pulls mastery halfway toward the result, so one test doesn't erase prior work.
export const blend = (mastery: number, score: number) => clamp(Math.round((mastery + score) / 2))

export function longestStreak(dates: string[]) {
  const days = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  days.forEach((d, i) => {
    run = i > 0 && daysUntil(d, new Date(days[i - 1] + "T00:00:00")) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

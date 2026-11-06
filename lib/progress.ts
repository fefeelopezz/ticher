// Pure date and progress math, kept free of React so it can be tested with plain Node.

import type { Card, ExamPrep } from "./store"

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

// A 0-100 score earns 0-10 points: a perfect quiz, exam or finished summary adds 10%.
export const earn = (mastery: number, score: number) => bump(mastery, Math.round(Math.min(100, Math.max(0, score)) / 10))

// Days in a row with activity, ending today; yesterday still counts so the streak isn't lost before studying today.
export function currentStreak(dates: string[], now = new Date()) {
  const days = new Set(dates)
  const step = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
  let cursor = days.has(isoDate(now)) ? now : step(now)
  let run = 0
  while (days.has(isoDate(cursor))) {
    run++
    cursor = step(cursor)
  }
  return run
}

// Spaced repetition: "Repasar" brings a card back tomorrow; each "Lo sabía" waits longer (3, 7, 15, 30 days).
export const REVIEW_DAYS = [1, 3, 7, 15, 30]
export type Review = { due: string; step: number }

export function nextReview(prev: Review | undefined, knew: boolean, now = new Date()): Review {
  const step = knew ? Math.min((prev?.step ?? 0) + 1, REVIEW_DAYS.length - 1) : 0
  return { step, due: isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + REVIEW_DAYS[step])) }
}

// Cards never reviewed are due too: they need their first pass.
export const isDue = (review: Review | undefined, date = today()) => !review || review.due <= date

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

export const DEFAULT_GOAL = 75

export const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Every flashcard of an exam (its shared deck plus each topic's saved decks), without repeats.
export function allCards(p: ExamPrep): Card[] {
  const decks = [p.cards ?? [], ...(p.savedLessons ?? []).flatMap((l) => (l.kind === "cards" ? [l.cards] : []))]
  const seen = new Set<string>()
  return decks.flat().filter((c) => !seen.has(c.front) && seen.add(c.front))
}

export type StudyTask = {
  key: string
  kind: "topics" | "cards" | "mistakes" | "read" | "practice"
  title: string
  exam: string
  days: number
  href: string
}

const MAX_TASKS = 6
const plural = (n: number, word: string, ending = "s") => `${n} ${word}${n === 1 ? "" : ending}`

// One exam's next steps: due cards keep what was learned, past mistakes come next, then the first topic under the goal.
function examTasks(p: ExamPrep, days: number, date: string): StudyTask[] {
  const base = { exam: p.name, days }
  const page = `/exams/${p.id}`
  const topics = p.topics ?? []
  if (!topics.length) return [{ ...base, key: `${p.id}:topics`, kind: "topics", title: "Armar los temas del examen", href: page }]

  const tasks: StudyTask[] = []
  const due = allCards(p).filter((c) => isDue(p.reviews?.[c.front], date)).length
  if (due) tasks.push({ ...base, key: `${p.id}:cards`, kind: "cards", title: `Repasar ${plural(due, "tarjeta")}`, href: `${page}/review/all` })

  const [worst] = topics
    .map((t) => ({ t, count: (p.mistakes ?? []).filter((q) => same(q.topic, t.name)).length }))
    .sort((a, b) => b.count - a.count)
  if (worst?.count) {
    tasks.push({ ...base, key: `${p.id}:mistakes`, kind: "mistakes", title: `Corregir ${plural(worst.count, "error", "es")} de ${worst.t.name}`, href: `${page}/mistakes/${worst.t.id}` })
  }

  const next = topics.find((t) => t.mastery < (p.goal ?? DEFAULT_GOAL))
  if (next) {
    const read = !p.summaries?.[next.id]?.sections?.length
    tasks.push({
      ...base,
      key: `${p.id}:${next.id}`,
      kind: read ? "read" : "practice",
      title: `${read ? "Leer" : "Practicar"} ${next.name}`,
      href: `${page}/${read ? "summary" : "quiz"}/${next.id}`,
    })
  }
  return tasks
}

// Today's list across all exams, the closest exam first; capped so the day stays doable.
export function todayPlan(preps: ExamPrep[], now = new Date()): StudyTask[] {
  return preps
    .map((p) => ({ p, days: daysUntil(p.date, now) }))
    .filter(({ days }) => days >= 0)
    .sort((a, b) => a.days - b.days)
    .flatMap(({ p, days }) => examTasks(p, days, isoDate(now)))
    .slice(0, MAX_TASKS)
}

// Exam reminder emails go out this many days before the exam.
export const REMINDER_DAYS = [7, 3, 1]

export function examsToRemind<T extends { date: string }>(preps: T[], now = new Date()) {
  return preps.flatMap((p) => {
    const days = daysUntil(p.date, now)
    return REMINDER_DAYS.includes(days) ? [{ prep: p, days }] : []
  })
}

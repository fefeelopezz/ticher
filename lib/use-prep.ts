"use client"

import { useState } from "react"
import { toast } from "sonner"
import { postJson } from "./api"
import { toPayload } from "./files"
import {
  NO_LESSONS,
  NO_PREPS,
  NO_SUBJECTS,
  earn,
  nextReview,
  readiness,
  today,
  useHydrated,
  useStored,
  withSnapshot,
  write,
  type Card,
  type Question,
  type Difficulty,
  type ExamPrep,
  type MockTask,
  type QuizResult,
  type SavedLesson,
  type Subject,
} from "./store"

// Saved lessons live in localStorage with the prep; the cap keeps it well under the browser quota.
const MAX_SAVED_LESSONS = 60
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type Kind = "topics" | "flashcards" | "quiz" | "summary" | "mock" | "grade"
type Options = { topics?: string[]; count?: number; difficulty?: Difficulty; tasks?: MockTask[]; answers?: string[] }

export const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Each scored topic earns points; without topics the prep's own score earns them instead.
export function applyScores(p: ExamPrep, byTopic: Record<string, number>, overall: number): ExamPrep {
  if (!p.topics?.length) return { ...p, mastery: earn(p.mastery, overall) }
  return {
    ...p,
    topics: p.topics.map((t) => {
      const hit = Object.entries(byTopic).find(([name]) => same(name, t.name))
      return hit ? { ...t, mastery: earn(t.mastery, hit[1]) } : t
    }),
  }
}

// Everything a page needs to read one exam prep, change it and ask the AI about it.
export function usePrep(id: string) {
  const [preps, setPreps] = useStored<ExamPrep[]>("preps", NO_PREPS)
  const [subjects] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  const [busy, setBusy] = useState<string | null>(null)
  const hydrated = useHydrated()
  const prep = preps.find((p) => p.id === id)
  const materials = (prep && subjects.find((s) => same(s.name, prep.subject))?.materials) || []

  // Every change re-derives readiness and records today's snapshot for the forecast.
  function update(fn: (p: ExamPrep) => ExamPrep) {
    setPreps((all) =>
      all.map((p) => {
        if (p.id !== id) return p
        const changed = fn(p)
        const mastery = readiness(changed)
        return { ...changed, mastery, history: withSnapshot(changed.history, mastery) }
      })
    )
  }

  async function generate<T>(kind: Kind, options: Options = {}, busyKey: string = kind): Promise<T | undefined> {
    if (!prep) return
    setBusy(busyKey)
    try {
      const { files, skipped } = await toPayload(materials)
      if (skipped.length) toast.info(`No se enviaron a la IA: ${skipped.join(", ")} (formato no compatible o muy grande).`)
      const exam = { name: prep.name, subject: prep.subject }
      if (kind === "grade") return await postJson<T>("/api/grade", { exam, tasks: options.tasks, answers: options.answers, files })
      const topics = options.topics ?? (prep.topics ?? []).map((t) => t.name)
      return await postJson<T>("/api/generate", { kind, exam, ...options, topics, files })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  function recordQuiz(result: QuizResult) {
    update((p) => ({
      ...applyScores(p, result.byTopic, result.accuracy),
      quizzes: [{ date: today(), accuracy: result.accuracy, count: result.count }, ...(p.quizzes ?? [])].slice(0, 30),
      mistakes: trackMistakes(p.mistakes, result),
    }))
    logLesson()
  }

  // Spaced repetition: each answered card gets its next due date.
  function reviewCard(card: Card, knew: boolean) {
    update((p) => ({ ...p, reviews: { ...p.reviews, [card.front]: nextReview(p.reviews?.[card.front], knew) } }))
  }

  // Keeps a topic's new lesson (newest first) and returns its id so the page can open it.
  function saveLesson(lesson: DistributiveOmit<SavedLesson, "id" | "date">) {
    const saved = { ...lesson, id: crypto.randomUUID(), date: today() } as SavedLesson
    update((p) => ({ ...p, savedLessons: [saved, ...(p.savedLessons ?? [])].slice(0, MAX_SAVED_LESSONS) }))
    return saved.id
  }

  function scoreLesson(lessonId: string, score: number) {
    update((p) => ({ ...p, savedLessons: (p.savedLessons ?? []).map((l) => (l.id === lessonId ? { ...l, score } : l)) }))
  }

  return { prep, hydrated, materials, busy, setPreps, update, generate, recordQuiz, saveLesson, scoreLesson, reviewCard }
}

// A finished lesson counts for the streak and the daily goal.
export const logLesson = () => write<string[]>("lessons", NO_LESSONS, (l) => [...l, today()].slice(-500))

const MAX_MISTAKES = 100

// Newly missed questions go first (no repeats); ones answered right this time leave the list.
export function trackMistakes(old: Question[] = [], result: QuizResult) {
  const right = new Set(result.right ?? [])
  const missed = result.missed ?? []
  const missedText = new Set(missed.map((q) => q.question))
  return [...missed, ...old.filter((q) => !missedText.has(q.question))].filter((q) => !right.has(q.question)).slice(0, MAX_MISTAKES)
}

// Every flashcard of an exam (its shared deck plus each topic's saved decks), without repeats.
export function allCards(p: ExamPrep) {
  const decks = [p.cards ?? [], ...(p.savedLessons ?? []).flatMap((l) => (l.kind === "cards" ? [l.cards] : []))]
  const seen = new Set<string>()
  return decks.flat().filter((c) => !seen.has(c.front) && seen.add(c.front))
}

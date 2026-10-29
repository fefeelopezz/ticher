"use client"

import { useState } from "react"
import { toast } from "sonner"
import { postJson } from "./api"
import { toPayload } from "./files"
import {
  NO_PREPS,
  NO_SUBJECTS,
  blend,
  readiness,
  today,
  useHydrated,
  useStored,
  withSnapshot,
  type Difficulty,
  type ExamPrep,
  type MockTask,
  type QuizResult,
  type Subject,
} from "./store"

export type Kind = "topics" | "flashcards" | "quiz" | "summary" | "mock" | "grade"
type Options = { topics?: string[]; count?: number; difficulty?: Difficulty; tasks?: MockTask[]; answers?: string[] }

export const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Moves each topic toward its score; without topics the prep's own score moves instead.
export function applyScores(p: ExamPrep, byTopic: Record<string, number>, overall: number): ExamPrep {
  if (!p.topics?.length) return { ...p, mastery: blend(p.mastery, overall) }
  return {
    ...p,
    topics: p.topics.map((t) => {
      const hit = Object.entries(byTopic).find(([name]) => same(name, t.name))
      return hit ? { ...t, mastery: blend(t.mastery, hit[1]) } : t
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
    }))
  }

  return { prep, hydrated, materials, busy, setPreps, update, generate, recordQuiz }
}

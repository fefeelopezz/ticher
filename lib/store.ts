"use client"

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { today, type Point, type Topic } from "./progress"
import { planSync } from "./sync"

export * from "./progress"

// Subjects observed in Astra AI's i18n bundle (chat.subjects).
export const SUBJECTS = [
  "Matemáticas",
  "Química",
  "Física",
  "Biología",
  "Historia",
  "Geografía",
  "Economía",
  "Filosofía",
  "Psicología",
  "Informática",
  "Español",
  "Inglés",
  "Francés",
  "Alemán",
  "Otro",
]

export type Card = { topic: string; front: string; back: string }

// Multiple choice; `correct` holds every right option (Astra: "Varias respuestas posibles").
export type Question = { topic: string; question: string; options: string[]; correct: number[]; explanation: string }

export type Difficulty = "basico" | "medio" | "avanzado"

export type QuizResult = { byTopic: Record<string, number>; accuracy: number; seconds: number; count: number }

// Astra's "Texto inteligente", as observed in a real lesson: one step per section with text,
// callout boxes, cards, numbered steps and an inline quick check; a short quiz closes the lesson.
export type Callout = { kind: "definicion" | "ejemplo" | "analogia" | "error"; title: string; text: string }

export type SummarySection = {
  title: string
  subtitle: string
  body: string
  callouts: Callout[]
  cards: { title: string; text: string }[]
  steps: { title: string; text: string }[]
  check?: Question
}

// score: the share of checks and final questions answered right, set when the reading is finished.
export type Summary = { title: string; intro: string; sections: SummarySection[]; finalQuiz: Question[]; score?: number }

// Summaries saved before the step layout have no `body`; they are regenerated on open.
export const isCurrentSummary = (s?: Summary): s is Summary =>
  !!s?.sections?.length && s.sections.every((x) => typeof x.body === "string") && Array.isArray(s.finalQuiz)

export type MockTask = { topic: string; prompt: string }
export type MockGrade = { score: number; correct: string; missing: string; solution: string }

// One attempt at Astra's "Examen escrito simulado": written answers graded by the AI.
export type MockAttempt = {
  id: string
  date: string
  limitMin: number | null
  seconds: number
  tasks: MockTask[]
  answers: string[]
  grades: MockGrade[]
  score: number
  strengths: string
  toReview: string
}

// A lesson created from one topic, kept so it can be reopened from that topic's options.
export type SavedLesson = {
  id: string
  topicId: string
  date: string
  score?: number
} & ({ kind: "quiz"; questions: Question[] } | { kind: "cards"; cards: Card[] } | { kind: "written"; attempt: MockAttempt })

export type ExamPrep = {
  id: string
  name: string
  subject: string
  date: string
  mastery: number
  // Added after the first version; older saved preps lack them.
  goal?: number
  topics?: Topic[]
  history?: Point[]
  cards?: Card[]
  summaries?: Record<string, Summary>
  attempts?: MockAttempt[]
  quizzes?: { date: string; accuracy: number; count: number }[]
  savedLessons?: SavedLesson[]
}

export const DEFAULT_GOAL = 75

export type CalendarEvent = {
  id: string
  title: string
  date: string
  subject: string
  note: string
  prepId?: string
}

export type ChatMessage = { role: "user" | "assistant"; content: string }

export type Chat = {
  id: string
  title: string
  subject: string
  messages: ChatMessage[]
  // Photos/files attached in this conversation; bytes live in IndexedDB.
  files: Material[]
  suggestions?: string[]
  updatedAt: number
}

export const NO_CHATS: Chat[] = []
export const NO_MINUTES: Record<string, number> = {}

export type Profile = {
  name: string
  level: string
  socratic: boolean
  // Small square JPEG as a data URL (see lib/avatar.ts); absent until the student picks one.
  photo?: string
}

export type Material = {
  id: string
  name: string
  size: number
  type: string
  // PDFs only: characters of the Markdown copy (0 = scanned, no text; missing = not converted yet).
  markdown?: number
}

export type Subject = {
  id: string
  name: string
  materials: Material[]
}

export const NO_SUBJECTS: Subject[] = []
export const NO_PREPS: ExamPrep[] = []
export const NO_EVENTS: CalendarEvent[] = []
export const NO_LESSONS: string[] = []
export const DEFAULT_PROFILE: Profile = { name: "", level: "Preparatoria", socratic: false }

// Each signed-in user gets their own slice of localStorage, keyed by the readable ticher_user cookie.
// The cookie only separates data on a shared browser; access control is the httpOnly session cookie.
const currentUser = () =>
  typeof document === "undefined" ? "" : decodeURIComponent(document.cookie.match(/(?:^|;\s*)ticher_user=([^;]*)/)?.[1] ?? "")

export const storageKey = (key: string) => {
  const user = currentUser()
  return user ? `ticher.${user}.${key}` : `ticher.${key}`
}

const DATA_KEYS = ["preps", "subjects", "events", "chats", "lessons", "minutes", "profile"]

// Data saved before login existed belongs to whoever signs in first on this browser.
export function adoptLegacyData() {
  for (const key of DATA_KEYS) {
    const legacy = localStorage.getItem(`ticher.${key}`)
    const target = storageKey(key)
    if (legacy === null || target === `ticher.${key}`) continue
    if (localStorage.getItem(target) === null) localStorage.setItem(target, legacy)
    localStorage.removeItem(`ticher.${key}`)
  }
  listeners.forEach((l) => l())
}

export const readStored = <T,>(key: string, initial: T) => parse(localStorage.getItem(storageKey(key)), initial)

const listeners = new Set<() => void>()

// Cloud sync through /api/data (Supabase). localStorage stays the working copy so pages read it
// synchronously; the cloud copy follows the user to other browsers. Keys changed here are "dirty"
// until the server confirms them, so a pull never overwrites edits that haven't been uploaded.
const DIRTY = "__dirty"
const readDirty = () => parse<string[]>(localStorage.getItem(storageKey(DIRTY)), [])
const setDirty = (keys: string[]) => localStorage.setItem(storageKey(DIRTY), JSON.stringify(keys))
let pulledFor: string | null = null
let pushTimer: ReturnType<typeof setTimeout> | undefined
let flushOnLeave = false

async function push(keepalive = false) {
  clearTimeout(pushTimer)
  for (const key of readDirty()) {
    const raw = localStorage.getItem(storageKey(key))
    try {
      if (raw !== null) {
        const res = await fetch("/api/data", {
          method: "PUT",
          keepalive,
          headers: { "Content-Type": "application/json" },
          body: `{"key":${JSON.stringify(key)},"value":${raw}}`,
        })
        // Offline, signed out or Supabase not configured: the key stays dirty for the next try.
        if (!res.ok || !(await res.json()).enabled) return
      }
    } catch {
      return
    }
    // Edited again while uploading: keep it dirty so the newer value goes up too.
    if (localStorage.getItem(storageKey(key)) === raw) setDirty(readDirty().filter((k) => k !== key))
  }
}

async function pull() {
  pulledFor = currentUser()
  try {
    const res = await fetch("/api/data")
    const data = await res.json()
    if (!res.ok || !data.enabled) {
      // Not signed in yet (login page): try again on the next page.
      if (res.status === 401) pulledFor = null
      return
    }
    const items = data.items as { key: string; value: unknown }[]
    const local = DATA_KEYS.filter((k) => localStorage.getItem(storageKey(k)) !== null)
    const plan = planSync(
      items.map((i) => i.key),
      local,
      readDirty()
    )
    for (const item of items) if (plan.apply.includes(item.key)) localStorage.setItem(storageKey(item.key), JSON.stringify(item.value))
    setDirty(plan.push)
    listeners.forEach((l) => l())
    push()
  } catch {
    pulledFor = null
  }
}

function subscribe(cb: () => void) {
  // First subscriber for this user pulls the cloud copy; switching accounts pulls again.
  if (pulledFor !== currentUser()) pull()
  if (!flushOnLeave) {
    flushOnLeave = true
    window.addEventListener("pagehide", () => push(true))
  }
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", cb)
  }
}

export function useStored<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(storageKey(key)),
    () => null
  )
  const value = useMemo(() => parse(raw, initial), [raw, initial])
  const set = useCallback((next: T | ((prev: T) => T)) => write(key, initial, next), [key, initial])
  return [value, set] as const
}

function parse<T>(raw: string | null, initial: T): T {
  if (!raw) return initial
  try {
    return JSON.parse(raw) as T
  } catch {
    return initial
  }
}

// Updaters read the latest stored value, so a slow AI call can't overwrite edits made meanwhile.
export function write<T>(key: string, initial: T, next: T | ((prev: T) => T)) {
  const k = storageKey(key)
  const value = typeof next === "function" ? (next as (prev: T) => T)(parse(localStorage.getItem(k), initial)) : next
  try {
    localStorage.setItem(k, JSON.stringify(value))
  } catch {
    toast.error("No hay espacio en el navegador para guardar esto. Borra conversaciones o materiales viejos.")
    return
  }
  if (!readDirty().includes(key)) setDirty([...readDirty(), key])
  clearTimeout(pushTimer)
  pushTimer = setTimeout(push, 1500)
  listeners.forEach((l) => l())
}

// False during server render and hydration, when localStorage isn't readable yet; use it to avoid
// flashing "not found" states for data that is about to load.
export const useHydrated = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

// Counts a study minute every 60 s while the page is visible (used on the chat and exam pages).
export function useStudyTimer() {
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return
      write<Record<string, number>>("minutes", NO_MINUTES, (m) => ({ ...m, [today()]: (m[today()] ?? 0) + 1 }))
    }, 60_000)
    return () => clearInterval(id)
  }, [])
}

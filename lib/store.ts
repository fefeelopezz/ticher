"use client"

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { today, type Point, type Topic } from "./progress"

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

export type Question = { topic: string; question: string; options: string[]; answer: number; explanation: string }

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
}

export type Material = {
  id: string
  name: string
  size: number
  type: string
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

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", cb)
  }
}

// shortcut: data lives in localStorage per browser, swap for a database once there are real accounts.
export function useStored<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(`ticher.${key}`),
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
  const k = `ticher.${key}`
  const value = typeof next === "function" ? (next as (prev: T) => T)(parse(localStorage.getItem(k), initial)) : next
  try {
    localStorage.setItem(k, JSON.stringify(value))
  } catch {
    toast.error("No hay espacio en el navegador para guardar esto. Borra conversaciones o materiales viejos.")
    return
  }
  listeners.forEach((l) => l())
}

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

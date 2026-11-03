import type { Chat, ExamPrep, Profile } from "./store"

// Turns the raw user_data rows (one per user and key) into one summary per user for the admin panel.
// Pure so Node can test it.
export type Row = { email: string; key: string; value: unknown; updated_at: string; created_at?: string }

export type HistoryItem = { date: string | null; kind: string; topic: string; score: number | null }
export type ExamSummary = {
  name: string
  subject: string
  date: string
  mastery: number
  topics: number
  history: HistoryItem[]
}
export type UserSummary = {
  email: string
  name: string
  level: string
  joined: string
  lastActive: string
  minutes: number
  exams: ExamSummary[]
  chats: { title: string; subject: string; messages: number; updatedAt: string }[]
  lessons: number
}

const LESSON_KIND = { cards: "Tarjetas", quiz: "Cuestionario", written: "Preguntas escritas" } as const

function exam(p: ExamPrep): ExamSummary {
  const topicName = (id: string) => p.topics?.find((t) => t.id === id)?.name ?? "Tema"
  const history: HistoryItem[] = [
    ...(p.savedLessons ?? []).map((l) => ({ date: l.date, kind: LESSON_KIND[l.kind], topic: topicName(l.topicId), score: l.score ?? null })),
    // Smart texts carry no date; they list after the dated items.
    ...Object.entries(p.summaries ?? {}).map(([topicId, s]) => ({ date: null, kind: "Texto inteligente", topic: topicName(topicId), score: s?.score ?? null })),
    ...(p.attempts ?? []).map((a) => ({ date: a.date, kind: "Simulacro escrito", topic: "Varios temas", score: a.score })),
    ...(p.finals ?? []).map((f) => ({ date: f.date, kind: "Examen final", topic: "Todo el temario", score: f.score })),
  ]
  history.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  return { name: p.name, subject: p.subject, date: p.date, mastery: p.mastery ?? 0, topics: p.topics?.length ?? 0, history }
}

export function summarize(rows: Row[]): UserSummary[] {
  const byEmail = new Map<string, Row[]>()
  for (const r of rows) byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), r])

  return [...byEmail].map(([email, own]) => {
    const value = <T,>(key: string) => own.find((r) => r.key === key)?.value as T | undefined
    const profile = value<Profile>("profile")
    const preps = value<ExamPrep[]>("preps") ?? []
    const chats = value<Chat[]>("chats") ?? []
    const exams = preps.map(exam)
    // created_at is the row's first save; older databases only have updated_at, which moves on every sync.
    const firsts = own.map((r) => r.created_at ?? r.updated_at).sort()
    return {
      email,
      name: profile?.name?.trim() || "Sin nombre",
      level: profile?.level ?? "—",
      joined: firsts[0],
      lastActive: own.map((r) => r.updated_at).sort().at(-1)!,
      minutes: Object.values(value<Record<string, number>>("minutes") ?? {}).reduce((a, b) => a + b, 0),
      exams,
      chats: chats.map((c) => ({ title: c.title, subject: c.subject, messages: c.messages?.length ?? 0, updatedAt: new Date(c.updatedAt).toISOString() })),
      lessons: exams.reduce((n, e) => n + e.history.length, 0),
    }
  }).sort((a, b) => b.lastActive.localeCompare(a.lastActive))
}

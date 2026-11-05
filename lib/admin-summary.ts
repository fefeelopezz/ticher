import type { Chat, ExamPrep, Profile } from "./store"

// Turns the raw user_data rows (one per user and key) into one summary per user for the admin panel.
// Pure so Node can test it.
export type Row = { email: string; key: string; value: unknown; updated_at: string; created_at?: string }

// Free-tier requests a day: 20 on the main Gemini model plus 500 on its fallback (lib/ai.ts).
export const AI_DAILY_LIMIT = 520

// Start of Google's quota day, which resets at midnight Pacific time.
// shortcut: on the two daylight-saving change days this can be an hour off; only the counter's edge moves.
export function quotaDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(now)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const elapsed = (part("hour") * 3600 + part("minute") * 60 + part("second")) * 1000 + now.getMilliseconds()
  return new Date(now.getTime() - elapsed)
}

export type Login = { email: string; created_at: string }
export type AiUsage = { email: string; day: number; week: number; total: number; tokens: number }
export type Message = { id: number; email: string; created_at: string; detail: { message: string; page: string; signedIn: boolean } }

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
  // Newest first.
  logins: string[]
  ai: Omit<AiUsage, "email">
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

// Logins are sorted newest first. They also bring in people who signed in but never saved anything.
export function summarize(rows: Row[], logins: Login[] = [], usage: AiUsage[] = []): UserSummary[] {
  const byEmail = new Map<string, Row[]>()
  for (const { email } of logins) byEmail.set(email, [])
  for (const r of rows) byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), r])

  return [...byEmail].map(([email, own]) => {
    const value = <T,>(key: string) => own.find((r) => r.key === key)?.value as T | undefined
    const profile = value<Profile>("profile")
    const preps = value<ExamPrep[]>("preps") ?? []
    const chats = value<Chat[]>("chats") ?? []
    const exams = preps.map(exam)
    // created_at is the row's first save; older databases only have updated_at, which moves on every sync.
    const accesses = logins.filter((l) => l.email === email).map((l) => l.created_at)
    const firsts = [...own.map((r) => r.created_at ?? r.updated_at), ...accesses].sort()
    const { day = 0, week = 0, total = 0, tokens = 0 } = usage.find((u) => u.email === email) ?? {}
    return {
      email,
      name: profile?.name?.trim() || "Sin nombre",
      level: profile?.level ?? "—",
      joined: firsts[0],
      lastActive: [...own.map((r) => r.updated_at), ...accesses].sort().at(-1)!,
      minutes: Object.values(value<Record<string, number>>("minutes") ?? {}).reduce((a, b) => a + b, 0),
      exams,
      chats: chats.map((c) => ({ title: c.title, subject: c.subject, messages: c.messages?.length ?? 0, updatedAt: new Date(c.updatedAt).toISOString() })),
      lessons: exams.reduce((n, e) => n + e.history.length, 0),
      logins: accesses,
      ai: { day, week, total, tokens },
    }
  }).sort((a, b) => b.lastActive.localeCompare(a.lastActive))
}

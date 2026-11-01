import type { ExamPrep } from "./store"

// The exam preps of the chat's subject as plain text, so the tutor can answer about the student's own
// topics, smart texts, saved lessons and mistakes. Pure (no browser APIs) so Node can test it.
// shortcut: everything past MAX_CHARS is cut; send only the topic asked about if preps outgrow this.
export const MAX_CHARS = 60_000

const KIND = { definicion: "Definición", ejemplo: "Ejemplo", analogia: "Analogía", error: "Error común" } as const
const plain = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, "$1")
const pct = (n?: number) => (typeof n === "number" ? `${Math.round(n)}%` : "sin datos")

function one(p: ExamPrep, now: Date) {
  const days = Math.round((new Date(p.date + "T00:00:00").getTime() - new Date(now.toDateString()).getTime()) / 86_400_000)
  const topics = p.topics ?? []
  const topicName = (id: string) => topics.find((t) => t.id === id)?.name ?? "Tema"
  const out = [
    `# Preparación de examen: ${p.name} (${p.subject})`,
    `Fecha del examen: ${p.date} (${days >= 0 ? `faltan ${days} días` : `fue hace ${-days} días`}). Dominio general: ${pct(p.mastery)}, meta: ${pct(p.goal ?? 75)}.`,
  ]

  if (topics.length) {
    out.push("## Temas", ...topics.map((t) => `- ${t.name}: dominio ${pct(t.mastery)}, ${t.lessons} lecciones hechas`))
  }

  const summaries = Object.entries(p.summaries ?? {}).filter(([, s]) => s?.sections?.length)
  if (summaries.length) {
    out.push("## Textos inteligentes")
    for (const [topicId, s] of summaries) {
      out.push(`### ${topicName(topicId)}: ${s.title}${typeof s.score === "number" ? ` (puntaje ${pct(s.score)})` : ""}`, plain(s.intro ?? ""))
      for (const sec of s.sections) {
        out.push(`#### ${sec.title}`, plain(sec.body ?? ""))
        for (const c of sec.callouts ?? []) out.push(`- ${KIND[c.kind] ?? c.kind}, ${c.title}: ${plain(c.text)}`)
        for (const c of sec.cards ?? []) out.push(`- ${c.title}: ${plain(c.text)}`)
        sec.steps?.forEach((st, i) => out.push(`${i + 1}. ${st.title}: ${plain(st.text)}`))
      }
    }
  }

  const lessons = p.savedLessons ?? []
  if (lessons.length) {
    out.push("## Lecciones guardadas")
    for (const l of lessons) {
      const head = `### ${l.date} · ${topicName(l.topicId)}`
      const score = typeof l.score === "number" ? `, puntaje ${pct(l.score)}` : ""
      if (l.kind === "cards") out.push(`${head} · Tarjetas (${l.cards.length})${score}`, ...l.cards.map((c) => `- ${c.front} → ${c.back}`))
      else if (l.kind === "quiz")
        out.push(
          `${head} · Cuestionario (${l.questions.length} preguntas)${score}`,
          ...l.questions.map((q) => `- ${q.question} (correcta: ${q.correct.map((i) => q.options[i]).join(" / ")})`)
        )
      else
        out.push(
          `${head} · Examen escrito, nota ${pct(l.attempt.score)}`,
          ...l.attempt.tasks.map((t, i) => `- ${t.prompt} → nota ${pct(l.attempt.grades[i]?.score)}`)
        )
    }
  }

  if (p.mistakes?.length) {
    out.push("## Errores para repasar", ...p.mistakes.map((q) => `- ${q.question} (correcta: ${q.correct.map((i) => q.options[i]).join(" / ")})`))
  }

  const exams = [
    ...(p.attempts ?? []).map((a) => `- ${a.date}: examen escrito simulado, nota ${pct(a.score)}`),
    ...(p.finals ?? []).map((f) => `- ${f.date}: examen final, nota ${pct(f.score)}`),
  ]
  if (exams.length) out.push("## Exámenes rendidos", ...exams)

  return out.filter(Boolean).join("\n")
}

export function prepContext(preps: ExamPrep[], now = new Date()) {
  const text = preps.map((p) => one(p, now)).join("\n\n")
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "\n[…recortado]" : text
}

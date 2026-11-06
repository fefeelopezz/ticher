// Pure quiz helpers shared by the API (cleaning AI output) and the quiz UI (scoring). No React, so Node can test it.

export type Raw = { topic: string; question: string; options: string[]; correct: number[]; explanation: string }

// Structured output guarantees the shape, not the values: keep only questions whose answer key makes sense.
export function cleanQuestions<T extends Raw>(questions: T[]): T[] {
  return questions.flatMap((q) => {
    const correct = [...new Set(q.correct)].filter((i) => Number.isInteger(i) && i >= 0 && i < q.options.length).sort((a, b) => a - b)
    const ok = q.question.trim() && q.options.length >= 2 && correct.length > 0 && correct.length < q.options.length
    return ok ? [{ ...q, correct }] : []
  })
}

// The AI can invent a citation, so one only stays if it names a file it was really given.
export function keepSource(source: string, fileNames: string[]) {
  const text = source.trim()
  const named = fileNames.map((n) => n.replace(/\.[^.]+$/, "").trim().toLowerCase()).filter(Boolean)
  return named.some((n) => text.toLowerCase().includes(n)) ? text : ""
}

// A multiple-answer question only counts as right when the chosen set matches exactly.
export const isRight = (correct: number[], chosen: number[]) =>
  correct.length === chosen.length && correct.every((i) => chosen.includes(i))

// Percent right per topic, used to move each topic's mastery after a quiz.
export function scoreByTopic(questions: { topic: string; correct: number[] }[], chosen: number[][]) {
  const tally: Record<string, { right: number; count: number }> = {}
  questions.forEach((q, i) => {
    const t = (tally[q.topic] ??= { right: 0, count: 0 })
    t.count++
    if (isRight(q.correct, chosen[i] ?? [])) t.right++
  })
  return Object.fromEntries(Object.entries(tally).map(([topic, t]) => [topic, Math.round((t.right / t.count) * 100)]))
}

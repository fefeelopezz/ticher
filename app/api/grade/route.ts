import { z } from "zod"
import { FileSchema, aiErrorResponse, ask, fileParts, tooLarge } from "@/lib/ai"
import { getSession, unauthorized } from "@/lib/auth"

const Body = z
  .object({
    exam: z.object({ name: z.string().min(1).max(80), subject: z.string().max(40) }),
    tasks: z.array(z.object({ topic: z.string().max(120), prompt: z.string().min(1).max(2000) })).min(1).max(15),
    answers: z.array(z.string().max(6000)),
    files: z.array(FileSchema).max(20).default([]),
  })
  .refine((b) => b.answers.length === b.tasks.length, "One answer per task")

const Grades = z.object({
  grades: z
    .array(
      z.object({
        score: z.number().describe("Puntaje de 0 a 100 de esta respuesta"),
        correct: z.string().describe("Qué está bien en la respuesta (vacío si nada)"),
        missing: z.string().describe("Qué falta o está mal (vacío si nada)"),
        solution: z.string().describe("Respuesta modelo breve"),
      })
    )
    .describe("Una calificación por tarea, en el mismo orden"),
  strengths: z.string().describe("Buen dominio: qué demuestra saber el estudiante, 1-2 frases"),
  toReview: z.string().describe("Por repasar: qué estudiar a continuación, 1-2 frases"),
})

export async function POST(request: Request) {
  if (!(await getSession())) return unauthorized()
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: "Solicitud inválida." }, { status: 400 })
  const { exam, tasks, answers, files } = body.data
  if (tooLarge(files)) return Response.json({ error: "Los archivos son demasiado grandes para enviarlos juntos." }, { status: 413 })

  const system =
    "Eres Ticher, un profesor que califica exámenes escritos en español con justicia y de forma constructiva. Usa el material adjunto como referencia cuando exista. Una respuesta vacía o sin relación vale 0."
  const text = [
    `Examen: "${exam.name}" (${exam.subject}). Califica cada respuesta:`,
    ...tasks.map((t, i) => `\n### Tarea ${i + 1} (${t.topic})\n${t.prompt}\n--- Respuesta del estudiante ---\n${answers[i].trim() || "(sin respuesta)"}`),
  ].join("\n")

  try {
    const out = await ask(Grades, system, [{ role: "user", parts: [...fileParts(files), { text }] }])
    // Enforce one grade per task in range, even if the model returned too few or out-of-range scores.
    const grades = tasks.map((_, i) => {
      const g = out.grades[i]
      return g
        ? { ...g, score: Math.round(Math.min(100, Math.max(0, g.score))) }
        : { score: 0, correct: "", missing: "No se pudo calificar esta respuesta.", solution: "" }
    })
    const score = Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length)
    return Response.json({ grades, score, strengths: out.strengths, toReview: out.toReview })
  } catch (error) {
    return aiErrorResponse(error)
  }
}

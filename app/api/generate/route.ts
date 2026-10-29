import { z } from "zod"
import { FileSchema, aiErrorResponse, ask, fileParts, tooLarge } from "@/lib/ai"

const Body = z.object({
  kind: z.enum(["topics", "flashcards", "quiz"]),
  exam: z.object({ name: z.string().min(1).max(80), subject: z.string().max(40) }),
  topics: z.array(z.string().max(120)).max(20).default([]),
  files: z.array(FileSchema).max(20).default([]),
})

const Topics = z.object({ topics: z.array(z.string()).describe("Entre 3 y 8 temas del examen, en orden de estudio") })
const Flashcards = z.object({
  cards: z
    .array(z.object({ topic: z.string(), front: z.string(), back: z.string() }))
    .describe("10 tarjetas de memoria; topic es exactamente uno de los temas dados"),
})
const Quiz = z.object({
  questions: z
    .array(
      z.object({
        topic: z.string(),
        question: z.string(),
        options: z.array(z.string()).describe("Exactamente 4 opciones"),
        answer: z.number().int().describe("Índice (0-3) de la opción correcta"),
        explanation: z.string(),
      })
    )
    .describe("8 preguntas de opción múltiple; topic es exactamente uno de los temas dados"),
})

const TASKS = {
  topics: "Divide el contenido del examen en temas de estudio.",
  flashcards: "Crea tarjetas de memoria (pregunta al frente, respuesta breve atrás).",
  quiz: "Crea un examen de práctica de opción múltiple con una sola respuesta correcta por pregunta.",
}

export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: "Solicitud inválida." }, { status: 400 })
  const { kind, exam, topics, files } = body.data
  if (tooLarge(files)) return Response.json({ error: "Los archivos son demasiado grandes para enviarlos juntos." }, { status: 413 })

  const system =
    "Eres Ticher, un tutor que prepara material de estudio en español. Básate en el material adjunto cuando exista; si no hay material, usa el temario típico de la materia."
  const text = [
    `Examen: "${exam.name}" (${exam.subject}).`,
    topics.length > 0 && `Temas: ${topics.join("; ")}.`,
    TASKS[kind],
  ]
    .filter(Boolean)
    .join("\n")
  const contents = [{ role: "user", parts: [...fileParts(files), { text }] }]

  try {
    if (kind === "topics") {
      const out = await ask(Topics, system, contents)
      return Response.json({ topics: out.topics.map((t) => t.trim()).filter(Boolean).slice(0, 8) })
    }
    if (kind === "flashcards") {
      const out = await ask(Flashcards, system, contents)
      return Response.json({ cards: out.cards.slice(0, 20) })
    }
    const out = await ask(Quiz, system, contents)
    // Structured output guarantees the shape, not the values: drop questions with a broken answer key.
    const questions = out.questions.filter((q) => q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length)
    return Response.json({ questions: questions.slice(0, 15) })
  } catch (error) {
    return aiErrorResponse(error)
  }
}

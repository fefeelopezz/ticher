import { z } from "zod"
import { FileSchema, aiErrorResponse, ask, fileParts, tooLarge } from "@/lib/ai"
import { getSession, unauthorized } from "@/lib/auth"
import { cleanQuestions } from "@/lib/grading"

const Body = z.object({
  kind: z.enum(["topics", "flashcards", "quiz", "summary", "mock"]),
  exam: z.object({ name: z.string().min(1).max(80), subject: z.string().max(40) }),
  topics: z.array(z.string().max(120)).max(20).default([]),
  count: z.number().int().min(1).max(15).default(8),
  difficulty: z.enum(["basico", "medio", "avanzado"]).default("medio"),
  files: z.array(FileSchema).max(20).default([]),
})

const Topics = z.object({ topics: z.array(z.string()).describe("Entre 3 y 8 temas del examen, en orden de estudio") })

const Flashcards = z.object({
  cards: z
    .array(z.object({ topic: z.string(), front: z.string(), back: z.string() }))
    .describe("10 tarjetas de memoria; topic es exactamente uno de los temas dados"),
})

const Quiz = z.object({
  questions: z.array(
    z.object({
      topic: z.string().describe("Exactamente uno de los temas dados"),
      question: z.string(),
      options: z.array(z.string()).describe("Exactamente 4 opciones"),
      correct: z.array(z.number().int()).describe("Índices (0-3) de TODAS las opciones correctas"),
      explanation: z.string().describe("Por qué esa es la respuesta, en 1-3 frases"),
    })
  ),
})

const Check = z.object({
  question: z.string(),
  options: z.array(z.string()).describe("Exactamente 4 opciones"),
  correct: z.array(z.number().int()).describe("Índices (0-3) de las opciones correctas; normalmente una"),
  explanation: z.string().describe("Por qué, citando lo explicado en la sección"),
})

const Summary = z.object({
  title: z.string(),
  intro: z.string().describe("1-2 frases que presentan el tema"),
  sections: z
    .array(
      z.object({
        title: z.string().describe("Título corto de la sección"),
        subtitle: z.string().describe("Subtítulo opcional; cadena vacía si no hace falta"),
        body: z.string().describe("2-4 frases claras; marca los términos clave con **negrita**"),
        callouts: z
          .array(
            z.object({
              kind: z.enum(["definicion", "ejemplo", "analogia", "error"]),
              title: z.string(),
              text: z.string().describe("1-3 frases"),
            })
          )
          .describe("0 a 2 recuadros: una definición, un ejemplo, una analogía cotidiana o un error común"),
        cards: z
          .array(z.object({ title: z.string(), text: z.string() }))
          .describe("0 o 3-4 tarjetas cortas con ejemplos o casos; vacío si no aplica"),
        steps: z
          .array(z.object({ title: z.string(), text: z.string() }))
          .describe("0 o 3-5 pasos numerados para un procedimiento; vacío si no aplica"),
        check: Check.describe("Una pregunta rápida sobre esta sección"),
      })
    )
    .describe("3 a 5 secciones; varía los bloques entre secciones"),
  finalQuiz: z.array(Check).describe("3 preguntas finales que integran todo el tema"),
})

const Mock = z.object({
  tasks: z
    .array(z.object({ topic: z.string().describe("Exactamente uno de los temas dados"), prompt: z.string() }))
    .describe("Tareas de desarrollo que se responden por escrito en 3-8 líneas"),
})

const LEVEL = { basico: "básica", medio: "media", avanzado: "avanzada" }

export async function POST(request: Request) {
  if (!(await getSession())) return unauthorized()
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: "Solicitud inválida." }, { status: 400 })
  const { kind, exam, topics, count, difficulty, files } = body.data
  if (tooLarge(files)) return Response.json({ error: "Los archivos son demasiado grandes para enviarlos juntos." }, { status: 413 })
  if ((kind === "summary" || kind === "mock") && topics.length === 0) {
    return Response.json({ error: "Elige al menos un tema." }, { status: 400 })
  }

  const task = {
    topics: "Divide el contenido del examen en temas de estudio.",
    flashcards: "Crea tarjetas de memoria (pregunta al frente, respuesta breve atrás).",
    quiz: `Crea ${count} preguntas de opción múltiple de dificultad ${LEVEL[difficulty]}, repartidas entre los temas. Cada una con 4 opciones. La mayoría tiene una sola respuesta correcta; alrededor de 1 de cada 4 tiene 2 correctas.`,
    summary: `Crea una lección de lectura ("texto inteligente") sobre el tema "${topics[0]}": título, introducción breve y de 3 a 5 secciones que avancen de lo básico a lo complejo, cada una con una pregunta rápida, más 3 preguntas finales.`,
    mock: `Crea un examen escrito de ${count} tareas de desarrollo de dificultad ${LEVEL[difficulty]}, repartidas entre los temas, como las de un examen real.`,
  }[kind]

  const system =
    "Eres Ticher, un tutor que prepara material de estudio en español. Básate en el material adjunto cuando exista; si no hay material, usa el temario típico de la materia."
  const text = [`Examen: "${exam.name}" (${exam.subject}).`, topics.length > 0 && `Temas: ${topics.join("; ")}.`, task]
    .filter(Boolean)
    .join("\n")
  const contents = [{ role: "user", parts: [...fileParts(files), { text }] }]

  try {
    switch (kind) {
      case "topics": {
        const out = await ask(Topics, system, contents)
        return Response.json({ topics: out.topics.map((t) => t.trim()).filter(Boolean).slice(0, 8) })
      }
      case "flashcards": {
        const out = await ask(Flashcards, system, contents)
        return Response.json({ cards: out.cards.slice(0, 20) })
      }
      case "quiz": {
        const out = await ask(Quiz, system, contents)
        return Response.json({ questions: cleanQuestions(out.questions).slice(0, count) })
      }
      case "summary": {
        const out = await ask(Summary, system, contents)
        const topic = topics[0]
        // Checks reuse the quiz cleaner; a section whose check is unusable keeps its content without one.
        const sections = out.sections.map((s) => ({ ...s, check: cleanQuestions([{ ...s.check, topic }])[0] }))
        const finalQuiz = cleanQuestions(out.finalQuiz.map((q) => ({ ...q, topic })))
        return Response.json({ summary: { title: out.title, intro: out.intro, sections, finalQuiz } })
      }
      case "mock": {
        const out = await ask(Mock, system, contents)
        return Response.json({ tasks: out.tasks.filter((t) => t.prompt.trim()).slice(0, count) })
      }
    }
  } catch (error) {
    return aiErrorResponse(error)
  }
}

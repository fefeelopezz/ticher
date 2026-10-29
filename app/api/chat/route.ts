import { z } from "zod"
import { FileSchema, aiErrorResponse, ask, fileParts, tooLarge } from "@/lib/ai"

const Body = z.object({
  subject: z.string().max(40).default("Otro"),
  name: z.string().max(40).default(""),
  socratic: z.boolean().default(false),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(60)
    // zod v4 still runs refine after min(1) fails, so guard the empty array.
    .refine((m) => m[0]?.role === "user" && m.at(-1)?.role === "user", "Conversation must start and end with the student"),
  files: z.array(FileSchema).max(20).default([]),
})

const Reply = z.object({
  reply: z.string().describe("Respuesta para el estudiante, en español. Cada paso, punto de lista o párrafo va en su propia línea (separados con \\n)."),
  suggestions: z.array(z.string()).describe("Hasta 3 preguntas cortas de seguimiento que el estudiante podría hacer"),
})

export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: "Mensaje inválido." }, { status: 400 })
  const { subject, name, socratic, messages, files } = body.data
  if (tooLarge(files)) return Response.json({ error: "Los archivos son demasiado grandes para enviarlos juntos." }, { status: 413 })

  const system = [
    "Eres Ticher, un tutor de IA para estudiantes. Responde en español, claro y breve, en texto plano sin Markdown; separa pasos y listas con saltos de línea.",
    `Materia: ${subject}.`,
    name && `El estudiante se llama ${name}.`,
    files.length > 0 && "Usa el material de estudio adjunto como fuente principal y dilo cuando algo no esté en el material.",
    socratic
      ? "Modo socrático: nunca des la respuesta final; guía con preguntas y pistas paso a paso."
      : "Explica paso a paso y comprueba que el estudiante entendió.",
  ]
    .filter(Boolean)
    .join(" ")

  try {
    const result = await ask(
      Reply,
      system,
      messages.map((m, i) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: i === 0 ? [...fileParts(files), { text: m.content }] : [{ text: m.content }],
      }))
    )
    return Response.json({ reply: result.reply, suggestions: result.suggestions.slice(0, 3) })
  } catch (error) {
    return aiErrorResponse(error)
  }
}

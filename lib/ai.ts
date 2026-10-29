import { ApiError, GoogleGenAI, type Content, type Part } from "@google/genai"
import { z } from "zod"

// Any Gemini model ID works here; see docs/conectar-ia.md for the options.
export const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash"
// Free-tier models are often "high demand" (503); a lighter model usually still answers.
const BUSY_FALLBACK = "gemini-3.5-flash-lite"

export const FileSchema = z.object({
  name: z.string().max(200),
  type: z.string().max(100),
  data: z.string(),
})
export type FilePayload = z.infer<typeof FileSchema>

// Gemini accepts inline files up to ~20 MB per request; leave room for the rest of the body.
export const MAX_FILES_CHARS = 19_000_000

const INLINE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]

// Study files go first in the conversation; Gemini caches a repeated prefix automatically.
export function fileParts(files: FilePayload[]): Part[] {
  return files.flatMap((f): Part[] => {
    if (INLINE_TYPES.includes(f.type)) return [{ inlineData: { mimeType: f.type, data: f.data } }]
    if (f.type.startsWith("text/") || /\.(md|txt)$/i.test(f.name)) {
      return [{ text: `Archivo "${f.name}":\n${Buffer.from(f.data, "base64").toString("utf8")}` }]
    }
    return []
  })
}

export class AiUnavailable extends Error {}

export async function ask<T extends z.ZodType>(schema: T, system: string, contents: Content[]): Promise<z.infer<T>> {
  if (!process.env.GEMINI_API_KEY) throw new AiUnavailable()
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const request = (model: string) =>
    ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(schema),
      },
    })
  let res
  try {
    res = await request(MODEL)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 503) || MODEL === BUSY_FALLBACK) throw error
    console.warn(`[ai] ${MODEL} busy, retrying with ${BUSY_FALLBACK}`)
    res = await request(BUSY_FALLBACK)
  }
  if (!res.text) throw new Error(`no output (${res.candidates?.[0]?.finishReason ?? res.promptFeedback?.blockReason})`)
  // The schema constrains decoding, but validate anyway: the model's JSON is untrusted input.
  return schema.parse(JSON.parse(res.text))
}

// Maps failures to a short Spanish message for the student; details go to the server log.
export function aiErrorResponse(error: unknown) {
  if (error instanceof AiUnavailable) {
    return Response.json({ error: "Configura GEMINI_API_KEY en .env.local para activar la IA." }, { status: 503 })
  }
  console.error("[ai]", error)
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403 || /API key/i.test(error.message)) {
      return Response.json({ error: "La API key de Gemini no es válida." }, { status: 502 })
    }
    if (error.status === 503) {
      return Response.json({ error: "Gemini está saturado en este momento. Intenta de nuevo en un minuto." }, { status: 503 })
    }
    if (error.status === 429) {
      return Response.json({ error: "Llegaste al límite de uso de Gemini. Espera un momento e intenta de nuevo." }, { status: 429 })
    }
    if (error.status === 400 || error.status === 404) {
      return Response.json({ error: "La IA no pudo procesar la solicitud (¿archivo muy grande o modelo no válido?)." }, { status: 400 })
    }
  }
  return Response.json({ error: "La IA no está disponible ahora. Intenta de nuevo." }, { status: 502 })
}

export function tooLarge(files: FilePayload[]) {
  return files.reduce((n, f) => n + f.data.length, 0) > MAX_FILES_CHARS
}

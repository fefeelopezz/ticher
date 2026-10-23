import Anthropic from "@anthropic-ai/sdk"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { z } from "zod"

// Any current Claude model ID works here; see docs/conectar-ia.md for the options.
export const MODEL = process.env.TICHER_MODEL || "claude-opus-5-5"

// Server-side fallback re-runs a declined request on another model; Haiku and older models don't support it.
const FALLBACK = ["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"].includes(MODEL)
  ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
  : {}

export const FileSchema = z.object({
  name: z.string().max(200),
  type: z.string().max(100),
  data: z.string(),
})
export type FilePayload = z.infer<typeof FileSchema>

// The API accepts requests up to 32 MB; leave room for the rest of the body.
export const MAX_FILES_CHARS = 30_000_000

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const
type ImageType = (typeof IMAGE_TYPES)[number]

// Study files go first in the conversation so the prompt cache can reuse them on every turn.
export function fileBlocks(files: FilePayload[]) {
  const blocks: (Anthropic.Beta.BetaImageBlockParam | Anthropic.Beta.BetaRequestDocumentBlock)[] = []
  for (const f of files) {
    if (f.type === "application/pdf") {
      blocks.push({ type: "document", title: f.name, source: { type: "base64", media_type: "application/pdf", data: f.data } })
    } else if (IMAGE_TYPES.includes(f.type as ImageType)) {
      blocks.push({ type: "image", source: { type: "base64", media_type: f.type as ImageType, data: f.data } })
    } else if (f.type.startsWith("text/") || /\.(md|txt)$/i.test(f.name)) {
      const text = Buffer.from(f.data, "base64").toString("utf8")
      blocks.push({ type: "document", title: f.name, source: { type: "text", media_type: "text/plain", data: text } })
    }
  }
  const last = blocks.at(-1)
  if (last) last.cache_control = { type: "ephemeral" }
  return blocks
}

export class AiUnavailable extends Error {}

export async function ask<T extends z.ZodType>(
  schema: T,
  system: string,
  messages: Anthropic.Beta.BetaMessageParam[],
  effort: "low" | "medium" | "high"
): Promise<z.infer<T>> {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiUnavailable()
  const client = new Anthropic()
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    ...FALLBACK,
  })
  if (res.stop_reason === "refusal") throw new Error("refusal")
  if (res.parsed_output == null) throw new Error(`no output (${res.stop_reason})`)
  return res.parsed_output
}

// Maps failures to a short Spanish message for the student; details go to the server log.
export function aiErrorResponse(error: unknown) {
  if (error instanceof AiUnavailable) {
    return Response.json({ error: "Configura ANTHROPIC_API_KEY en .env.local para activar la IA." }, { status: 503 })
  }
  console.error("[ai]", error)
  if (error instanceof Anthropic.AuthenticationError) {
    return Response.json({ error: "La API key de Anthropic no es válida." }, { status: 502 })
  }
  if (error instanceof Anthropic.RateLimitError) {
    return Response.json({ error: "Demasiadas solicitudes. Espera un momento e intenta de nuevo." }, { status: 429 })
  }
  if (error instanceof Anthropic.BadRequestError) {
    return Response.json({ error: "La IA no pudo procesar la solicitud (¿archivo muy grande o modelo no válido?)." }, { status: 400 })
  }
  return Response.json({ error: "La IA no está disponible ahora. Intenta de nuevo." }, { status: 502 })
}

export function tooLarge(files: FilePayload[]) {
  return files.reduce((n, f) => n + f.data.length, 0) > MAX_FILES_CHARS
}

import { cookies } from "next/headers"
import { Resend } from "resend"
import { z } from "zod"
import { logActivity } from "@/lib/activity"
import { cookieOptions, getSession } from "@/lib/auth"
import { emailLayout, escapeHtml } from "@/lib/email"

// Messages from the "Ticher está en desarrollo" notice, open to visitors too. The inbox comes from the
// environment so the address isn't published with the code.
const TO = process.env.FEEDBACK_TO
const COOLDOWN_COOKIE = "ticher_feedback"
const COOLDOWN_SECONDS = 30

const Body = z.object({
  message: z.string().trim().min(3).max(3000),
  email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal("")),
  page: z.string().max(100).optional(),
  // Honeypot: hidden from people, so only bots fill it in.
  website: z.string().max(200).optional(),
})

export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: "Escribe un mensaje de al menos 3 caracteres." }, { status: 400 })

  const jar = await cookies()
  // shortcut: the cooldown lives in the sender's cookie, so it only slows down casual spam;
  // add a server-side limiter (e.g. per IP) if bots start sending messages.
  if (jar.get(COOLDOWN_COOKIE)) return Response.json({ error: "Espera unos segundos antes de enviar otro mensaje." }, { status: 429 })

  const key = process.env.RESEND_API_KEY
  if (!key || !TO) return Response.json({ error: "El envío de mensajes no está configurado todavía." }, { status: 503 })

  const session = await getSession()
  const from = session?.email || body.data.email || ""
  const { message, page } = body.data
  const html = emailLayout({
    title: "Nuevo mensaje en Ticher",
    preheader: message.slice(0, 120),
    body: `
        <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#fafafa">Nuevo mensaje</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#a3a3a3">
          De: ${from ? escapeHtml(from) : "Visitante sin correo"}${session ? " (con sesión)" : ""}<br>Desde: ${escapeHtml(page || "—")}
        </p>
        <div style="background:#1f1f1f;border:1px solid #2e2e2e;border-radius:12px;padding:18px 20px;font-size:15px;line-height:1.6;color:#fafafa;white-space:pre-wrap">${escapeHtml(message)}</div>`,
  })

  // Bots that filled the honeypot get a normal-looking answer but nothing is sent.
  if (!body.data.website) {
    const { error } = await new Resend(key).emails.send({
      from: process.env.RESEND_FROM || "Ticher <no-reply@ticher.pro>",
      to: TO,
      ...(from && { replyTo: from }),
      subject: `Mensaje de Ticher: ${message.slice(0, 60).replace(/\s+/g, " ")}`,
      html,
      text: `De: ${from || "Visitante sin correo"}\nDesde: ${page || "—"}\n\n${message}`,
    })
    if (error) {
      console.error("[feedback] resend", error)
      return Response.json({ error: "No se pudo enviar el mensaje. Intenta de nuevo en un rato." }, { status: 502 })
    }
    await logActivity("message", from, { message, page: page ?? "", signedIn: !!session })
  }

  jar.set(COOLDOWN_COOKIE, "1", cookieOptions(COOLDOWN_SECONDS))
  return Response.json({ ok: true })
}

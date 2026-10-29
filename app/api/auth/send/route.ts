import { cookies } from "next/headers"
import { Resend } from "resend"
import { z } from "zod"
import { OTP_COOKIE, OTP_MINUTES, RESEND_SECONDS, codeHash, newCode, sign, verify, type Otp } from "@/lib/auth-core"
import { authSecret, cookieOptions } from "@/lib/auth"

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(200) })

const html = (code: string) => `
<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;color:#18181b">
  <p style="font-size:20px;font-weight:600;margin:0 0 8px">Ticher</p>
  <p style="margin:0 0 20px;color:#52525b">Tu código para iniciar sesión:</p>
  <p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:0 0 20px">${code}</p>
  <p style="margin:0;color:#71717a;font-size:13px">Vence en ${OTP_MINUTES} minutos. Si no lo pediste, ignora este correo.</p>
</div>`

export async function POST(request: Request) {
  const secret = authSecret()
  if (!secret) return Response.json({ error: "Falta configurar AUTH_SECRET en .env.local." }, { status: 503 })
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: "Escribe un correo electrónico válido." }, { status: 400 })
  const { email } = body.data

  const jar = await cookies()
  const previous = verify<Otp>(jar.get(OTP_COOKIE)?.value, secret)
  // shortcut: the cooldown lives in the visitor's cookie, so it slows retries but isn't a hard rate limit;
  // add a server-side limiter (e.g. per IP in Redis) before opening sign-up to the public.
  if (previous && previous.email === email && Date.now() - previous.sentAt < RESEND_SECONDS * 1000) {
    return Response.json({ error: "Espera unos segundos antes de pedir otro código." }, { status: 429 })
  }

  const code = newCode()
  const key = process.env.RESEND_API_KEY
  if (key) {
    const { error } = await new Resend(key).emails.send({
      from: process.env.RESEND_FROM || "Ticher <onboarding@resend.dev>",
      to: email,
      subject: `${code} es tu código de Ticher`,
      html: html(code),
      text: `Tu código para iniciar sesión en Ticher: ${code} (vence en ${OTP_MINUTES} minutos).`,
    })
    if (error) {
      console.error("[auth] resend", error)
      // 403 from Resend's test sender: it only delivers to the Resend account's own address until a domain is verified.
      const message =
        error.statusCode === 403
          ? "Por ahora solo se puede enviar al correo de tu cuenta de Resend. Para otros correos, verifica un dominio en resend.com/domains."
          : `No se pudo enviar el correo: ${error.message}`
      return Response.json({ error: message }, { status: 502 })
    }
  } else if (process.env.NODE_ENV !== "production") {
    // Local development without a Resend key: print the code to the server console instead of emailing it.
    console.info(`[auth] código para ${email}: ${code}`)
  } else {
    return Response.json({ error: "Falta configurar RESEND_API_KEY." }, { status: 503 })
  }

  const now = Date.now()
  const otp: Otp = { email, hash: codeHash(email, code, secret), exp: now + OTP_MINUTES * 60_000, tries: 0, sentAt: now }
  jar.set(OTP_COOKIE, sign(otp, secret), cookieOptions(OTP_MINUTES * 60))
  return Response.json({ ok: true })
}

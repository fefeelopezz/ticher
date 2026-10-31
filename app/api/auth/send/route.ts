import { cookies } from "next/headers"
import { Resend } from "resend"
import { z } from "zod"
import { OTP_COOKIE, OTP_MINUTES, RESEND_SECONDS, codeHash, newCode, sign, verify, type Otp } from "@/lib/auth-core"
import { authSecret, cookieOptions } from "@/lib/auth"

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(200) })

// Email clients don't render SVG, so the logo is public/email-logo.png (app/icon.svg at 96 px) on the live site.
const LOGO = "https://www.ticher.pro/email-logo.png"

// Tables and inline styles only: Gmail and Outlook ignore <style> blocks and most modern CSS.
const html = (code: string) => `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Tu código de Ticher</title></head>
<body style="margin:0;padding:0;background:#f5f5f4">
<div style="display:none;max-height:0;overflow:hidden">Tu código es ${code}. Vence en ${OTP_MINUTES} minutos.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4">
  <tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a">
      <tr><td style="padding:0 4px 20px">
        <img src="${LOGO}" width="32" height="32" alt="" style="vertical-align:middle;border:0;border-radius:8px">
        <span style="vertical-align:middle;margin-left:8px;font-size:20px;font-weight:600;letter-spacing:0.05em"><span style="color:#ffa247">T</span>icher</span>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:36px 32px">
        <p style="margin:0 0 6px;font-size:20px;font-weight:600">Tu código de acceso</p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.5;color:#57534e">Escríbelo en Ticher para iniciar sesión.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px 12px 20px 22px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px">${code}</div>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#78716c">Vence en ${OTP_MINUTES} minutos. Si no lo pediste, puedes ignorar este correo.</p>
      </td></tr>
      <tr><td style="padding:20px 4px 0;text-align:center;font-size:12px;line-height:1.6;color:#a8a29e">
        Correo automático de <a href="https://www.ticher.pro" style="color:#a8a29e">ticher.pro</a>, no lo respondas.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

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
      from: process.env.RESEND_FROM || "Ticher <no-reply@ticher.pro>",
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

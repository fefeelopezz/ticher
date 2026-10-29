import { cookies } from "next/headers"
import { z } from "zod"
import {
  MAX_TRIES,
  OTP_COOKIE,
  SESSION_COOKIE,
  SESSION_DAYS,
  USER_COOKIE,
  checkOtp,
  sign,
  verify,
  type Otp,
} from "@/lib/auth-core"
import { authSecret, cookieOptions } from "@/lib/auth"

const Body = z.object({ code: z.string().trim().regex(/^\d{6}$/) })

export async function POST(request: Request) {
  const secret = authSecret()
  if (!secret) return Response.json({ error: "Falta configurar AUTH_SECRET en .env.local." }, { status: 503 })
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: "El código tiene 6 dígitos." }, { status: 400 })

  const jar = await cookies()
  const otp = verify<Otp>(jar.get(OTP_COOKIE)?.value, secret)
  const result = checkOtp(otp, body.data.code, secret)

  if (result === "missing" || result === "expired") {
    jar.delete(OTP_COOKIE)
    return Response.json({ error: "Este código venció. Solicita uno nuevo." }, { status: 400 })
  }
  if (result === "locked") {
    jar.delete(OTP_COOKIE)
    return Response.json({ error: "Demasiados intentos. Por favor, solicita un código nuevo." }, { status: 429 })
  }
  if (result === "invalid") {
    // Count the failed try inside the signed cookie so guessing stops after MAX_TRIES.
    const tries = otp!.tries + 1
    jar.set(OTP_COOKIE, sign({ ...otp!, tries }, secret), cookieOptions(Math.max(1, Math.round((otp!.exp - Date.now()) / 1000))))
    const left = MAX_TRIES - tries
    return Response.json(
      { error: left > 0 ? `Código incorrecto. Te quedan ${left} intentos.` : "Demasiados intentos. Solicita un código nuevo." },
      { status: 400 }
    )
  }

  const email = otp!.email
  const maxAge = SESSION_DAYS * 24 * 60 * 60
  jar.delete(OTP_COOKIE)
  jar.set(SESSION_COOKIE, sign({ email, exp: Date.now() + maxAge * 1000 }, secret), cookieOptions(maxAge))
  // Next URL-encodes cookie values itself; the client decodes once.
  jar.set(USER_COOKIE, email, cookieOptions(maxAge, false))
  return Response.json({ email })
}

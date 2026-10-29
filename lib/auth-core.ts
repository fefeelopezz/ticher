// Stateless email-code login: HMAC-signed tokens in cookies, no database. Pure so Node can test it.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE = "ticher_session"
export const OTP_COOKIE = "ticher_otp"
// Readable by the browser only to keep each user's localStorage apart; access control uses the httpOnly session.
export const USER_COOKIE = "ticher_user"

export const SESSION_DAYS = 30
export const OTP_MINUTES = 10
export const MAX_TRIES = 5
export const RESEND_SECONDS = 30

export type Session = { email: string; exp: number }
export type Otp = { email: string; hash: string; exp: number; tries: number; sentAt: number }

const mac = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url")

export function sign(payload: object, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${body}.${mac(body, secret)}`
}

export function verify<T>(token: string | undefined, secret: string): T | null {
  const [body, sig] = token?.split(".") ?? []
  if (!body || !sig) return null
  const expected = Buffer.from(mac(body, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T
  } catch {
    return null
  }
}

export function readSession(token: string | undefined, secret: string | undefined, now = Date.now()) {
  const s = secret ? verify<Session>(token, secret) : null
  return s && s.exp > now && typeof s.email === "string" ? s : null
}

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0")

// Only a keyed hash of the code travels in the cookie, bound to the email it was sent to.
export const codeHash = (email: string, code: string, secret: string) => mac(`otp:${email}:${code}`, secret)

export function checkOtp(otp: Otp | null, code: string, secret: string, now = Date.now()) {
  if (!otp) return "missing" as const
  if (otp.exp <= now) return "expired" as const
  if (otp.tries >= MAX_TRIES) return "locked" as const
  const expected = Buffer.from(otp.hash)
  const given = Buffer.from(codeHash(otp.email, code.trim(), secret))
  return expected.length === given.length && timingSafeEqual(expected, given) ? ("ok" as const) : ("invalid" as const)
}

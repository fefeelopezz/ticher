import { cookies } from "next/headers"
import { OTP_COOKIE, SESSION_COOKIE, USER_COOKIE } from "@/lib/auth-core"

export async function POST() {
  const jar = await cookies()
  for (const name of [SESSION_COOKIE, USER_COOKIE, OTP_COOKIE]) jar.delete(name)
  return Response.json({ ok: true })
}

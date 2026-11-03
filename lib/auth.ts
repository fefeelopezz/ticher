import { cookies } from "next/headers"
import { isDeleted } from "./activity"
import { SESSION_COOKIE, USER_COOKIE, readSession } from "./auth-core"

// Route handlers re-check the session themselves; the proxy redirect is only an optimistic check.
export async function getSession() {
  const jar = await cookies()
  const session = readSession(jar.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET)
  if (!session || !(await isDeleted(session.email))) return session
  jar.delete(SESSION_COOKIE)
  jar.delete(USER_COOKIE)
  return null
}

export const unauthorized = () => Response.json({ error: "Inicia sesión para continuar." }, { status: 401 })

export const authSecret = () => process.env.AUTH_SECRET

export const cookieOptions = (maxAgeSeconds: number, httpOnly = true) => ({
  httpOnly,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds,
})

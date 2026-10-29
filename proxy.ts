import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, readSession } from "@/lib/auth-core"

// Optimistic gate: send signed-out visitors to /login; API routes also check the session themselves.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = readSession(request.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET)
  const isPublic = pathname === "/login" || pathname.startsWith("/api/auth/")

  if (session && pathname === "/login") return NextResponse.redirect(new URL("/", request.url))
  if (session || isPublic) return NextResponse.next()
  if (pathname.startsWith("/api/")) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 })
  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  // Skip Next's static assets and public files so CSS, JS and images load on the login page.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|webmanifest|mjs)$).*)"],
}

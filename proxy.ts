import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, readSession } from "@/lib/auth-core"

// Optimistic gate: send signed-out visitors to /login; API routes also check the session themselves.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = readSession(request.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET)
  // The reminders cron checks its own CRON_SECRET instead of a session; crawlers need robots and sitemap;
  // visitors on the landing can send feedback too.
  const isPublic =
    ["/login", "/welcome", "/terminos", "/privacidad", "/api/cron/reminders", "/api/feedback", "/robots.txt", "/sitemap.xml"].includes(pathname) || pathname.startsWith("/api/auth/")

  if (session && pathname === "/login") return NextResponse.redirect(new URL("/", request.url))
  // Same URL, two pages: the landing for visitors, the app (Preguntar) once signed in.
  if (!session && pathname === "/") return NextResponse.rewrite(new URL("/welcome", request.url))
  if (session || isPublic) return NextResponse.next()
  if (pathname.startsWith("/api/")) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 })
  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  // Skip Next's static assets and public files so CSS, JS and images load on the login page.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|webmanifest|mjs)$).*)"],
}

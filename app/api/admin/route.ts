import { isAdmin } from "@/lib/admin"
import { summarize, type Row } from "@/lib/admin-summary"
import { getSession } from "@/lib/auth"
import { cloudEnabled, rest } from "@/lib/supabase"

// Admin panel data. "?check=1" only tells a signed-in user whether they are an admin (for the menu link);
// everything else answers 404 to non-admins, so the panel looks like it doesn't exist.
const notFound = () => Response.json({ error: "No encontrado." }, { status: 404 })

export async function GET(request: Request) {
  const session = await getSession()
  const admin = isAdmin(session?.email)
  if (new URL(request.url).searchParams.has("check")) return Response.json({ admin })
  if (!admin) return notFound()
  if (!cloudEnabled()) return Response.json({ error: "Supabase no está configurado." }, { status: 503 })

  // shortcut: loads every user's rows at once, fine for a small group; paginate if this grows to thousands.
  // select=* so created_at (sign-up date) comes along once that column exists; summarize falls back to updated_at.
  const res = await rest("user_data?select=*&key=in.(profile,preps,chats,minutes)")
  if (!res.ok) {
    console.error("[admin] supabase", res.status)
    return Response.json({ error: "No se pudieron leer los usuarios." }, { status: 502 })
  }
  const users = summarize((await res.json()) as Row[])
  return Response.json({ users })
}

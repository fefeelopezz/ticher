import { z } from "zod"
import { markDeleted } from "@/lib/activity"
import { isAdmin } from "@/lib/admin"
import { quotaDayStart, summarize, type AiUsage, type Login, type Message, type Row } from "@/lib/admin-summary"
import { getSession } from "@/lib/auth"
import { BUCKET, cloudEnabled, rest, storage, userFolder } from "@/lib/supabase"

// Admin panel data. "?check=1" only tells a signed-in user whether they are an admin (for the menu link);
// everything else answers 404 to non-admins, so the panel looks like it doesn't exist.
const notFound = () => Response.json({ error: "No encontrado." }, { status: 404 })
const noCloud = () => Response.json({ error: "Supabase no está configurado." }, { status: 503 })

export async function GET(request: Request) {
  const session = await getSession()
  const admin = isAdmin(session?.email)
  if (new URL(request.url).searchParams.has("check")) return Response.json({ admin })
  if (!admin) return notFound()
  if (!cloudEnabled()) return noCloud()

  const quotaDay = quotaDayStart()
  const responses = await Promise.all([
    // shortcut: loads every user's rows at once, fine for a small group; paginate if this grows to thousands.
    // select=* so created_at (sign-up date) comes along once that column exists; summarize falls back to updated_at.
    rest("user_data?select=*&key=in.(profile,preps,chats,minutes)"),
    // shortcut: the newest 1000 logins and 200 messages across all users; page through them if the group outgrows that.
    rest("activity_log?select=email,created_at&kind=eq.login&order=created_at.desc&limit=1000"),
    rest("rpc/admin_ai_usage", { method: "POST", body: "{}" }),
    rest("activity_log?select=id,email,detail,created_at&kind=eq.message&order=created_at.desc&limit=200"),
    // Only the total matters here, and it comes back in the Content-Range header.
    rest(`activity_log?select=id&kind=eq.ai&created_at=gte.${encodeURIComponent(quotaDay.toISOString())}&limit=1`, { headers: { Prefer: "count=exact" } }),
  ])
  const failed = responses.find((res) => !res.ok)
  if (failed) {
    console.error("[admin] supabase", failed.status)
    return Response.json({ error: "No se pudieron leer los usuarios." }, { status: 502 })
  }
  const [rows, logins, usage, messages] = await Promise.all(responses.slice(0, 4).map((res) => res.json()))
  return Response.json({
    me: session!.email,
    aiToday: Number(responses[4].headers.get("content-range")?.split("/")[1] ?? 0),
    aiResetsAt: new Date(quotaDay.getTime() + 86_400_000).toISOString(),
    users: summarize(rows as Row[], logins as Login[], usage as AiUsage[]),
    messages: messages as Message[],
  })
}

async function deleteFiles(email: string) {
  const dir = userFolder(email)
  const limit = 1000
  let items: { name: string }[]
  do {
    const list = await storage(`object/list/${BUCKET}`, { method: "POST", body: JSON.stringify({ prefix: `${dir}/`, limit }) })
    if (!list.ok) throw new Error(`list files ${list.status}`)
    items = await list.json()
    if (!items.length) return
    const res = await storage(`object/${BUCKET}`, { method: "DELETE", body: JSON.stringify({ prefixes: items.map((i) => `${dir}/${i.name}`) }) })
    if (!res.ok) throw new Error(`delete files ${res.status}`)
  } while (items.length === limit)
}

const DeleteBody = z.object({ email: z.string().trim().toLowerCase().email() })

// Deletes an account for good: its files, study data, logins, AI usage and messages. Admins can't be
// deleted from here, so nobody locks themselves out of the panel.
export async function DELETE(request: Request) {
  const session = await getSession()
  if (!isAdmin(session?.email)) return notFound()
  if (!cloudEnabled()) return noCloud()
  const body = DeleteBody.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: "Email inválido." }, { status: 400 })
  const { email } = body.data
  if (isAdmin(email)) return Response.json({ error: "No se puede eliminar una cuenta de administrador." }, { status: 400 })

  try {
    // First, so an open session can't upload anything again while this runs. The rows go last: if a step
    // fails the user stays listed and deleting again finishes the job.
    await markDeleted(email)
    await deleteFiles(email)
    for (const table of ["user_data", "activity_log"]) {
      const res = await rest(`${table}?email=eq.${encodeURIComponent(email)}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`delete ${table} ${res.status}`)
    }
  } catch (error) {
    console.error("[admin] delete user", error)
    return Response.json({ error: "No se pudo eliminar por completo. Intenta de nuevo." }, { status: 502 })
  }
  return Response.json({ ok: true })
}

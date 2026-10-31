import { z } from "zod"
import { getSession, unauthorized } from "@/lib/auth"
import { cloudEnabled, rest } from "@/lib/supabase"

const Body = z.object({ key: z.string().regex(/^[a-z]{1,20}$/), value: z.unknown() })

// Without Supabase configured the app keeps working from localStorage only.
const disabled = () => Response.json({ enabled: false })
const failed = (res: Response) => {
  console.error("[data] supabase", res.status)
  return Response.json({ error: "No se pudo sincronizar con la nube." }, { status: 502 })
}

// Every stored key of the signed-in user.
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  if (!cloudEnabled()) return disabled()
  const res = await rest(`user_data?select=key,value&email=eq.${encodeURIComponent(session.email)}`)
  if (!res.ok) return failed(res)
  return Response.json({ enabled: true, items: await res.json() })
}

// Saves one key, replacing what was there.
export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (!cloudEnabled()) return disabled()
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success || body.data.value === undefined) return Response.json({ error: "Datos inválidos." }, { status: 400 })
  const res = await rest("user_data?on_conflict=email,key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ email: session.email, key: body.data.key, value: body.data.value, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) return failed(res)
  return Response.json({ enabled: true })
}

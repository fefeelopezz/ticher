import { z } from "zod"
import { getSession, unauthorized } from "@/lib/auth"
import { cloudEnabled, storage, storageUrl } from "@/lib/supabase"

// Cloud copy of the files kept in the browser's IndexedDB (lib/files.ts). The bucket is private: this route
// only signs short-lived URLs for the signed-in user's own folder, and the browser moves the bytes itself
// (straight to Supabase, so files past Vercel's ~4.5 MB request limit still fit).
const BUCKET = "files"
// Keys are material ids (crypto.randomUUID) and their PDF's Markdown copy ("<id>.md").
const Key = z.string().regex(/^[0-9a-f-]{36}(\.md)?$/)
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("upload"), key: Key }),
  z.object({ action: z.literal("download"), key: Key }),
  z.object({ action: z.literal("delete"), keys: z.array(Key).min(1).max(50) }),
])

const folder = (email: string) => email.replace(/[^a-z0-9@._+-]/gi, "_")
const disabled = () => Response.json({ enabled: false })
const failed = (what: string, res: Response) => {
  console.error(`[files] ${what}`, res.status)
  return Response.json({ error: "No se pudo acceder a tus archivos en la nube." }, { status: 502 })
}

// Keys of every file this user has in the cloud, so the browser can back up the ones still missing.
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  if (!cloudEnabled()) return disabled()
  const res = await storage(`object/list/${BUCKET}`, { method: "POST", body: JSON.stringify({ prefix: folder(session.email) + "/", limit: 1000 }) })
  if (!res.ok) return failed("list", res)
  const items = (await res.json()) as { name: string }[]
  return Response.json({ enabled: true, keys: items.map((i) => i.name) })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (!cloudEnabled()) return disabled()
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: "Archivo inválido." }, { status: 400 })
  const dir = folder(session.email)

  if (body.data.action === "delete") {
    const res = await storage(`object/${BUCKET}`, { method: "DELETE", body: JSON.stringify({ prefixes: body.data.keys.map((k) => `${dir}/${k}`) }) })
    return res.ok ? Response.json({ enabled: true }) : failed("delete", res)
  }

  const path = `${dir}/${body.data.key}`
  if (body.data.action === "upload") {
    // Upsert, so retrying an upload that half-failed just replaces it.
    // Storage rejects an empty body sent as JSON, hence the "{}".
    const res = await storage(`object/upload/sign/${BUCKET}/${path}`, { method: "POST", headers: { "x-upsert": "true" }, body: "{}" })
    if (!res.ok) return failed("sign upload", res)
    const { url } = (await res.json()) as { url: string }
    return Response.json({ enabled: true, url: storageUrl(url) })
  }

  const res = await storage(`object/sign/${BUCKET}/${path}`, { method: "POST", body: JSON.stringify({ expiresIn: 300 }) })
  // Not in the cloud (never uploaded, or deleted): the browser treats it as missing.
  if (res.status === 400 || res.status === 404) return Response.json({ enabled: true, url: null })
  if (!res.ok) return failed("sign download", res)
  const { signedURL } = (await res.json()) as { signedURL: string }
  return Response.json({ enabled: true, url: storageUrl(signedURL) })
}

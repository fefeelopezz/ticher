import { createHash } from "node:crypto"
import { cloudEnabled, rest } from "./supabase"

// Server-side record for the admin panel (activity_log table). Logging must never break the request it
// describes, so failures only reach the server log.
export async function logActivity(kind: "login" | "ai" | "message", email: string, detail: Record<string, unknown> = {}) {
  if (!cloudEnabled()) return
  try {
    const res = await rest("activity_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ kind, email, detail }) })
    if (!res.ok) console.error("[activity] log", kind, res.status)
  } catch (error) {
    console.error("[activity] log", kind, error)
  }
}

// A deleted account's browser still has its data and a valid session cookie, and its next sync would
// upload everything again. This marker ends those sessions; a hash so the address itself is gone.
const marker = (email: string) => `deleted:${createHash("sha256").update(email).digest("hex")}`
const markerQuery = (email: string) => `activity_log?kind=eq.deleted&email=eq.${encodeURIComponent(marker(email))}`

export async function markDeleted(email: string) {
  const res = await rest("activity_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ kind: "deleted", email: marker(email) }) })
  if (!res.ok) throw new Error(`mark deleted ${res.status}`)
}

export async function isDeleted(email: string) {
  if (!cloudEnabled()) return false
  try {
    const res = await rest(`${markerQuery(email)}&select=id&limit=1`)
    return res.ok && ((await res.json()) as unknown[]).length > 0
  } catch {
    // Supabase down must not sign everyone out.
    return false
  }
}

// Signing in again with the same email is a new account.
export async function clearDeleted(email: string) {
  if (!cloudEnabled()) return
  const res = await rest(markerQuery(email), { method: "DELETE" }).catch(() => null)
  if (!res?.ok) console.error("[activity] clear deleted", res?.status)
}

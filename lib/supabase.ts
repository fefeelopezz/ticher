// Server-only access to Supabase's REST API with the secret key. The user_data table has RLS with no
// policies, so only this server can read it, and every route filters by the signed-in email.
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

export const cloudEnabled = () => !!(url && key)

export function rest(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { apikey: key!, "Content-Type": "application/json" }
  // Legacy service_role keys are JWTs and go in Authorization too; new sb_secret_ keys only use apikey.
  if (!key!.startsWith("sb_")) headers.Authorization = `Bearer ${key}`
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers }, cache: "no-store" })
}

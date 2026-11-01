// Server-only access to Supabase's REST API with the secret key. The user_data table has RLS with no
// policies, so only this server can read it, and every route filters by the signed-in email.
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

export const cloudEnabled = () => !!(url && key)

function call(base: string, path: string, init: RequestInit) {
  const headers: Record<string, string> = { apikey: key!, "Content-Type": "application/json" }
  // Legacy service_role keys are JWTs and go in Authorization too; new sb_secret_ keys only use apikey.
  if (!key!.startsWith("sb_")) headers.Authorization = `Bearer ${key}`
  return fetch(`${url}/${base}/${path}`, { ...init, headers: { ...headers, ...init.headers }, cache: "no-store" })
}

export const rest = (path: string, init: RequestInit = {}) => call("rest/v1", path, init)
// Storage API; signed URLs it returns are relative to this base, see storageUrl.
export const storage = (path: string, init: RequestInit = {}) => call("storage/v1", path, init)
export const storageUrl = (relative: string) => `${url}/storage/v1${relative}`

"use client"

// POSTs JSON to one of our API routes and surfaces the route's Spanish error message.
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  } catch {
    throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo.")
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "No se pudo conectar con la IA.")
  return data as T
}

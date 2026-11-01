"use client"

// Study files are too large for localStorage, so their bytes live in IndexedDB keyed by material id,
// with a copy in the cloud (app/api/files): uploads run in the background, and a file missing here
// (another device, cleared browser) is fetched from the cloud, so notes follow the student around.
function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("ticher", 1)
    req.onupgradeneeded = () => req.result.createObjectStore("files")
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const req = op(db.transaction("files", mode).objectStore("files"))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Asks our server to sign a cloud operation; null when signed out, Supabase isn't set up, or it failed.
async function cloud<T>(body: object): Promise<T | null> {
  const res = await fetch("/api/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (!res.ok) return null
  const data = await res.json()
  return data.enabled ? (data as T) : null
}

// The bytes go straight to Supabase with the signed URL, not through our server.
async function upload(key: string, blob: Blob) {
  const signed = await cloud<{ url: string }>({ action: "upload", key })
  if (!signed) return
  await fetch(signed.url, { method: "PUT", headers: { "Content-Type": blob.type || "application/octet-stream", "x-upsert": "true" }, body: blob })
}

export async function saveFile(id: string, file: Blob) {
  await run("readwrite", (s) => s.put(file, id))
  // Doesn't hold up the student; an upload that fails is retried by backupFiles on a later visit.
  upload(id, file).catch(() => {})
}

export async function getFile(id: string) {
  const local = await run<Blob | undefined>("readonly", (s) => s.get(id))
  if (local) return local
  const signed = await cloud<{ url: string | null }>({ action: "download", key: id }).catch(() => null)
  if (!signed?.url) return undefined
  const res = await fetch(signed.url)
  if (!res.ok) return undefined
  const blob = await res.blob()
  // Keep it here too, so it's downloaded once per device.
  await run("readwrite", (s) => s.put(blob, id)).catch(() => {})
  return blob
}

// A PDF's Markdown copy is stored beside it under its own key.
export const mdKey = (id: string) => `${id}.md`

// Also drops the Markdown copy, if the file had one, so nothing is left orphaned (here or in the cloud).
export const deleteFile = async (id: string) => {
  await run("readwrite", (s) => s.delete(id))
  await run("readwrite", (s) => s.delete(mdKey(id)))
  cloud({ action: "delete", keys: [id, mdKey(id)] }).catch(() => {})
}

// Uploads this user's local files that the cloud doesn't have yet (saved before cloud storage existed,
// or while offline). Only ids from the user's own data: IndexedDB is shared by every account on this browser.
// shortcut: the cloud listing stops at 1000 files per user; page through it if anyone gets there.
export async function backupFiles(ids: string[]) {
  const res = await fetch("/api/files")
  if (!res.ok) return
  const data = await res.json()
  if (!data.enabled) return
  const inCloud = new Set<string>(data.keys)
  for (const key of ids.flatMap((id) => [id, mdKey(id)])) {
    if (inCloud.has(key)) continue
    const blob = await run<Blob | undefined>("readonly", (s) => s.get(key)).catch(() => undefined)
    if (blob) await upload(key, blob).catch(() => {})
  }
}

type Sendable = { id: string; name: string; type: string; markdown?: number }

// Formats Gemini reads directly; Word/PowerPoint would need converting first.
const isSendable = (m: Sendable) => /^(application\/pdf|image\/(png|jpeg|gif|webp)|text\/)/.test(m.type) || /\.(md|txt)$/i.test(m.name)

// Stays under Gemini's ~20 MB inline request limit (base64 is ~33% larger than the file).
// shortcut: bigger sets of files would need Gemini's Files API upload; add it if students hit this.
const BUDGET_CHARS = 18_000_000

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

// Loads study files for an AI request; returns the names it had to leave out so the UI can say so.
export async function toPayload(materials: Sendable[]) {
  const files: { name: string; type: string; data: string }[] = []
  const skipped: string[] = []
  let used = 0
  for (const m of materials) {
    // Converted PDFs go as their Markdown text: a fraction of the size and much cheaper for the AI to read.
    const md = (m.markdown ?? 0) > 0 ? await getFile(mdKey(m.id)).catch(() => undefined) : undefined
    const blob = md ?? (isSendable(m) ? await getFile(m.id).catch(() => undefined) : undefined)
    const data = blob ? await toBase64(blob) : ""
    if (!data || used + data.length > BUDGET_CHARS) {
      skipped.push(m.name)
      continue
    }
    used += data.length
    files.push(
      md
        ? { name: m.name.replace(/\.pdf$/i, "") + ".md", type: "text/markdown", data }
        : { name: m.name, type: m.type || "text/plain", data }
    )
  }
  return { files, skipped }
}

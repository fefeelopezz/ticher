"use client"

// Study files are too large for localStorage, so their bytes live in IndexedDB keyed by material id.
// shortcut: files stay in this browser only, move to object storage once there are real accounts.
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

export const saveFile = (id: string, file: Blob) => run("readwrite", (s) => s.put(file, id))
export const getFile = (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id))
export const deleteFile = (id: string) => run("readwrite", (s) => s.delete(id))

type Sendable = { id: string; name: string; type: string }

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
    const blob = isSendable(m) ? await getFile(m.id).catch(() => undefined) : undefined
    const data = blob ? await toBase64(blob) : ""
    if (!data || used + data.length > BUDGET_CHARS) {
      skipped.push(m.name)
      continue
    }
    used += data.length
    files.push({ name: m.name, type: m.type || "text/plain", data })
  }
  return { files, skipped }
}

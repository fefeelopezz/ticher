"use client"

import { useState } from "react"
import { FileText, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { deleteFile, getFile, mdKey, saveFile } from "@/lib/files"
import { convertPdf } from "@/lib/pdf"
import { NO_SUBJECTS, useStored, type Material, type Subject } from "@/lib/store"
import { same } from "@/lib/use-prep"

const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,image/*"
const MAX_MB = 25

const isAllowed = (f: File) => f.type.startsWith("image/") || /\.(pdf|docx?|pptx?|txt|md)$/i.test(f.name)
export const formatSize = (b: number) => (b < 1024 * 1024 ? `${Math.ceil(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)

// The file input's `accept` is only a hint (drag-and-drop bypasses it), so type and size are checked here.
export async function storeFiles(files: File[]) {
  const stored: Material[] = []
  for (const f of files) {
    if (!isAllowed(f)) {
      toast.error(`${f.name}: formato no compatible`)
    } else if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`${f.name} supera ${MAX_MB} MB`)
    } else {
      const id = crypto.randomUUID()
      try {
        await saveFile(id, f)
      } catch {
        toast.error(`No se pudo guardar ${f.name}. Puede que el navegador no tenga espacio.`)
        continue
      }
      const material: Material = { id, name: f.name, size: f.size, type: f.type }
      if (isPdf(material)) material.markdown = await toMarkdown(id, f, f.name)
      stored.push(material)
    }
  }
  return stored
}

const isPdf = (m: Material) => m.type === "application/pdf" || /\.pdf$/i.test(m.name)

// Conversion never blocks an upload: on failure the original PDF is kept and the AI reads that instead.
async function toMarkdown(id: string, file: Blob, name: string) {
  try {
    const chars = await convertPdf(id, file)
    if (chars === 0) toast.info(`${name} no tiene texto (¿es escaneado?); la IA leerá el PDF original.`)
    else toast.success(`${name} convertido a Markdown`)
    return chars
  } catch (error) {
    console.error("[pdf→md]", error)
    toast.error(`No se pudo convertir ${name} a Markdown; se usará el PDF.`)
    return undefined
  }
}

export async function openMaterial(m: Material, markdown = false) {
  // Open the tab synchronously so popup blockers allow it, then point it at the file.
  const tab = window.open("", "_blank")
  const stored = await getFile(markdown ? mdKey(m.id) : m.id).catch(() => undefined)
  // Shown as plain text: browsers download text/markdown instead of displaying it.
  const blob = stored && markdown ? new Blob([stored], { type: "text/plain;charset=utf-8" }) : stored
  if (!blob) {
    tab?.close()
    toast.error("No se encontró el archivo en este navegador.")
    return
  }
  const url = URL.createObjectURL(blob)
  if (tab) tab.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function FileDrop({ onFiles, compact }: { onFiles: (files: File[]) => void; compact?: boolean }) {
  const [over, setOver] = useState(false)
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center text-sm text-muted-foreground transition-colors hover:bg-muted/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 ${over ? "bg-muted" : ""} ${compact ? "p-3" : "p-6"}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFiles([...e.dataTransfer.files])
      }}
    >
      <Upload className="size-4" />
      <span>{compact ? "Agregar material" : "Arrastra tus PDFs o apuntes aquí, o haz clic para elegir"}</span>
      {!compact && (
        <span className="text-xs">PDF, imágenes o texto (la IA los lee) · Word y PowerPoint solo se guardan · máx. {MAX_MB} MB</span>
      )}
      <input
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])])
          e.target.value = ""
        }}
      />
    </label>
  )
}

// Files belong to the subject, so every exam of the same subject shares them.
export function ExamMaterials({ subject }: { subject: string }) {
  const [subjects, setSubjects] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  const [converting, setConverting] = useState<string | null>(null)
  const materials = subjects.find((s) => same(s.name, subject))?.materials ?? []

  // Updaters read the latest list: converting PDFs takes seconds and the student may change things meanwhile.
  const updateMaterials = (fn: (ms: Material[]) => Material[]) =>
    setSubjects((all) =>
      all.some((s) => same(s.name, subject))
        ? all.map((s) => (same(s.name, subject) ? { ...s, materials: fn(s.materials) } : s))
        : [...all, { id: crypto.randomUUID(), name: subject, materials: fn([]) }]
    )

  async function addMaterials(files: File[]) {
    const stored = await storeFiles(files)
    if (stored.length) updateMaterials((ms) => [...ms, ...stored])
  }

  // PDFs uploaded before conversion existed get a one-click conversion.
  async function convertExisting(m: Material) {
    setConverting(m.id)
    const blob = await getFile(m.id).catch(() => undefined)
    const markdown = blob ? await toMarkdown(m.id, blob, m.name) : undefined
    setConverting(null)
    if (markdown !== undefined) updateMaterials((ms) => ms.map((x) => (x.id === m.id ? { ...x, markdown } : x)))
  }

  function removeMaterial(m: Material) {
    deleteFile(m.id).catch(() => {})
    updateMaterials((ms) => ms.filter((x) => x.id !== m.id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Material de estudio</CardTitle>
        <CardDescription>
          {materials.length === 1 ? "1 archivo" : `${materials.length} archivos`} de {subject} · se comparten con tus otros
          exámenes de esta materia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {materials.map((m) => (
          <div key={m.id} className="flex items-center gap-2 text-sm">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <button type="button" className="truncate text-left hover:underline" onClick={() => openMaterial(m)}>
              {m.name}
            </button>
            {(m.markdown ?? 0) > 0 && (
              <button
                type="button"
                title={`Ver versión Markdown (${m.markdown!.toLocaleString("es")} caracteres)`}
                aria-label={`Ver ${m.name} en Markdown`}
                className="shrink-0 rounded bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground"
                onClick={() => openMaterial(m, true)}
              >
                MD
              </button>
            )}
            {m.markdown === 0 && (
              <span className="shrink-0 text-[10px] text-muted-foreground" title="PDF escaneado: la IA lee el PDF original">
                sin texto
              </span>
            )}
            {isPdf(m) && m.markdown === undefined && (
              <Button
                variant="outline"
                size="xs"
                className="shrink-0"
                disabled={converting !== null}
                onClick={() => convertExisting(m)}
              >
                {converting === m.id ? "Convirtiendo…" : "Convertir a MD"}
              </Button>
            )}
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatSize(m.size)}</span>
            <Button variant="ghost" size="icon-xs" aria-label={`Eliminar ${m.name}`} onClick={() => removeMaterial(m)}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <FileDrop compact={materials.length > 0} onFiles={addMaterials} />
      </CardContent>
    </Card>
  )
}

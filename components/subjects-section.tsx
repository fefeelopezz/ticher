"use client"

import { useState } from "react"
import { FileText, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteFile, getFile, saveFile } from "@/lib/files"
import { NO_SUBJECTS, SUBJECTS, useStored, type Material, type Subject } from "@/lib/store"

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
        stored.push({ id, name: f.name, size: f.size, type: f.type })
      } catch {
        toast.error(`No se pudo guardar ${f.name}. Puede que el navegador no tenga espacio.`)
      }
    }
  }
  return stored
}

export async function openMaterial(m: Material) {
  // Open the tab synchronously so popup blockers allow it, then point it at the file.
  const tab = window.open("", "_blank")
  const blob = await getFile(m.id).catch(() => undefined)
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

export function SubjectsSection() {
  const [subjects, setSubjects] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  async function create(form: FormData) {
    const name = String(form.get("name")).trim()
    if (!name) return
    setSaving(true)
    const materials = await storeFiles(pending)
    const existing = subjects.find((s) => s.name.toLowerCase() === name.toLowerCase())
    setSubjects(
      existing
        ? subjects.map((s) => (s.id === existing.id ? { ...s, materials: [...s.materials, ...materials] } : s))
        : [...subjects, { id: crypto.randomUUID(), name, materials }]
    )
    setSaving(false)
    setPending([])
    setOpen(false)
    toast.success(existing ? `Material agregado a ${existing.name}` : "Materia agregada")
  }

  async function addMaterials(subject: Subject, files: File[]) {
    const materials = await storeFiles(files)
    if (!materials.length) return
    setSubjects(subjects.map((s) => (s.id === subject.id ? { ...s, materials: [...s.materials, ...materials] } : s)))
  }

  function removeMaterial(subject: Subject, m: Material) {
    deleteFile(m.id).catch(() => {})
    setSubjects(subjects.map((s) => (s.id === subject.id ? { ...s, materials: s.materials.filter((x) => x.id !== m.id) } : s)))
  }

  function removeSubject(subject: Subject) {
    subject.materials.forEach((m) => deleteFile(m.id).catch(() => {}))
    setSubjects(subjects.filter((s) => s.id !== subject.id))
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Mis materias</h2>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) setPending([])
          }}
        >
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Plus /> Agregar materias
          </DialogTrigger>
          <DialogContent>
            <form action={create} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Agregar materia</DialogTitle>
                <DialogDescription>Sube el material con el que vas a estudiar para el examen.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="subject-name">Materia</Label>
                <Input
                  id="subject-name"
                  name="name"
                  list="subject-suggestions"
                  placeholder="Ej. Física"
                  required
                  maxLength={40}
                />
                <datalist id="subject-suggestions">
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Material de estudio</Label>
                <FileDrop onFiles={(files) => setPending([...pending, ...files])} />
                {pending.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {pending.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{f.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatSize(f.size)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Quitar ${f.name}`}
                          onClick={() => setPending(pending.filter((_, j) => j !== i))}
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : "Guardar materia"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {subjects.length === 0 ? (
        <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          Agrega tus materias y sube PDFs o apuntes para estudiar.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((s) => (
            <Card key={s.id} size="sm">
              <CardHeader>
                <CardTitle>{s.name}</CardTitle>
                <CardDescription>
                  {s.materials.length === 1 ? "1 archivo" : `${s.materials.length} archivos`}
                </CardDescription>
                <CardAction>
                  <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${s.name}`} onClick={() => removeSubject(s)}>
                    <Trash2 />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-2">
                {s.materials.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <button type="button" className="truncate text-left hover:underline" onClick={() => openMaterial(m)}>
                      {m.name}
                    </button>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatSize(m.size)}</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Eliminar ${m.name}`}
                      onClick={() => removeMaterial(s, m)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <FileDrop compact onFiles={(files) => addMaterials(s, files)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

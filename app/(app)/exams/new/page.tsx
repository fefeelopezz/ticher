"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, FileText, Plus, Search, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { DatePicker } from "@/components/date-picker"
import { FileDrop, formatSize, storeFiles } from "@/components/subjects-section"
import {
  DEFAULT_GOAL,
  NO_EVENTS,
  NO_PREPS,
  NO_SUBJECTS,
  SUBJECTS,
  isoDate,
  useStored,
  write,
  type CalendarEvent,
  type ExamPrep,
  type Subject,
} from "@/lib/store"

const STEPS = ["¿De qué materia es el examen?", "¿Cuándo tienes el examen?", "¿Qué calificación quieres obtener?", "Sube material de estudio"]

const inDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoDate(d)
}
const QUICK_DATES = [
  { label: "Mañana", days: 1 },
  { label: "En 2 días", days: 2 },
  { label: "En 3 días", days: 3 },
  { label: "En una semana", days: 7 },
]
const fmt = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })

export default function NewExamPage() {
  const router = useRouter()
  const [subjects] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  const [step, setStep] = useState(0)
  const [search, setSearch] = useState("")
  const [subject, setSubject] = useState("")
  const [date, setDate] = useState("")
  const [name, setName] = useState("")
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [pending, setPending] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  // Name typed in the "Agregar materia" dialog; null while it is closed.
  const [newSubject, setNewSubject] = useState<string | null>(null)

  const mine = subjects.map((s) => s.name)
  const q = search.trim().toLowerCase()
  const general = SUBJECTS.filter((s) => !mine.some((m) => m.toLowerCase() === s.toLowerCase()))
  const match = (s: string) => s.toLowerCase().includes(q)
  const exists = [...mine, ...SUBJECTS].some((s) => s.toLowerCase() === q)
  const existing = subjects.find((s) => s.name.toLowerCase() === subject.toLowerCase())
  const canContinue = [!!subject, !!date, true, true][step]

  async function create() {
    setSaving(true)
    const materials = await storeFiles(pending)
    write<Subject[]>("subjects", NO_SUBJECTS, (all) =>
      all.some((s) => s.name.toLowerCase() === subject.toLowerCase())
        ? all.map((s) => (s.name.toLowerCase() === subject.toLowerCase() ? { ...s, materials: [...s.materials, ...materials] } : s))
        : [...all, { id: crypto.randomUUID(), name: subject, materials }]
    )
    const prep: ExamPrep = {
      id: crypto.randomUUID(),
      name: name.trim() || `Examen de ${subject}`,
      subject,
      date,
      mastery: 0,
      goal,
      topics: [],
      history: [],
    }
    write<ExamPrep[]>("preps", NO_PREPS, (all) => [...all, prep])
    // Astra links exams to the calendar; the event points back to the prep.
    write<CalendarEvent[]>("events", NO_EVENTS, (all) => [
      ...all,
      { id: crypto.randomUUID(), title: prep.name, date, subject, note: "Examen", prepId: prep.id },
    ])
    toast.success("Preparación creada")
    router.push(`/exams/${prep.id}`)
  }

  // Saves the subject under "Agregadas por ti" and selects it; a name that already exists is just selected.
  function addSubject(raw: string) {
    const value = raw.trim().replace(/s+/g, " ")
    if (!value) return
    const known = [...mine, ...SUBJECTS].find((s) => s.toLowerCase() === value.toLowerCase())
    if (!known) write<Subject[]>("subjects", NO_SUBJECTS, (all) => [...all, { id: crypto.randomUUID(), name: value, materials: [] }])
    setSubject(known ?? value)
    setNewSubject(null)
    setSearch("")
  }

  const subjectButton = (value: string) => {
    const selected = value === subject
    return (
      <Button key={value} variant={selected ? "default" : "outline"} className="justify-between" onClick={() => setSubject(value)}>
        {value}
        {selected && <Check />}
      </Button>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Atrás"
          onClick={() => (step === 0 ? router.push("/exams") : setStep(step - 1))}
        >
          <ArrowLeft />
        </Button>
        <div className="flex flex-1 gap-1" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <Button variant="ghost" size="icon" aria-label="Cerrar" nativeButton={false} render={<Link href="/exams" />}>
          <X />
        </Button>
      </div>

      <h1 className="text-center text-2xl font-semibold tracking-tight">{STEPS[step]}</h1>

      <div className="flex-1 space-y-4">
        {step === 0 && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar materia"
                aria-label="Buscar materia"
                className="pl-8"
                maxLength={40}
              />
            </div>
            <Button variant="outline" className="w-full border-dashed" onClick={() => setNewSubject("")}>
              <Plus /> Agregar materia
            </Button>
            <Dialog open={newSubject !== null} onOpenChange={(o) => !o && setNewSubject(null)}>
              <DialogContent className="sm:max-w-sm">
                <form
                  className="contents"
                  onSubmit={(e) => {
                    e.preventDefault()
                    addSubject(newSubject ?? "")
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Agregar materia</DialogTitle>
                    <DialogDescription>Se guarda en &ldquo;Agregadas por ti&rdquo; para tus próximos exámenes.</DialogDescription>
                  </DialogHeader>
                  <Input
                    autoFocus
                    value={newSubject ?? ""}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Por ejemplo: Geología"
                    aria-label="Nombre de la materia"
                    maxLength={40}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={!newSubject?.trim()}>
                      Agregar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            {q && !exists && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setSubject(search.trim())
                  setSearch("")
                }}
              >
                <Plus /> Agregar “{search.trim()}”
              </Button>
            )}
            {subject && !mine.includes(subject) && !SUBJECTS.includes(subject) && (
              <div className="grid">
                {subjectButton(subject)}
              </div>
            )}
            {mine.filter(match).length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-medium text-muted-foreground uppercase">Agregadas por ti</h2>
                <div className="grid grid-cols-2 gap-2">
                  {mine.filter(match).map((s) => (
                    subjectButton(s)
                  ))}
                </div>
              </section>
            )}
            <section className="space-y-2">
              <h2 className="text-xs font-medium text-muted-foreground uppercase">Generales</h2>
              <div className="grid grid-cols-2 gap-2">
                {general.filter(match).map((s) => (
                  subjectButton(s)
                ))}
              </div>
            </section>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-2">
              {QUICK_DATES.map(({ label, days }) => {
                const value = inDays(days)
                return (
                  <Button
                    key={days}
                    variant={date === value ? "default" : "outline"}
                    className="h-auto justify-between py-3"
                    onClick={() => setDate(value)}
                  >
                    <span className="text-left">
                      <span className="block font-medium">{label}</span>
                      <span className="block text-xs font-normal opacity-70">{fmt(value)}</span>
                    </span>
                    {date === value && <Check />}
                  </Button>
                )
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-date">O elige la fecha</Label>
              <DatePicker id="exam-date" value={date} onChange={setDate} min={inDays(0)} placeholder="Elige el día del examen" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-name">Nombre del examen (opcional)</Label>
              <Input
                id="exam-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Examen de ${subject}`}
                maxLength={80}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-8 py-6 text-center">
            <p className="text-6xl font-semibold tracking-tight">
              {goal}
              <span className="text-2xl text-muted-foreground">%</span>
            </p>
            <Slider
              value={[goal]}
              min={50}
              max={100}
              step={5}
              aria-label="Meta de dominio"
              onValueChange={(v) => setGoal(Array.isArray(v) ? v[0] : v)}
            />
            <p className="text-sm text-muted-foreground">Meta de dominio: el porcentaje del temario que quieres dominar.</p>
          </div>
        )}

        {step === 3 && (
          <>
            <p className="text-center text-sm text-muted-foreground">
              Apuntes, libros o exámenes anteriores de {subject}. Ticher los usa para crear tus temas, tarjetas y exámenes de práctica.
            </p>
            <FileDrop onFiles={(files) => setPending([...pending, ...files])} />
            {(existing?.materials.length ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground">
                Ya tienes {existing!.materials.length} archivo(s) de {subject}; también se usarán.
              </p>
            )}
            {pending.length > 0 && (
              <ul className="space-y-1 text-sm">
                {pending.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatSize(f.size)}</span>
                    <Button
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
          </>
        )}
      </div>

      {step < 3 ? (
        <Button size="lg" disabled={!canContinue} onClick={() => setStep(step + 1)}>
          Continuar
        </Button>
      ) : (
        <div className="space-y-2">
          <Button size="lg" className="w-full" disabled={saving} onClick={create}>
            {saving ? "Creando…" : pending.length ? "Crear preparación" : "Crear sin material"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Puedes agregar material después.</p>
        </div>
      )}
    </div>
  )
}

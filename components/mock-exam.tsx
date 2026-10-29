"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Clock } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DifficultyPicker, TopicPicker, formatTime } from "@/components/exam-practice"
import { today, type Difficulty, type MockAttempt, type MockGrade, type MockTask } from "@/lib/store"

export type Graded = { grades: MockGrade[]; score: number; strengths: string; toReview: string }

type Props = {
  topics: string[]
  review?: MockAttempt
  create: (topics: string[], count: number, difficulty: Difficulty) => Promise<MockTask[] | undefined>
  grade: (tasks: MockTask[], answers: string[]) => Promise<Graded | undefined>
  onDone: (attempt: MockAttempt) => void
  onClose: () => void
}

const LIMITS: (number | null)[] = [null, 15, 30, 45, 60]

// Astra's "Examen Escrito Simulado": pick topics and a time limit, answer in writing, get an AI grade.
export function MockExam({ topics, review, create, grade, onDone, onClose }: Props) {
  const [phase, setPhase] = useState<"setup" | "creating" | "writing" | "grading" | "result">(review ? "result" : "setup")
  const [selected, setSelected] = useState(topics)
  const [limit, setLimit] = useState<number | null>(30)
  const [difficulty, setDifficulty] = useState<Difficulty>("medio")
  const [tasks, setTasks] = useState<MockTask[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [attempt, setAttempt] = useState<MockAttempt | undefined>(review)
  const startedAt = useRef(0)
  const count = Math.min(8, Math.max(3, selected.length * 2))

  async function start() {
    setPhase("creating")
    const created = await create(selected, count, difficulty)
    if (!created?.length) return setPhase("setup")
    setTasks(created)
    setAnswers(created.map(() => ""))
    startedAt.current = Date.now()
    setElapsed(0)
    setPhase("writing")
  }

  async function submit() {
    setPhase("grading")
    const seconds = Math.round((Date.now() - startedAt.current) / 1000)
    const result = await grade(tasks, answers)
    // Keep the answers on failure so nothing the student wrote is lost; they can resend.
    if (!result) return setPhase("writing")
    const done: MockAttempt = { id: crypto.randomUUID(), date: today(), limitMin: limit, seconds, tasks, answers, ...result }
    setAttempt(done)
    setPhase("result")
    onDone(done)
  }

  // The interval needs the latest submit (it closes over the current answers).
  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
  })

  useEffect(() => {
    if (phase !== "writing") return
    const id = setInterval(() => {
      const s = Math.round((Date.now() - startedAt.current) / 1000)
      setElapsed(s)
      if (limit !== null && s >= limit * 60) {
        clearInterval(id)
        toast("Se acabó el tiempo. Enviamos tus respuestas.")
        submitRef.current()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [phase, limit])

  function close() {
    const writing = phase === "writing" || phase === "grading"
    if (writing && answers.some((a) => a.trim()) && !window.confirm("¿Salir del examen? Se perderán tus respuestas.")) return
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Examen escrito simulado</DialogTitle>
          <DialogDescription>
            {phase === "setup" && "Configura tu examen escrito"}
            {phase === "creating" && "Preparando tu examen…"}
            {phase === "writing" && "Responde por escrito; la IA califica cuando lo envíes."}
            {phase === "grading" && "Preparando tus resultados: revisando tus respuestas…"}
            {phase === "result" && attempt && `Resultado del examen de práctica · ${attempt.date}`}
          </DialogDescription>
        </DialogHeader>

        {(phase === "setup" || phase === "creating") && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Selecciona temas</Label>
              <TopicPicker topics={topics} selected={selected} onChange={setSelected} />
              {selected.length === 0 && <p className="text-xs text-destructive">Selecciona al menos un tema</p>}
            </div>
            <div className="space-y-2">
              <Label>Límite de tiempo</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Límite de tiempo">
                {LIMITS.map((l) => (
                  <Button
                    key={String(l)}
                    type="button"
                    size="sm"
                    role="radio"
                    aria-checked={limit === l}
                    variant={limit === l ? "default" : "outline"}
                    onClick={() => setLimit(l)}
                  >
                    {l === null ? "Sin límite de tiempo" : `${l} min`}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dificultad</Label>
              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            </div>
            <p className="text-sm text-muted-foreground">
              Este examen tendrá <b>{count} tareas</b>.
            </p>
            <DialogFooter>
              <Button disabled={selected.length === 0 || phase === "creating"} onClick={start}>
                {phase === "creating" ? "Creando examen…" : "Crear examen escrito de práctica"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {(phase === "writing" || phase === "grading") && (
          <div className="space-y-5">
            <p className="sticky top-0 z-10 flex items-center gap-2 bg-background py-1 text-sm font-medium">
              <Clock className="size-4" />
              {limit === null ? formatTime(elapsed) : `Quedan ${formatTime(Math.max(0, limit * 60 - elapsed))}`}
            </p>
            {tasks.map((t, i) => (
              <div key={i} className="space-y-2">
                <Label htmlFor={`task-${i}`} className="block leading-snug">
                  <span className="text-xs text-muted-foreground">
                    Tarea {i + 1} · {t.topic}
                  </span>
                  <span className="mt-1 block font-medium">{t.prompt}</span>
                </Label>
                <Textarea
                  id={`task-${i}`}
                  value={answers[i]}
                  disabled={phase === "grading"}
                  maxLength={6000}
                  rows={5}
                  onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}
                />
              </div>
            ))}
            <DialogFooter>
              <Button disabled={phase === "grading"} onClick={submit}>
                {phase === "grading" ? "Calificando…" : "Enviar examen de práctica"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {phase === "result" && attempt && (
          <div className="space-y-5">
            <div className="flex items-baseline justify-between rounded-lg border p-4">
              <p className="text-4xl font-semibold">
                {attempt.score}
                <span className="text-base font-normal text-muted-foreground"> / 100 puntaje</span>
              </p>
              <span className="text-sm text-muted-foreground">Tiempo: {formatTime(attempt.seconds)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">💪 Buen dominio</p>
                <p className="text-muted-foreground">{attempt.strengths}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">📚 Por repasar</p>
                <p className="text-muted-foreground">{attempt.toReview}</p>
              </div>
            </div>
            <ol className="space-y-4">
              {attempt.tasks.map((t, i) => {
                const g = attempt.grades[i]
                return (
                  <li key={i} className="space-y-2 rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        {i + 1}. {t.prompt}
                      </p>
                      <Badge variant={g.score >= 70 ? "default" : "secondary"}>{g.score}</Badge>
                    </div>
                    <p className="whitespace-pre-wrap text-muted-foreground">{attempt.answers[i].trim() || "(sin respuesta)"}</p>
                    {g.correct && (
                      <p>
                        <Check className="mr-1 inline size-4 text-green-600" />
                        {g.correct}
                      </p>
                    )}
                    {g.missing && <p>⚡ Falta: {g.missing}</p>}
                    {g.solution && (
                      <p className="rounded bg-muted/50 p-2">
                        <span className="font-medium">Solución: </span>
                        {g.solution}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
            <DialogFooter>
              <Button onClick={onClose}>Listo</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

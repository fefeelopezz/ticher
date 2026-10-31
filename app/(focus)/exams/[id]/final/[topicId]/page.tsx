"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Clock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatTime } from "@/components/exam-practice"
import { FocusShell, LessonLoader, Missing, settle, useLessonRoute } from "@/components/focus-shell"
import type { Graded } from "@/components/mock-exam"
import { ScoreRing } from "@/components/question-card"
import { isRight } from "@/lib/grading"
import { cn } from "@/lib/utils"
import { average, today, useStudyTimer, type MockTask, type Question } from "@/lib/store"
import { applyScores, logLesson } from "@/lib/use-prep"
import { FocusSkeleton } from "@/components/page-skeletons"

const LIMITS = [30, 45, 60, 90]
const QUESTIONS = 10
const TASKS = 3

type Result = { score: number; byTopic: Record<string, number>; seconds: number; graded: Graded }

// Modo examen final: the whole exam in one sitting, multiple choice plus written tasks, timed and
// with no explanations until it's handed in. The result ranks topics so the weakest get reviewed first.
export default function FinalExamPage() {
  const { prep, hydrated, generate, update, topicNames, back, found } = useLessonRoute()
  const router = useRouter()
  const [phase, setPhase] = useState<"setup" | "creating" | "created" | "exam" | "grading" | "result">("setup")
  const [limit, setLimit] = useState(60)
  const [questions, setQuestions] = useState<Question[]>([])
  const [tasks, setTasks] = useState<MockTask[]>([])
  const [choices, setChoices] = useState<number[][]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<Result>()
  const startedAt = useRef(0)
  useStudyTimer()

  async function start() {
    setPhase("creating")
    const [quiz, mock] = await Promise.all([
      generate<{ questions: Question[] }>("quiz", { topics: topicNames, count: QUESTIONS, difficulty: "medio" }, "final-quiz"),
      generate<{ tasks: MockTask[] }>("mock", { topics: topicNames, count: TASKS, difficulty: "medio" }, "final-mock"),
    ])
    if (!quiz?.questions.length || !mock?.tasks.length) return setPhase("setup")
    setPhase("created")
    await settle()
    setQuestions(quiz.questions)
    setTasks(mock.tasks)
    setChoices(quiz.questions.map(() => []))
    setAnswers(mock.tasks.map(() => ""))
    startedAt.current = Date.now()
    setElapsed(0)
    setPhase("exam")
    window.scrollTo({ top: 0 })
  }

  async function submit() {
    setPhase("grading")
    const seconds = Math.round((Date.now() - startedAt.current) / 1000)
    const graded = await generate<Graded>("grade", { tasks, answers })
    // Keep everything written on failure so it can be sent again.
    if (!graded) return setPhase("exam")
    // Each question and each written task weighs the same; topics average all their items.
    const items = [
      ...questions.map((q, i) => ({ topic: q.topic, score: isRight(q.correct, choices[i]) ? 100 : 0 })),
      ...tasks.map((t, i) => ({ topic: t.topic, score: graded.grades[i]?.score ?? 0 })),
    ]
    const byTopic: Record<string, number[]> = {}
    items.forEach((it) => (byTopic[it.topic] ??= []).push(it.score))
    const done: Result = {
      score: average(items.map((it) => it.score)),
      byTopic: Object.fromEntries(Object.entries(byTopic).map(([t, s]) => [t, average(s)])),
      seconds,
      graded,
    }
    setResult(done)
    setPhase("result")
    window.scrollTo({ top: 0 })
    update((p) => ({
      ...applyScores(p, done.byTopic, done.score),
      finals: [{ date: today(), score: done.score, seconds }, ...(p.finals ?? [])].slice(0, 20),
    }))
    logLesson()
  }

  // The interval needs the latest submit (it closes over the current answers).
  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
  })

  useEffect(() => {
    if (phase !== "exam") return
    const id = setInterval(() => {
      const s = Math.round((Date.now() - startedAt.current) / 1000)
      setElapsed(s)
      if (s >= limit * 60) {
        clearInterval(id)
        toast("Se acabó el tiempo. Entregamos tu examen.")
        submitRef.current()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [phase, limit])

  if (!hydrated) return <FocusSkeleton />
  if (!found || !prep) return <Missing back={back} />

  function close() {
    const started = phase === "exam" || phase === "grading"
    if (started && !window.confirm("¿Salir del examen final? Se perderán tus respuestas.")) return
    router.push(back)
  }

  const title = `Examen final: ${prep.name}`

  if (phase === "creating" || phase === "created") {
    return (
      <FocusShell back={back} eyebrow="Creando examen final" title={title}>
        <LessonLoader done={phase === "created"} />
      </FocusShell>
    )
  }

  if (phase === "setup") {
    return (
      <FocusShell back={back} eyebrow="Modo examen final" title={title} description="Como el día del examen: con tiempo y sin ayudas hasta que entregues.">
        <div className="space-y-6">
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              • {QUESTIONS} preguntas de opción múltiple y {TASKS} preguntas para responder por escrito.
            </li>
            <li>• Abarca todos los temas: {topicNames.join(", ")}.</li>
            <li>• Las respuestas y explicaciones aparecen recién al entregar.</li>
          </ul>
          <div className="space-y-2">
            <Label>Tiempo</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tiempo del examen">
              {LIMITS.map((l) => (
                <Button key={l} type="button" size="sm" role="radio" aria-checked={limit === l} variant={limit === l ? "default" : "outline"} onClick={() => setLimit(l)}>
                  {l} min
                </Button>
              ))}
            </div>
          </div>
          <Button size="lg" className="h-12 w-full rounded-xl text-base" onClick={start}>
            Empezar examen final
          </Button>
        </div>
      </FocusShell>
    )
  }

  if (phase === "result" && result) {
    const ranked = Object.entries(result.byTopic).sort((a, b) => a[1] - b[1])
    const toReview = ranked.filter(([, s]) => s < (prep.goal ?? 75)).map(([t]) => t)
    return (
      <FocusShell back={back} eyebrow="Modo examen final" title="Resultados">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-2 rounded-3xl border bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
            <ScoreRing value={result.score} size={84} />
            <p className="text-xl font-semibold">Examen final entregado</p>
            <p className="text-sm text-muted-foreground">Tiempo: {formatTime(result.seconds)}</p>
            <p className="font-medium">
              {toReview.length ? `Antes del examen, refuerza: ${toReview.join(", ")}.` : "¡Estás listo en todos los temas!"}
            </p>
            <Button className="mt-3" nativeButton={false} render={<Link href={back} />}>
              Volver a la preparación
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Resultado por tema</p>
            {ranked.map(([t, s]) => (
              <div key={t} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>{t}</span>
                <span className={cn("font-medium tabular-nums", s < (prep.goal ?? 75) && "text-destructive")}>{s}%</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Opción múltiple</p>
            {questions.map((q, i) => {
              const right = isRight(q.correct, choices[i])
              return (
                <div key={i} className="space-y-1 rounded-xl border p-4 text-sm">
                  <p className="font-medium">
                    {right ? "✅" : "❌"} {q.question}
                  </p>
                  <p className="text-muted-foreground">Correcta: {q.correct.map((c) => q.options[c]).join(" / ")}</p>
                  <p>{q.explanation}</p>
                </div>
              )
            })}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Preguntas escritas · {result.graded.score}/100</p>
            {tasks.map((t, i) => {
              const g = result.graded.grades[i]
              return (
                <div key={i} className="space-y-1 rounded-xl border p-4 text-sm">
                  <p className="font-medium">{t.prompt}</p>
                  <p className="text-muted-foreground">Calificación: {g?.score ?? 0}/100</p>
                  {g?.missing && <p>Te faltó: {g.missing}</p>}
                  {g?.solution && <p className="text-muted-foreground">Respuesta modelo: {g.solution}</p>}
                </div>
              )
            })}
          </div>
        </div>
      </FocusShell>
    )
  }

  const answered = choices.filter((c) => c.length).length + answers.filter((a) => a.trim()).length
  return (
    <FocusShell
      back={back}
      onClose={close}
      progress={answered / (questions.length + tasks.length)}
      label={`${answered}/${questions.length + tasks.length}`}
      eyebrow="Modo examen final"
      title={title}
    >
      <div className="space-y-8">
        <p className="sticky top-14 z-10 flex items-center gap-2 bg-background py-2 text-sm font-medium">
          <Clock className="size-4" />
          {formatTime(Math.max(0, limit * 60 - elapsed))} restantes
        </p>

        <section className="space-y-4">
          <h2 className="font-medium">Parte 1 · Opción múltiple</h2>
          {questions.map((q, i) => (
            <fieldset key={i} className="space-y-2 rounded-xl border p-4">
              <legend className="px-1 text-sm font-medium">
                {i + 1}. {q.question}
              </legend>
              {q.correct.length > 1 && <p className="text-xs text-muted-foreground">Varias respuestas posibles</p>}
              {q.options.map((o, j) => {
                const on = choices[i]?.includes(j)
                return (
                  <button
                    key={j}
                    type="button"
                    role={q.correct.length > 1 ? "checkbox" : "radio"}
                    aria-checked={on}
                    disabled={phase === "grading"}
                    onClick={() =>
                      setChoices((all) =>
                        all.map((c, k) => (k !== i ? c : q.correct.length > 1 ? (on ? c.filter((x) => x !== j) : [...c, j]) : [j]))
                      )
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      on ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", on && "border-primary bg-primary text-primary-foreground")}>
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    {o}
                  </button>
                )
              })}
            </fieldset>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="font-medium">Parte 2 · Preguntas escritas</h2>
          {tasks.map((t, i) => (
            <div key={i} className="space-y-2">
              <Label htmlFor={`task-${i}`}>
                {i + 1}. {t.prompt}
              </Label>
              <Textarea
                id={`task-${i}`}
                rows={5}
                value={answers[i]}
                disabled={phase === "grading"}
                onChange={(e) => setAnswers((all) => all.map((a, k) => (k === i ? e.target.value : a)))}
              />
            </div>
          ))}
        </section>

        <Button size="lg" className="h-12 w-full rounded-xl text-base" disabled={phase === "grading"} onClick={submit}>
          {phase === "grading" ? "Corrigiendo tu examen…" : "Entregar examen"}
        </Button>
      </div>
    </FocusShell>
  )
}

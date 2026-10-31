"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CircleCheck, CornerDownLeft, ListOrdered, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuestionCard, ScoreRing } from "@/components/question-card"
import { cn } from "@/lib/utils"
import { NO_LESSONS, isCurrentSummary, today, useStudyTimer, write, type Callout, type Summary } from "@/lib/store"
import { usePrep } from "@/lib/use-prep"
import { FocusSkeleton } from "@/components/page-skeletons"
import { LessonLoader, settle } from "@/components/focus-shell"

const CALLOUTS: Record<Callout["kind"], { icon: string; className: string }> = {
  definicion: { icon: "📖", className: "border-amber-500/40 bg-amber-500/[0.06]" },
  ejemplo: { icon: "📄", className: "border-sky-500/40 bg-sky-500/[0.06]" },
  analogia: { icon: "💡", className: "border-emerald-500/40 bg-emerald-500/[0.06]" },
  error: { icon: "❗", className: "border-red-500/40 bg-red-500/[0.06]" },
}

// The AI marks key terms with **bold**; everything else stays plain text (never parsed as HTML).
function Rich({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  )
}

const readingMinutes = (s: Summary) => {
  const words = [
    s.intro,
    ...s.sections.flatMap((x) => [x.body, ...x.callouts.map((c) => c.text), ...x.cards.map((c) => c.text), ...x.steps.map((c) => c.text)]),
  ]
    .join(" ")
    .split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

// Astra's "Texto inteligente" as a full page: intro, one step per section with an inline check,
// and a final quiz that completes the lesson.
export default function SummaryPage() {
  const { id, topicId } = useParams<{ id: string; topicId: string }>()
  const router = useRouter()
  const { prep, hydrated, busy, update, generate, recordQuiz } = usePrep(id)
  const [step, setStep] = useState(0)
  const [checks, setChecks] = useState<Record<number, boolean>>({})
  const [finals, setFinals] = useState<boolean[]>([])
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const requested = useRef(false)
  const startedAt = useRef(0)
  useStudyTimer()

  const topic = prep?.topics?.find((t) => t.id === topicId)
  const stored = topic ? prep?.summaries?.[topic.id] : undefined
  const summary = isCurrentSummary(stored) ? stored : undefined
  const back = `/exams/${id}`
  const total = summary ? summary.sections.length + 2 : 1
  const section = summary && step >= 1 && step <= summary.sections.length ? summary.sections[step - 1] : undefined
  const isFinal = !!summary && step === total - 1
  const pendingCheck = !!section?.check && checks[step] === undefined
  const finalQuiz = summary?.finalQuiz ?? []

  async function create() {
    if (!topic) return
    setFailed(false)
    const res = await generate<{ summary: Summary }>("summary", { topics: [topic.name] })
    if (!res?.summary) return setFailed(true)
    // Only the first reading shows the loader; "Generar otro resumen" swaps it in place.
    if (!summary) {
      setReady(true)
      await settle()
    }
    update((p) => ({ ...p, summaries: { ...p.summaries, [topic.id]: res.summary } }))
    setStep(0)
    setChecks({})
    setFinals([])
    setReady(false)
  }

  // Generate on first visit (or when an old-format summary is stored); the ref stops double requests.
  useEffect(() => {
    if (hydrated && topic && !summary && !requested.current) {
      requested.current = true
      create()
    }
  })

  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  const next = () => setStep((s) => Math.min(total - 1, s + 1))

  // Enter continues on reading steps; question cards handle their own Enter.
  useEffect(() => {
    if (!summary || pendingCheck || isFinal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return
      e.preventDefault()
      setStep((s) => Math.min(total - 1, s + 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [summary, pendingCheck, isFinal, total])

  function answerFinal(right: boolean) {
    const all = [...finals, right]
    setFinals(all)
    if (all.length < finalQuiz.length || !topic) return
    // The lesson's score counts the section checks and the final quiz, like Astra's attempt score.
    const answered = [...Object.values(checks), ...all]
    const accuracy = Math.round((answered.filter(Boolean).length / answered.length) * 100)
    // Like a quiz, the reading earns a tenth of its accuracy: all right adds 10% to the topic.
    recordQuiz({
      byTopic: { [topic.name]: accuracy },
      accuracy,
      seconds: Math.round((Date.now() - startedAt.current) / 1000),
      count: answered.length,
    })
    update((p) => ({
      ...p,
      topics: (p.topics ?? []).map((t) => (t.id === topic.id ? { ...t, lessons: t.lessons + 1 } : t)),
      summaries: { ...p.summaries, [topic.id]: { ...p.summaries![topic.id], score: accuracy } },
    }))
    write<string[]>("lessons", NO_LESSONS, (l) => [...l, today()])
  }

  if (!hydrated) return <FocusSkeleton />

  if (!prep || !topic) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 py-24 text-center">
        <p className="text-muted-foreground">No encontramos este tema.</p>
        <Button nativeButton={false} render={<Link href={prep ? back : "/exams"} />}>
          Volver
        </Button>
      </div>
    )
  }

  const header = (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label={step > 0 ? "Paso anterior" : "Volver a la preparación"}
          onClick={() => (step > 0 ? setStep(step - 1) : router.push(back))}
        >
          <ArrowLeft />
        </Button>
        <div className="mx-auto flex w-full max-w-sm items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((step + 1) / total) * 100}%` }} />
          </div>
          <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
            {summary ? `${step + 1} / ${total}` : ""}
          </span>
        </div>
        <Button variant="ghost" size="icon" aria-label="Cerrar" nativeButton={false} render={<Link href={back} />}>
          <X />
        </Button>
      </div>
    </header>
  )

  if (!summary || ready) {
    return (
      <>
        {header}
        <main className="mx-auto w-full max-w-[40rem] flex-1 px-5 py-16">
          {failed ? (
            <div className="space-y-4 text-center">
              <p className="font-serif text-2xl">No pudimos crear el resumen</p>
              <p className="text-muted-foreground">Revisa el mensaje de abajo e intenta otra vez.</p>
              <Button onClick={create} disabled={busy !== null}>
                <RotateCcw /> Reintentar
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">Creando texto inteligente</p>
              <h1 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">{topic.name}</h1>
              <LessonLoader done={ready} />
            </div>
          )}
        </main>
      </>
    )
  }

  const correctFinal = finals.filter(Boolean).length
  const done = isFinal && finals.length >= finalQuiz.length
  const showContinue = !isFinal && !pendingCheck

  return (
    <>
      {header}
      <main className="mx-auto w-full max-w-[40rem] flex-1 px-5 pt-10 pb-8 sm:pt-14">
        {step === 0 && (
          <div className="space-y-8">
            <div className="rounded-3xl border bg-gradient-to-b from-primary/15 via-primary/[0.04] to-transparent p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-primary/20 px-2 py-0.5 font-semibold tracking-wide text-foreground uppercase">
                  Texto inteligente
                </span>
                {readingMinutes(summary)} min de lectura · {total} pasos
              </div>
              <h1 className="mt-5 font-serif text-4xl leading-[1.1] tracking-tight text-balance sm:text-5xl">{summary.title}</h1>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                <Rich text={summary.intro} />
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border">
              <p className="flex items-center gap-2 border-b px-5 py-3 text-sm font-medium">
                <ListOrdered className="size-4 text-primary" /> Lo que viene
              </p>
              <ol className="divide-y">
                {summary.sections.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setStep(i + 1)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs tabular-nums">{i + 1}</span>
                      <span className="font-medium">{s.title}</span>
                    </button>
                  </li>
                ))}
                <li className="flex items-center gap-3 px-5 py-3.5 text-sm text-muted-foreground">
                  <CircleCheck className="size-5 shrink-0" />
                  Un cuestionario corto al final
                  <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">Cuestionario</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {section && (
          <article className="space-y-8">
            <header className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                Sección {step} de {summary.sections.length}
              </p>
              <h2 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">{section.title}</h2>
              {section.subtitle && <p className="font-serif text-xl leading-snug text-muted-foreground">{section.subtitle}</p>}
            </header>

            <div className="space-y-4 text-[17px] leading-[1.75] text-foreground/85">
              {section.body
                .split(/\n\s*\n/)
                .filter((p) => p.trim())
                .map((p, i) => (
                  <p key={i}>
                    <Rich text={p.trim()} />
                  </p>
                ))}
            </div>

            {section.callouts.map((c, i) => (
              <aside key={i} className={cn("rounded-2xl border p-5", CALLOUTS[c.kind]?.className)}>
                <p className="flex items-center gap-2 font-semibold">
                  <span aria-hidden>{CALLOUTS[c.kind]?.icon}</span>
                  {c.title}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">
                  <Rich text={c.text} />
                </p>
              </aside>
            ))}

            {section.cards.length > 0 && (
              <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2" role="list" aria-label="Tarjetas">
                {section.cards.map((c, i) => (
                  <div key={i} role="listitem" className="w-64 shrink-0 snap-start rounded-2xl bg-muted/60 p-5">
                    <p className="font-semibold">{c.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      <Rich text={c.text} />
                    </p>
                  </div>
                ))}
              </div>
            )}

            {section.steps.length > 0 && (
              <ol className="space-y-5">
                {section.steps.map((s, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-[15px] leading-relaxed text-muted-foreground">
                        <Rich text={s.text} />
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {section.check && checks[step] === undefined && (
              <div className="pt-2">
                <QuestionCard
                  key={step}
                  question={section.check}
                  label="Cuestionario rápido"
                  onDone={(right) => {
                    setChecks((c) => ({ ...c, [step]: right }))
                    next()
                  }}
                />
              </div>
            )}
          </article>
        )}

        {isFinal && (
          <div className="space-y-8">
            <header className="space-y-2">
              <h2 className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl">Eso es toda la lección</h2>
              <p className="text-muted-foreground">
                {finalQuiz.length ? "Refuerza lo aprendido con un quiz final para completar la lección." : "¡Buen trabajo, llegaste al final!"}
              </p>
            </header>

            {!done ? (
              <QuestionCard
                key={`final-${finals.length}`}
                question={finalQuiz[finals.length]}
                label={`Cuestionario final · ${finals.length + 1} de ${finalQuiz.length}`}
                continueLabel={finals.length === finalQuiz.length - 1 ? "Ver resultado" : "Continuar"}
                onDone={answerFinal}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-3xl border bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
                {finalQuiz.length > 0 && <ScoreRing value={Math.round((correctFinal / finalQuiz.length) * 100)} size={84} />}
                <p className="text-xl font-semibold">Lección completada</p>
                {finalQuiz.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {correctFinal}/{finalQuiz.length} respuestas correctas en el cuestionario final
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-2 pt-3">
                  <Button nativeButton={false} render={<Link href={back} />}>
                    Volver a la preparación
                  </Button>
                  <Button variant="outline" onClick={create} disabled={busy !== null}>
                    <RotateCcw /> {busy ? "Creando…" : "Generar otro resumen"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {showContinue && (
          <div className="sticky bottom-0 -mx-5 mt-10 bg-gradient-to-t from-background via-background to-transparent px-5 pt-8 pb-6">
            <Button size="lg" className="h-12 w-full rounded-xl text-base" onClick={next}>
              Continuar <CornerDownLeft />
            </Button>
          </div>
        )}
      </main>
    </>
  )
}

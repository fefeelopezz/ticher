"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, ChevronRight, FileText, Layers, ListChecks, PenLine, Plus, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DifficultyPicker, Flashcards, Quiz, TopicPicker, formatTime } from "@/components/exam-practice"
import { MockExam, type Graded } from "@/components/mock-exam"
import { GoalBar } from "@/components/goal-bar"
import { ExamMaterials } from "@/components/subjects-section"
import {
  DEFAULT_GOAL,
  NO_EVENTS,
  average,
  daysUntil,
  forecast,
  readiness,
  today,
  useStudyTimer,
  write,
  type Card as StudyCard,
  type CalendarEvent,
  type Difficulty,
  type MockAttempt,
  type MockTask,
  type Question,
  type Topic,
} from "@/lib/store"
import { applyScores, same, usePrep } from "@/lib/use-prep"

const QUIZ_SIZES = [5, 10, 15]

export default function PrepPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { prep, hydrated, materials, busy, setPreps, update, generate, recordQuiz } = usePrep(id)
  const [newTopic, setNewTopic] = useState("")
  const [cardsOpen, setCardsOpen] = useState(false)
  const [quiz, setQuiz] = useState<{ key: number; title: string; questions: Question[] } | null>(null)
  const [quizSetup, setQuizSetup] = useState<{ topics: string[]; count: number; difficulty: Difficulty } | null>(null)
  const [mock, setMock] = useState<{ key: number; review?: MockAttempt; topics?: string[] } | null>(null)
  const [lessonFor, setLessonFor] = useState<Topic | null>(null)
  // A topic's flashcards are a one-off deck; the exam's saved deck stays untouched.
  const [deck, setDeck] = useState<StudyCard[] | null>(null)
  useStudyTimer()

  if (!prep && !hydrated) return null
  if (!prep) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <p className="text-muted-foreground">No encontramos esta preparación.</p>
        <Button nativeButton={false} render={<Link href="/exams" />}>
          Volver a Exámenes
        </Button>
      </div>
    )
  }

  const goal = prep.goal ?? DEFAULT_GOAL
  const topics = prep.topics ?? []
  // Quizzes and mock exams need topics; before they exist the whole subject counts as one.
  const topicNames = topics.length ? topics.map((t) => t.name) : [prep.subject]
  const score = readiness(prep)
  const days = daysUntil(prep.date)
  const projected = forecast(score, prep.history ?? [], prep.date)
  const hasPace = (prep.history ?? []).some((h) => h.date < today())
  const lessons = topics.reduce((n, t) => n + t.lessons, 0)
  const inGoal = topics.filter((t) => t.mastery >= goal).length
  const next = topics.find((t) => t.mastery < goal)
  const weak = topics.filter((t) => t.mastery < goal).sort((a, b) => a.mastery - b.mastery).slice(0, 3)
  const attempts = prep.attempts ?? []
  const quizzes = prep.quizzes ?? []
  const summaryHref = (topic: Topic) => `/exams/${id}/summary/${topic.id}`

  function addTopics(names: string[]) {
    update((p) => {
      const current = p.topics ?? []
      const fresh = names.filter((n) => n.trim() && !current.some((t) => same(t.name, n)))
      return { ...p, topics: [...current, ...fresh.map((name) => ({ id: crypto.randomUUID(), name: name.trim(), mastery: 0, lessons: 0 }))] }
    })
  }

  async function generateTopics() {
    const res = await generate<{ topics: string[] }>("topics")
    if (res) addTopics(res.topics)
  }

  async function openCards(regenerate = false) {
    if (prep!.cards?.length && !regenerate) return setCardsOpen(true)
    const res = await generate<{ cards: StudyCard[] }>("flashcards")
    if (!res?.cards.length) return
    update((p) => ({ ...p, cards: res.cards }))
    setCardsOpen(true)
  }

  async function topicCards(topic: Topic) {
    const res = await generate<{ cards: StudyCard[] }>("flashcards", { topics: [topic.name] }, `cards:${topic.id}`)
    if (!res?.cards.length) return
    setDeck(res.cards)
    setCardsOpen(true)
  }

  async function startQuiz(title: string, topicsToAsk: string[], count: number, difficulty: Difficulty, busyKey: string) {
    const res = await generate<{ questions: Question[] }>("quiz", { topics: topicsToAsk, count, difficulty }, busyKey)
    if (!res?.questions.length) return false
    setQuiz((prev) => ({ key: (prev?.key ?? 0) + 1, title, questions: res.questions }))
    return true
  }

  async function finishMock(attempt: MockAttempt) {
    const byTopic: Record<string, number[]> = {}
    attempt.tasks.forEach((t, i) => (byTopic[t.topic] ??= []).push(attempt.grades[i].score))
    const scores = Object.fromEntries(Object.entries(byTopic).map(([t, s]) => [t, average(s)]))
    update((p) => ({ ...applyScores(p, scores, attempt.score), attempts: [attempt, ...(p.attempts ?? [])].slice(0, 20) }))
  }

  function remove() {
    if (!window.confirm(`¿Eliminar "${prep!.name}"? Se perderá su progreso.`)) return
    write<CalendarEvent[]>("events", NO_EVENTS, (all) => all.filter((e) => e.prepId !== id))
    setPreps((all) => all.filter((p) => p.id !== id))
    router.push("/exams")
  }

  const lessonHref = (topic: string) =>
    `/?prompt=${encodeURIComponent(`Quiero una lección sobre "${topic}" para mi examen "${prep.name}". Explícame lo esencial y luego hazme una pregunta para comprobar que entendí.`)}&subject=${encodeURIComponent(prep.subject)}`

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/exams" />}>
          <ArrowLeft /> Exámenes
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Eliminar preparación" onClick={remove}>
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase">{prep.subject}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{prep.name}</h1>
        <p className="text-sm text-muted-foreground">
          {days > 1 ? `En ${days} días` : days === 1 ? "Mañana" : days === 0 ? "Hoy" : "Finalizado"} · {lessons} lecciones ·{" "}
          {materials.length} archivos de estudio
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-4xl font-semibold">
              {score}
              <span className="text-lg font-normal text-muted-foreground">% de preparación</span>
            </p>
            <span className="text-sm text-muted-foreground">Meta {goal}%</span>
          </div>
          <GoalBar value={score} goal={goal} />
          <p className="text-sm text-muted-foreground">
            {days < 0
              ? "El examen ya pasó."
              : hasPace
                ? `A este ritmo llegarás a cerca del ${projected}% el día del examen.`
                : "Completa lecciones durante unos días para ver tu pronóstico."}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="path">
        <TabsList>
          <TabsTrigger value="path">Ruta de estudio</TabsTrigger>
          <TabsTrigger value="progress">Progreso</TabsTrigger>
          <TabsTrigger value="files">Archivos</TabsTrigger>
        </TabsList>

        <TabsContent value="path" className="space-y-4 pt-2">
          {topics.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Aún no tienes temas</CardTitle>
                <CardDescription>
                  {materials.length
                    ? `Ticher puede leer tus ${materials.length} archivos de ${prep.subject} y dividir el examen en temas.`
                    : "Sin material, Ticher usará el temario típico de la materia. Puedes subir apuntes en la pestaña Archivos."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={generateTopics} disabled={busy !== null}>
                  <Sparkles /> {busy === "topics" ? "Generando temas…" : "Generar temas con IA"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {next && (
                <Card className="border-primary/40">
                  <CardHeader>
                    <CardDescription className="text-xs uppercase">Lo que sigue</CardDescription>
                    <CardTitle>{next.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button variant="outline" nativeButton={false} render={<Link href={summaryHref(next)} />}>
                      <FileText /> Leer resumen
                    </Button>
                    <Button nativeButton={false} render={<Link href={lessonHref(next.name)} />}>
                      <BookOpen /> Lección con el tutor
                    </Button>
                  </CardContent>
                </Card>
              )}

              <ol className="space-y-2">
                {topics.map((t, i) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      onClick={() => setLessonFor(t)}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{i + 1}</span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{t.name}</span>
                          <span className="shrink-0 text-muted-foreground">{t.mastery}%</span>
                        </div>
                        <GoalBar value={t.mastery} goal={goal} className="h-1.5" />
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addTopics([newTopic])
              setNewTopic("")
            }}
          >
            <Input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Agregar un tema a mano"
              aria-label="Agregar un tema"
              maxLength={120}
            />
            <Button type="submit" variant="outline" disabled={!newTopic.trim()}>
              <Plus /> Agregar
            </Button>
          </form>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <Layers className="size-4" />
                <CardTitle>Tarjetas de memoria</CardTitle>
                <CardDescription>
                  {prep.cards?.length ? `${prep.cards.length} tarjetas listas` : "Repasa conceptos clave rápido."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openCards()} disabled={busy !== null}>
                  {busy === "flashcards" ? "Creando…" : prep.cards?.length ? "Repasar" : "Crear tarjetas"}
                </Button>
                {!!prep.cards?.length && (
                  <Button size="sm" variant="ghost" onClick={() => openCards(true)} disabled={busy !== null}>
                    Nuevas
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <ListChecks className="size-4" />
                <CardTitle>Cuestionario</CardTitle>
                <CardDescription>Opción múltiple con explicación de cada respuesta.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => setQuizSetup({ topics: topicNames, count: 10, difficulty: "medio" })}
                >
                  Crear cuestionario
                </Button>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <PenLine className="size-4" />
                <CardTitle>Examen escrito simulado</CardTitle>
                <CardDescription>Responde preguntas y obtén una calificación.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" disabled={busy !== null} onClick={() => setMock((prev) => ({ key: (prev?.key ?? 0) + 1 }))}>
                  Comenzar simulacro
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 pt-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Temas en la meta", topics.length ? `${inGoal} / ${topics.length}` : "—"],
              ["Días para el examen", Math.max(0, days)],
              ["Lecciones", lessons],
            ].map(([label, value]) => (
              <Card key={label} size="sm">
                <CardHeader>
                  <CardDescription>{label}</CardDescription>
                  <p className="text-2xl font-semibold">{value}</p>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Simulacros</CardTitle>
              <CardDescription>
                {attempts.length
                  ? `${attempts.length} exámenes escritos · promedio ${average(attempts.map((a) => a.score))}/100`
                  : "Aún no presentas un examen escrito simulado."}
              </CardDescription>
            </CardHeader>
            {attempts.length > 0 && (
              <CardContent className="space-y-2">
                {attempts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setMock((prev) => ({ key: (prev?.key ?? 0) + 1, review: a }))}
                    className="flex w-full justify-between rounded-lg border p-3 text-left text-sm hover:bg-muted/50"
                  >
                    <span>
                      {a.date} · {a.tasks.length} tareas · {formatTime(a.seconds)}
                    </span>
                    <span className="font-medium">{a.score}/100</span>
                  </button>
                ))}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cuestionarios</CardTitle>
              <CardDescription>
                {quizzes.length
                  ? `${quizzes.length} cuestionarios · precisión promedio ${average(quizzes.map((q) => q.accuracy))}%`
                  : "Aún no haces cuestionarios."}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Áreas por reforzar</CardTitle>
              <CardDescription>
                {!topics.length
                  ? "Genera los temas para ver tu avance por tema."
                  : weak.length
                    ? `${weak.length} temas por debajo de tu meta`
                    : "¡No tienes lagunas de conocimiento!"}
              </CardDescription>
            </CardHeader>
            {weak.length > 0 && (
              <CardContent className="space-y-2">
                {weak.map((t) => (
                  <Link key={t.id} href={lessonHref(t.name)} className="flex justify-between rounded-lg border p-3 text-sm hover:bg-muted/50">
                    <span>{t.name}</span>
                    <span className="text-muted-foreground">{t.mastery}%</span>
                  </Link>
                ))}
              </CardContent>
            )}
          </Card>

          {topics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Temas y dominio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topics.map((t) => (
                  <div key={t.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t.name}</span>
                      <span className="text-muted-foreground">
                        {t.mastery}% · {t.lessons} lecc.
                      </span>
                    </div>
                    <GoalBar value={t.mastery} goal={goal} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="files" className="pt-2">
          <ExamMaterials subject={prep.subject} />
        </TabsContent>
      </Tabs>

      {lessonFor && (
        <Dialog open onOpenChange={(o) => !o && setLessonFor(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{lessonFor.name}</DialogTitle>
              <DialogDescription>¿Cómo quieres estudiar este tema?</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {[
                { icon: FileText, title: "Texto inteligente", text: "Lectura paso a paso con preguntas rápidas.", href: summaryHref(lessonFor) },
                {
                  icon: ListChecks,
                  title: "Opción múltiple",
                  text: "Cuestionario con explicación de cada respuesta.",
                  run: () => setQuizSetup({ topics: [lessonFor.name], count: 10, difficulty: "medio" }),
                },
                {
                  icon: Layers,
                  title: "Tarjetas de repaso",
                  text: "Conceptos clave de este tema, uno por tarjeta.",
                  busy: busy === `cards:${lessonFor.id}`,
                  run: () => topicCards(lessonFor),
                },
                {
                  icon: PenLine,
                  title: "Examen escrito",
                  text: "Responde por escrito y recibe una calificación.",
                  run: () => setMock((prev) => ({ key: (prev?.key ?? 0) + 1, topics: [lessonFor.name] })),
                },
                { icon: BookOpen, title: "Lección con el tutor", text: "El tutor te explica y te pregunta en el chat.", href: lessonHref(lessonFor.name) },
              ].map(({ icon: Icon, title, text, href, run, busy: loading }) => {
                const content = (
                  <>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className={`size-4 ${loading ? "animate-pulse" : ""}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{loading ? "Creando…" : title}</span>
                      <span className="block text-xs text-muted-foreground">{text}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </>
                )
                const cls =
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                return href ? (
                  <Link key={title} href={href} className={cls}>
                    {content}
                  </Link>
                ) : (
                  <button
                    key={title}
                    type="button"
                    className={cls}
                    disabled={busy !== null}
                    onClick={async () => {
                      await run?.()
                      setLessonFor(null)
                    }}
                  >
                    {content}
                  </button>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Flashcards
        cards={deck ?? prep.cards ?? []}
        open={cardsOpen}
        onOpenChange={(o) => {
          setCardsOpen(o)
          if (!o) setDeck(null)
        }}
      />

      {quizSetup && (
        <Dialog open onOpenChange={(o) => !o && setQuizSetup(null)}>
          <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo cuestionario</DialogTitle>
              <DialogDescription>Opción múltiple; algunas preguntas tienen varias respuestas correctas.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Selecciona temas</Label>
                <TopicPicker topics={topicNames} selected={quizSetup.topics} onChange={(t) => setQuizSetup({ ...quizSetup, topics: t })} />
              </div>
              <div className="space-y-2">
                <Label>Número de preguntas</Label>
                <div className="flex gap-2" role="radiogroup" aria-label="Número de preguntas">
                  {QUIZ_SIZES.map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={quizSetup.count === n}
                      variant={quizSetup.count === n ? "default" : "outline"}
                      onClick={() => setQuizSetup({ ...quizSetup, count: n })}
                    >
                      {n} preguntas
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dificultad</Label>
                <DifficultyPicker value={quizSetup.difficulty} onChange={(d) => setQuizSetup({ ...quizSetup, difficulty: d })} />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!quizSetup.topics.length || busy !== null}
                onClick={async () => {
                  if (await startQuiz("Cuestionario", quizSetup.topics, quizSetup.count, quizSetup.difficulty, "quiz")) setQuizSetup(null)
                }}
              >
                {busy === "quiz" ? "Creando cuestionario…" : "Comenzar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {quiz && <Quiz key={quiz.key} title={quiz.title} questions={quiz.questions} onClose={() => setQuiz(null)} onFinish={recordQuiz} />}

      {mock && (
        <MockExam
          key={mock.key}
          topics={mock.topics ?? topicNames}
          review={mock.review}
          create={async (chosen, count, difficulty) =>
            (await generate<{ tasks: MockTask[] }>("mock", { topics: chosen, count, difficulty }))?.tasks
          }
          grade={(tasks, answers) => generate<Graded>("grade", { tasks, answers })}
          onDone={finishMock}
          onClose={() => setMock(null)}
        />
      )}
    </div>
  )
}

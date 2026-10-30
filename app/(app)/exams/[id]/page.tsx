"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, FileText, Layers, ListChecks, PenLine, Plus, Sparkles, Trash2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatTime } from "@/components/exam-practice"
import { GoalBar } from "@/components/goal-bar"
import { ExamMaterials } from "@/components/subjects-section"
import {
  DEFAULT_GOAL,
  NO_EVENTS,
  average,
  daysUntil,
  forecast,
  isCurrentSummary,
  readiness,
  today,
  useStudyTimer,
  write,
  type CalendarEvent,
  type SavedLesson,
  type Topic,
} from "@/lib/store"
import { same, usePrep } from "@/lib/use-prep"
import { PrepSkeleton } from "@/components/page-skeletons"

const SAVED_KINDS: Record<SavedLesson["kind"], { icon: LucideIcon; title: string }> = {
  quiz: { icon: ListChecks, title: "Opción múltiple" },
  cards: { icon: Layers, title: "Tarjetas de repaso" },
  written: { icon: PenLine, title: "Examen escrito" },
}

const savedSize = (l: SavedLesson) =>
  l.kind === "quiz" ? `${l.questions.length} preguntas` : l.kind === "cards" ? `${l.cards.length} tarjetas` : `${l.attempt.tasks.length} tareas`

type SavedItem = { key: string; icon: LucideIcon; title: string; detail: string; href: string; score?: number }

// The lessons already created for a topic, listed under its options so they can be reopened.
function SavedLessons({ items }: { items: SavedItem[] }) {
  if (!items.length) return null
  return (
    <div className="space-y-1.5 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">Tus lecciones</p>
      <ul className="space-y-1">
        {items.map(({ key, icon: Icon, title, detail, href, score }) => (
          <li key={key}>
            <Link href={href} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60">
              <Icon className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">
                {title} <span className="text-muted-foreground">· {detail}</span>
              </span>
              {score !== undefined && <span className="shrink-0 text-sm font-medium tabular-nums">{score}%</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PrepPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { prep, hydrated, materials, busy, setPreps, update, generate } = usePrep(id)
  const [newTopic, setNewTopic] = useState("")
  // The topic whose lesson options are unfolded below its row.
  const [openTopic, setOpenTopic] = useState<string | null>(null)
  useStudyTimer()

  if (!prep && !hydrated) return <PrepSkeleton />
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

  // Each lesson kind has its own page; "all" practises the whole exam.
  const lessonPage = (kind: "quiz" | "cards" | "written", topicId = "all") => `/exams/${id}/${kind}/${topicId}`

  function remove() {
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
        <Dialog>
          <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Eliminar preparación" />}>
            <Trash2 />
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </span>
              <DialogTitle>¿Eliminar &ldquo;{prep.name}&rdquo;?</DialogTitle>
              <DialogDescription>
                Se perderán sus temas, tu progreso y los resultados de cuestionarios. Tus archivos de {prep.subject} se conservan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
              <Button variant="destructive" onClick={remove}>
                Eliminar examen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                {topics.map((t, i) => {
                  const open = openTopic === t.id
                  return (
                    <li key={t.id} className={`rounded-lg border transition-colors ${open ? "border-primary/40" : "hover:border-primary/40"}`}>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`lessons-${t.id}`}
                        className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        onClick={() => setOpenTopic(open ? null : t.id)}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{i + 1}</span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex justify-between gap-2 text-sm">
                            <span className="truncate font-medium">{t.name}</span>
                            <span className="shrink-0 text-muted-foreground">{t.mastery}%</span>
                          </div>
                          <GoalBar value={t.mastery} goal={goal} className="h-1.5" />
                        </div>
                        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open && (
                        <div id={`lessons-${t.id}`} className="space-y-3 px-3 pt-2 pb-3 animate-in fade-in slide-in-from-top-1">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {[
                              { icon: FileText, title: "Texto inteligente", text: "Lectura paso a paso con preguntas rápidas.", href: summaryHref(t) },
                              { icon: ListChecks, title: "Opción múltiple", text: "Cuestionario con explicación de cada respuesta.", href: lessonPage("quiz", t.id) },
                              { icon: Layers, title: "Tarjetas de repaso", text: "Conceptos clave de este tema, uno por tarjeta.", href: lessonPage("cards", t.id) },
                              { icon: PenLine, title: "Examen escrito", text: "Responde por escrito y recibe una calificación.", href: lessonPage("written", t.id) },
                              { icon: BookOpen, title: "Lección con el tutor", text: "El tutor te explica y te pregunta en el chat.", href: lessonHref(t.name) },
                            ].map(({ icon: Icon, title, text, href }) => (
                              <Link
                                key={title}
                                href={href}
                                className="group flex items-center gap-3 rounded-lg bg-muted/40 p-3 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                              >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                                  <Icon className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium">{title}</span>
                                  <span className="block text-xs text-muted-foreground">{text}</span>
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                              </Link>
                            ))}
                          </div>
                          <SavedLessons
                            items={[
                              ...(isCurrentSummary(prep.summaries?.[t.id])
                                ? [{ key: "summary", icon: FileText, title: "Texto inteligente", detail: "Lectura guardada", href: summaryHref(t), score: prep.summaries?.[t.id]?.score }]
                                : []),
                              ...(prep.savedLessons ?? [])
                                .filter((l) => l.topicId === t.id)
                                .map((l) => ({ key: l.id, ...SAVED_KINDS[l.kind], detail: `${l.date} · ${savedSize(l)}`, href: `/exams/${id}/lessons/${l.id}`, score: l.score })),
                            ]}
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
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
              <CardContent>
                <Button size="sm" nativeButton={false} render={<Link href={lessonPage("cards")} />}>
                  {prep.cards?.length ? "Repasar" : "Crear tarjetas"}
                </Button>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <ListChecks className="size-4" />
                <CardTitle>Cuestionario</CardTitle>
                <CardDescription>Opción múltiple con explicación de cada respuesta.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" nativeButton={false} render={<Link href={lessonPage("quiz")} />}>
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
                <Button size="sm" nativeButton={false} render={<Link href={lessonPage("written")} />}>
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
                  <Link
                    key={a.id}
                    href={`/exams/${id}/attempts/${a.id}`}
                    className="flex w-full justify-between rounded-lg border p-3 text-left text-sm hover:bg-muted/50"
                  >
                    <span>
                      {a.date} · {a.tasks.length} tareas · {formatTime(a.seconds)}
                    </span>
                    <span className="font-medium">{a.score}/100</span>
                  </Link>
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

    </div>
  )
}

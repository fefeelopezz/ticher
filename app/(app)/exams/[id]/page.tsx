"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Layers, ListChecks, Plus, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Flashcards, PracticeExam } from "@/components/exam-practice"
import { GoalBar } from "@/components/goal-bar"
import { postJson } from "@/lib/api"
import { toPayload } from "@/lib/files"
import {
  DEFAULT_GOAL,
  NO_EVENTS,
  NO_LESSONS,
  NO_PREPS,
  NO_SUBJECTS,
  blend,
  bump,
  daysUntil,
  forecast,
  readiness,
  today,
  useStored,
  useStudyTimer,
  withSnapshot,
  write,
  type Card as StudyCard,
  type CalendarEvent,
  type ExamPrep,
  type Question,
  type Subject,
  type Topic,
} from "@/lib/store"

type Kind = "topics" | "flashcards" | "quiz"

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export default function PrepPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [preps, setPreps] = useStored<ExamPrep[]>("preps", NO_PREPS)
  const [subjects] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  const [busy, setBusy] = useState<Kind | null>(null)
  const [newTopic, setNewTopic] = useState("")
  const [cardsOpen, setCardsOpen] = useState(false)
  const [quiz, setQuiz] = useState<{ key: number; questions: Question[] } | null>(null)
  useStudyTimer()

  const prep = preps.find((p) => p.id === id)
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
  const materials = subjects.find((s) => same(s.name, prep.subject))?.materials ?? []

  // Every change re-derives readiness and records today's snapshot for the forecast.
  function update(fn: (p: ExamPrep) => ExamPrep) {
    setPreps((all) =>
      all.map((p) => {
        if (p.id !== id) return p
        const changed = fn(p)
        const mastery = readiness(changed)
        return { ...changed, mastery, history: withSnapshot(changed.history, mastery) }
      })
    )
  }

  const adjustTopics = (fn: (t: Topic) => Topic) => update((p) => ({ ...p, topics: (p.topics ?? []).map(fn) }))

  function completeLesson(topic?: Topic) {
    write<string[]>("lessons", NO_LESSONS, (l) => [...l, today()])
    if (topic) {
      adjustTopics((t) => (t.id === topic.id ? { ...t, mastery: bump(t.mastery, 10), lessons: t.lessons + 1 } : t))
      toast.success(`¡+10% en ${topic.name}!`)
    } else {
      update((p) => ({ ...p, mastery: bump(p.mastery, 10) }))
      toast.success("¡+10%!")
    }
  }

  function addTopics(names: string[]) {
    update((p) => {
      const current = p.topics ?? []
      const fresh = names.filter((n) => n.trim() && !current.some((t) => same(t.name, n)))
      return { ...p, topics: [...current, ...fresh.map((name) => ({ id: crypto.randomUUID(), name: name.trim(), mastery: 0, lessons: 0 }))] }
    })
  }

  async function generate<T>(kind: Kind): Promise<T | undefined> {
    setBusy(kind)
    try {
      const { files, skipped } = await toPayload(materials)
      if (skipped.length) toast.info(`No se enviaron a la IA: ${skipped.join(", ")} (formato no compatible o muy grande).`)
      return await postJson<T>("/api/generate", {
        kind,
        exam: { name: prep!.name, subject: prep!.subject },
        topics: topics.map((t) => t.name),
        files,
      })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
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

  async function startQuiz() {
    const res = await generate<{ questions: Question[] }>("quiz")
    if (res?.questions.length) setQuiz((prev) => ({ key: (prev?.key ?? 0) + 1, questions: res.questions }))
  }

  function finishQuiz(byTopic: Record<string, number>, total: number) {
    if (topics.length) {
      adjustTopics((t) => {
        const hit = Object.entries(byTopic).find(([name]) => same(name, t.name))
        return hit ? { ...t, mastery: blend(t.mastery, hit[1]) } : t
      })
    } else {
      update((p) => ({ ...p, mastery: blend(p.mastery, total) }))
    }
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
        </TabsList>

        <TabsContent value="path" className="space-y-4 pt-2">
          {topics.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Aún no tienes temas</CardTitle>
                <CardDescription>
                  {materials.length
                    ? `Ticher puede leer tus ${materials.length} archivos de ${prep.subject} y dividir el examen en temas.`
                    : "Sin material, Ticher usará el temario típico de la materia. Puedes subir apuntes en Exámenes → Mis materias."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={generateTopics} disabled={busy !== null}>
                  <Sparkles /> {busy === "topics" ? "Generando temas…" : "Generar temas con IA"}
                </Button>
                <Button variant="ghost" onClick={() => completeLesson()}>
                  Completé una lección (+10%)
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
                    <Button nativeButton={false} render={<Link href={lessonHref(next.name)} />}>
                      <BookOpen /> Lección con el tutor
                    </Button>
                    <Button variant="outline" onClick={() => completeLesson(next)}>
                      Completé la lección
                    </Button>
                  </CardContent>
                </Card>
              )}

              <ol className="space-y-2">
                {topics.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{i + 1}</span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{t.name}</span>
                        <span className="shrink-0 text-muted-foreground">{t.mastery}%</span>
                      </div>
                      <GoalBar value={t.mastery} goal={goal} className="h-1.5" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Lección de ${t.name}`}
                      nativeButton={false}
                      render={<Link href={lessonHref(t.name)} />}
                    >
                      <BookOpen />
                    </Button>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <Layers className="size-4" />
                <CardTitle>Tarjetas de memoria</CardTitle>
                <CardDescription>
                  {prep.cards?.length ? `${prep.cards.length} tarjetas listas` : "Repasa conceptos clave rápido."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
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
                <CardTitle>Examen de práctica</CardTitle>
                <CardDescription>Descubre cómo te iría en el examen real.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" onClick={startQuiz} disabled={busy !== null}>
                  {busy === "quiz" ? "Creando examen…" : "Crear examen de práctica"}
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
      </Tabs>

      <Flashcards
        cards={prep.cards ?? []}
        open={cardsOpen}
        onOpenChange={setCardsOpen}
        onResult={(topic, knew) => knew && adjustTopics((t) => (same(t.name, topic) ? { ...t, mastery: bump(t.mastery, 3) } : t))}
      />
      {quiz && (
        <PracticeExam
          key={quiz.key}
          questions={quiz.questions}
          open
          onOpenChange={(o) => !o && setQuiz(null)}
          onFinish={finishQuiz}
        />
      )}
    </div>
  )
}

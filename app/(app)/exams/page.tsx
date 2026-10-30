"use client"

import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GoalBar } from "@/components/goal-bar"
import { DEFAULT_GOAL, NO_PREPS, daysUntil, readiness, useHydrated, useStored, type ExamPrep } from "@/lib/store"
import { ExamsSkeleton } from "@/components/page-skeletons"

const fmt = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })

function when(date: string) {
  const d = daysUntil(date)
  return d === 0 ? "Hoy" : d === 1 ? "Mañana" : d > 0 ? `En ${d} días` : "Finalizado"
}

function PrepRow({ p }: { p: ExamPrep }) {
  const goal = p.goal ?? DEFAULT_GOAL
  return (
    <Link href={`/exams/${p.id}`}>
      <Card size="sm" className="transition-colors hover:bg-muted/50">
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {p.subject} · {when(p.date)}
              </p>
              <p className="truncate font-medium">{p.name}</p>
            </div>
            <span className="shrink-0 text-sm">
              {readiness(p)}% <span className="text-muted-foreground">/ {goal}%</span>
            </span>
          </div>
          <GoalBar value={readiness(p)} goal={goal} />
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ExamsPage() {
  const hydrated = useHydrated()
  const [preps] = useStored<ExamPrep[]>("preps", NO_PREPS)
  const upcoming = preps.filter((p) => daysUntil(p.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))
  const past = preps.filter((p) => daysUntil(p.date) < 0).sort((a, b) => b.date.localeCompare(a.date))
  const [next, ...later] = upcoming

  // Before hydration the stored data is not read yet; show the page's shape instead of empty defaults.
  if (!hydrated) return <ExamsSkeleton />

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Exámenes</h1>
        <Button nativeButton={false} render={<Link href="/exams/new" />}>
          <Plus /> Nueva preparación
        </Button>
      </div>

      {next ? (
        <Card>
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide">
              Próximo examen · {fmt(next.date)}
            </CardDescription>
            <CardTitle className="text-xl">{next.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-semibold">
                {readiness(next)}
                <span className="text-base font-normal text-muted-foreground">% listo</span>
              </p>
              <span className="text-sm text-muted-foreground">Meta {next.goal ?? DEFAULT_GOAL}%</span>
            </div>
            <GoalBar value={readiness(next)} goal={next.goal ?? DEFAULT_GOAL} />
            <p className="text-sm text-muted-foreground">
              {when(next.date)}
              {next.topics?.length
                ? ` · temas en la meta ${next.topics.filter((t) => t.mastery >= (next.goal ?? DEFAULT_GOAL)).length} de ${next.topics.length}`
                : ""}
            </p>
            <Button className="w-full" nativeButton={false} render={<Link href={`/exams/${next.id}`} />}>
              Sigue estudiando <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p className="text-muted-foreground">Aún no tienes exámenes próximos.</p>
            <Button nativeButton={false} render={<Link href="/exams/new" />}>
              Crear mi plan de estudio
            </Button>
          </CardContent>
        </Card>
      )}

      {later.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Más adelante</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {later.map((p) => (
              <PrepRow key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Pasados · {past.length}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((p) => (
              <PrepRow key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

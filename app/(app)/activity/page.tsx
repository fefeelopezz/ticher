"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GoalBar } from "@/components/goal-bar"
import { cn } from "@/lib/utils"
import {
  DEFAULT_GOAL,
  NO_LESSONS,
  NO_MINUTES,
  NO_PREPS,
  average,
  daysUntil,
  isoDate,
  longestStreak,
  readiness,
  useHydrated,
  useStored,
  type ExamPrep,
} from "@/lib/store"
import { ActivitySkeleton } from "@/components/page-skeletons"

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const countdown = (date: string) => {
  const d = daysUntil(date)
  return d === 0 ? "Hoy" : d === 1 ? "Mañana" : `${d} días`
}

// Same buckets idea as Astra's yearly heatmap: none, a bit, a session, a long session, 1.5 h+.
const shade = (min: number) =>
  min === 0 ? "bg-muted" : min < 15 ? "bg-primary/25" : min < 45 ? "bg-primary/50" : min < 90 ? "bg-primary/75" : "bg-primary"

export default function ActivityPage() {
  const hydrated = useHydrated()
  const [preps] = useStored<ExamPrep[]>("preps", NO_PREPS)
  const [lessons] = useStored<string[]>("lessons", NO_LESSONS)
  const [minutes] = useStored<Record<string, number>>("minutes", NO_MINUTES)

  const upcoming = preps.filter((p) => daysUntil(p.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))
  const mins = (d: Date) => minutes[isoDate(d)] ?? 0

  const week = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i))
  const weekTotal = week.reduce((s, d) => s + mins(d), 0)
  const lastWeekTotal = Array.from({ length: 7 }, (_, i) => mins(daysAgo(13 - i))).reduce((a, b) => a + b, 0)
  const maxDay = Math.max(1, ...week.map(mins))
  const activeDays = new Set([...Object.keys(minutes).filter((k) => minutes[k] > 0), ...lessons])

  // 53 week columns ending this week, Sunday-first rows.
  const start = daysAgo(52 * 7 + new Date().getDay())
  const heat = Array.from({ length: 53 * 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const yearActive = [...activeDays].filter((d) => d >= isoDate(start)).length

  const bySubject: Record<string, number[]> = {}
  for (const p of preps) (bySubject[p.subject] ??= []).push(readiness(p))

  // Before hydration the stored data is not read yet; show the page's shape instead of empty defaults.
  if (!hydrated) return <ActivitySkeleton />

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Mi actividad</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        {upcoming.map((p) => (
          <Link key={p.id} href={`/exams/${p.id}`}>
            <Card size="sm" className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="space-y-2">
                <p className={cn("text-3xl font-semibold tracking-tight", daysUntil(p.date) <= 1 && "text-destructive")}>
                  {countdown(p.date)}
                </p>
                <p className="text-xs text-muted-foreground uppercase">
                  {new Date(p.date + "T00:00:00").toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <p className="line-clamp-2 text-sm font-medium">
                  {p.subject} · {p.name}
                </p>
                <GoalBar value={readiness(p)} goal={p.goal ?? DEFAULT_GOAL} />
                <p className="flex justify-between text-xs text-muted-foreground">
                  <span>{readiness(p)}%</span>
                  <span>meta {p.goal ?? DEFAULT_GOAL}%</span>
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        <Link href="/exams/new">
          <Card size="sm" className="flex h-full min-h-32 items-center justify-center border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/50">
            <Plus className="size-5" />
            Agregar examen
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aprendizaje</CardTitle>
          <CardDescription>Últimos 7 días · tiempo con el tutor y tus preparaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex h-32 items-end gap-2">
            {week.map((d) => (
              <div key={isoDate(d)} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-md bg-primary"
                  style={{ height: `${(mins(d) / maxDay) * 100}%`, minHeight: mins(d) ? 4 : 0 }}
                  title={`${mins(d)} min`}
                />
                <span className="text-xs text-muted-foreground">{d.toLocaleDateString("es", { weekday: "narrow" })}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-2xl font-semibold">{weekTotal} min</p>
              <p className="text-muted-foreground">tiempo de estudio</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{week.filter((d) => activeDays.has(isoDate(d))).length} / 7</p>
              <p className="text-muted-foreground">días de actividad</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {weekTotal - lastWeekTotal >= 0 ? "+" : ""}
                {weekTotal - lastWeekTotal} min
              </p>
              <p className="text-muted-foreground">vs. la semana anterior</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos 12 meses</CardTitle>
          <CardDescription>
            {yearActive} días de actividad · racha más larga: {longestStreak([...activeDays])} días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid w-max grid-flow-col grid-rows-7 gap-0.5" role="img" aria-label="Mapa de actividad del último año">
              {heat.map((d) => (
                <div
                  key={isoDate(d)}
                  className={cn(
                    "size-2.5 rounded-[2px]",
                    d > new Date() ? "invisible" : shade(mins(d) || (activeDays.has(isoDate(d)) ? 1 : 0))
                  )}
                  title={`${d.toLocaleDateString("es")}: ${mins(d)} min`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dominio por materia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(bySubject).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Cuando empieces a prepararte para un examen, tus materias aparecerán aquí.
            </p>
          )}
          {Object.entries(bySubject).map(([subject, values]) => (
            <div key={subject} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{subject}</span>
                <span>{average(values)}%</span>
              </div>
              <GoalBar value={average(values)} goal={DEFAULT_GOAL} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

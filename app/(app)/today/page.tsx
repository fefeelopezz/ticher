"use client"

import Link from "next/link"
import { ChevronRight, FileText, Flame, Layers, ListChecks, ListTree, Plus, RotateCcw, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PageSkeleton } from "@/components/page-skeletons"
import { NO_PREPS, daysUntil, todayPlan, useActivity, useHydrated, useStored, type ExamPrep, type StudyTask } from "@/lib/store"

const ICONS: Record<StudyTask["kind"], LucideIcon> = { topics: ListTree, cards: Layers, mistakes: RotateCcw, read: FileText, practice: ListChecks }

const when = (days: number) => (days === 0 ? "Hoy" : days === 1 ? "Mañana" : `En ${days} días`)

// What to study today. Tasks come from the exams' current state, so a finished one simply stops being listed.
export default function TodayPage() {
  const hydrated = useHydrated()
  const [preps] = useStored<ExamPrep[]>("preps", NO_PREPS)
  const { streak, todayMinutes, goal, goalMet } = useActivity()

  if (!hydrated) return <PageSkeleton blocks={["h-24", "h-16", "h-16", "h-16"]} />

  const tasks = todayPlan(preps)
  const hasExams = preps.some((p) => daysUntil(p.date) >= 0)
  const date = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hoy</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{date}</p>
      </div>

      <Card size="sm">
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <Flame className={`size-4 ${streak ? "text-primary" : "text-muted-foreground"}`} />
              {streak} {streak === 1 ? "día" : "días"} de racha
            </span>
            <span className="text-muted-foreground tabular-nums">{goalMet ? "Meta cumplida ✓" : `${todayMinutes}/${goal} min`}</span>
          </div>
          <Progress value={goalMet ? 100 : Math.min(100, (todayMinutes / goal) * 100)} aria-label="Meta de estudio de hoy" />
        </CardContent>
      </Card>

      {tasks.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Qué estudiar</h2>
          <ul className="space-y-2">
            {tasks.map((t) => {
              const Icon = ICONS[t.kind]
              return (
                <li key={t.key}>
                  <Link
                    href={t.href}
                    className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.exam} · {when(t.days)}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <div className="space-y-3 py-10 text-center">
          <p className="font-medium">{hasExams ? "Estás al día 🎉" : "No tienes exámenes próximos"}</p>
          <p className="text-sm text-muted-foreground">
            {hasExams ? "Llegaste a tu meta en todos los temas y no quedan repasos para hoy." : "Crea una preparación y acá vas a ver qué estudiar cada día."}
          </p>
          {!hasExams && (
            <Button nativeButton={false} render={<Link href="/exams/new" />}>
              <Plus /> Nueva preparación
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

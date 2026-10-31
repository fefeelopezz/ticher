"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePrep } from "@/lib/use-prep"

type Props = {
  back: string
  // Replaces the plain links when leaving needs a check (e.g. unsent answers).
  onClose?: () => void
  progress?: number
  label?: string
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
}

// Full-page frame for study activities, with the same header as the Texto inteligente page.
export function FocusShell({ back, onClose, progress, label, eyebrow, title, description, children }: Props) {
  const leave = (icon: React.ReactNode, aria: string) =>
    onClose ? (
      <Button variant="ghost" size="icon" aria-label={aria} onClick={onClose}>
        {icon}
      </Button>
    ) : (
      <Button variant="ghost" size="icon" aria-label={aria} nativeButton={false} render={<Link href={back} />}>
        {icon}
      </Button>
    )

  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-3 sm:px-4">
          {leave(<ArrowLeft />, "Volver a la preparación")}
          <div className="mx-auto flex w-full max-w-sm items-center gap-3">
            {progress !== undefined && (
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress * 100}%` }} />
              </div>
            )}
            <span className="ml-auto w-10 text-right text-xs text-muted-foreground tabular-nums">{label}</span>
          </div>
          {leave(<X />, "Cerrar")}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[40rem] flex-1 space-y-8 px-5 pt-10 pb-8 sm:pt-14">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
          <h1 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </header>
        {children}
      </main>
    </>
  )
}

const STAGES = [
  [0, "Leyendo tu material…"],
  [30, "Armando la lección…"],
  [70, "Revisando los últimos detalles…"],
  [100, "¡Lista!"],
] as const

// Short pause so the bar is seen reaching 100 % before the lesson replaces it.
export const settle = () => new Promise((r) => setTimeout(r, 500))

// The AI sends no progress, so the percentage is an estimate: it climbs fast, slows toward 95 %
// while waiting and jumps to 100 % once the lesson arrives (`done`).
export function LessonLoader({ done = false }: { done?: boolean }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (done) return
    const id = setInterval(() => setElapsed((ms) => ms + 100), 100)
    return () => clearInterval(id)
  }, [done])
  const percent = done ? 100 : Math.max(1, Math.round(95 * (1 - Math.exp(-elapsed / 9000))))
  const stage = STAGES.findLast(([from]) => percent >= from)![1]

  return (
    <div className="space-y-4 pt-4" role="progressbar" aria-label="Creando la lección" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="flex items-end justify-between gap-4">
        <p className="text-muted-foreground" aria-live="polite">
          {stage}
        </p>
        <p className="text-4xl font-semibold tabular-nums">{percent}%</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export function Missing({ back, text = "No encontramos este tema." }: { back: string; text?: string }) {
  return (
    <div className="mx-auto max-w-md space-y-4 px-5 py-24 text-center">
      <p className="text-muted-foreground">{text}</p>
      <Button nativeButton={false} render={<Link href={back} />}>
        Volver
      </Button>
    </div>
  )
}

// Routes like /exams/[id]/quiz/[topicId]: topicId "all" means the whole exam.
export function useLessonRoute() {
  const { id, topicId } = useParams<{ id: string; topicId: string }>()
  const state = usePrep(id)
  const { prep } = state
  const topics = prep?.topics ?? []
  const topic = topics.find((t) => t.id === topicId)
  return {
    ...state,
    id,
    topic,
    // Without topics the whole subject counts as one, as on the prep page.
    topicNames: topics.length ? topics.map((t) => t.name) : prep ? [prep.subject] : [],
    back: prep ? `/exams/${id}` : "/exams",
    found: !!prep && (topicId === "all" || !!topic),
  }
}

"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FocusShell } from "@/components/focus-shell"
import { QuestionCard, ScoreRing } from "@/components/question-card"
import { isRight, scoreByTopic } from "@/lib/grading"
import { cn } from "@/lib/utils"
import type { Card, Difficulty, Question, QuizResult } from "@/lib/store"

type CardsProps = {
  cards: Card[]
  back: string
  title: string
  // Offered on the end screen, e.g. to replace the exam's saved deck.
  onNew?: () => void
  busy?: boolean
}

export function Flashcards({ cards, back, title, onNew, busy }: CardsProps) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const card = cards[index]

  function answer(knew: boolean) {
    if (knew) setKnown(known + 1)
    setFlipped(false)
    setIndex(index + 1)
  }

  function restart() {
    setIndex(0)
    setKnown(0)
    setFlipped(false)
  }

  return (
    <FocusShell
      back={back}
      progress={index / cards.length}
      label={card ? `${index + 1} / ${cards.length}` : ""}
      eyebrow="Tarjetas de repaso"
      title={title}
      description={card ? card.topic : "¡Terminaste el repaso!"}
    >
      {card ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setFlipped(!flipped)}
            className="flex min-h-64 w-full items-center justify-center rounded-3xl border bg-muted/40 p-8 text-center text-xl leading-relaxed transition-colors hover:bg-muted"
          >
            {flipped ? card.back : card.front}
          </button>
          <p className="text-center text-sm text-muted-foreground">{flipped ? "¿La sabías?" : "Toca la tarjeta para ver la respuesta"}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" variant="outline" disabled={!flipped} onClick={() => answer(false)}>
              Repasar
            </Button>
            <Button size="lg" disabled={!flipped} onClick={() => answer(true)}>
              Lo sabía
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl border bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
          <ScoreRing value={Math.round((known / cards.length) * 100)} size={84} />
          <p className="text-sm text-muted-foreground">
            {known}/{cards.length} tarjetas que ya sabías
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-3">
            <Button nativeButton={false} render={<Link href={back} />}>
              Volver a la preparación
            </Button>
            <Button variant="outline" onClick={restart}>
              <RotateCcw /> Repasar de nuevo
            </Button>
            {onNew && (
              <Button variant="outline" onClick={onNew} disabled={busy}>
                {busy ? "Creando…" : "Tarjetas nuevas"}
              </Button>
            )}
          </div>
        </div>
      )}
    </FocusShell>
  )
}

// Shared setup controls for the quiz and the mock exam (Astra: "Selecciona temas", "Establecer dificultad").
// A checklist rather than pills: AI-generated topic names are long and must wrap inside the dialog.
export function TopicPicker({ topics, selected, onChange }: { topics: string[]; selected: string[]; onChange: (t: string[]) => void }) {
  const all = selected.length === topics.length
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {selected.length} de {topics.length} seleccionados
        </span>
        <button type="button" className="font-medium text-primary hover:underline" onClick={() => onChange(all ? [] : topics)}>
          {all ? "Quitar todos" : "Seleccionar todos"}
        </button>
      </div>
      <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1" role="group" aria-label="Temas">
        {topics.map((t) => {
          const on = selected.includes(t)
          return (
            <button
              key={t}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onChange(on ? selected.filter((s) => s !== t) : [...selected, t])}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                on ? "border-primary/50 bg-primary/10" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                  on && "border-primary bg-primary text-primary-foreground"
                )}
              >
                {on && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className={cn("leading-snug", on && "text-foreground")}>{t}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const LEVELS: [Difficulty, string][] = [
  ["basico", "Básico"],
  ["medio", "Medio"],
  ["avanzado", "Avanzado"],
]

export function DifficultyPicker({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Dificultad">
      {LEVELS.map(([v, label]) => (
        <Button key={v} type="button" size="sm" role="radio" aria-checked={value === v} variant={value === v ? "default" : "outline"} onClick={() => onChange(v)}>
          {label}
        </Button>
      ))}
    </div>
  )
}

export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

type QuizProps = {
  title: string
  back: string
  questions: Question[]
  onFinish: (result: QuizResult) => void
}

// Astra's "Cuestionario": one question at a time, "Revisar" shows the explanation, results show accuracy and time.
export function Quiz({ title, back, questions, onFinish }: QuizProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<number[][]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const startedAt = useRef(0)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [index])

  const q = questions[index]
  const last = index === questions.length - 1

  function answered(_right: boolean, chosen: number[]) {
    const all = [...answers, chosen]
    setAnswers(all)
    if (!last) return setIndex(index + 1)
    const correct = questions.filter((qq, i) => isRight(qq.correct, all[i])).length
    const done = {
      byTopic: scoreByTopic(questions, all),
      accuracy: Math.round((correct / questions.length) * 100),
      seconds: Math.round((Date.now() - startedAt.current) / 1000),
      count: questions.length,
    }
    setResult(done)
    onFinish(done)
  }

  const strong = result ? Object.entries(result.byTopic).filter(([, s]) => s >= 70).map(([t]) => t) : []
  const weak = result ? Object.entries(result.byTopic).filter(([, s]) => s < 70).map(([t]) => t) : []

  return (
    <FocusShell
      back={back}
      progress={result ? 1 : index / questions.length}
      label={result ? "" : `${index + 1} / ${questions.length}`}
      eyebrow="Opción múltiple"
      title={result ? "Resultados" : title}
      description={result || q.topic === title ? undefined : q.topic}
    >
      {result ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-2 rounded-3xl border bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
            <ScoreRing value={result.accuracy} size={84} />
            <p className="text-xl font-semibold">Cuestionario completado</p>
            <p className="text-sm text-muted-foreground">
              {Math.round((result.accuracy / 100) * result.count)}/{result.count} respuestas correctas · {formatTime(result.seconds)}
            </p>
            <p className="font-medium">
              {result.accuracy >= 80 ? "¡Excelente trabajo!" : result.accuracy >= 50 ? "¡Vas avanzando!" : "Puedes mejorar"}
            </p>
            <Button className="mt-3" nativeButton={false} render={<Link href={back} />}>
              Volver a la preparación
            </Button>
          </div>
          {strong.length > 0 && <p className="text-sm">💪 Fortalezas: {strong.join(", ")}</p>}
          {weak.length > 0 && <p className="text-sm">⚡ Puntos débiles: {weak.join(", ")}</p>}
        </div>
      ) : (
        <QuestionCard key={index} question={q} continueLabel={last ? "Ver resultados" : "Continuar"} onDone={answered} />
      )}
    </FocusShell>
  )
}

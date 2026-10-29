"use client"

import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuestionCard, ScoreRing } from "@/components/question-card"
import { isRight, scoreByTopic } from "@/lib/grading"
import { cn } from "@/lib/utils"
import type { Card, Difficulty, Question, QuizResult } from "@/lib/store"

type CardsProps = {
  cards: Card[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (topic: string, knew: boolean) => void
}

export function Flashcards({ cards, open, onOpenChange, onResult }: CardsProps) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const card = cards[index]

  function answer(knew: boolean) {
    onResult(card.topic, knew)
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) restart()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tarjetas de memoria</DialogTitle>
          <DialogDescription>
            {card ? `Tarjeta ${index + 1} de ${cards.length} · ${card.topic}` : "¡Terminaste el repaso!"}
          </DialogDescription>
        </DialogHeader>
        {card ? (
          <>
            <button
              type="button"
              onClick={() => setFlipped(!flipped)}
              className="flex min-h-48 w-full items-center justify-center rounded-xl border bg-muted/40 p-6 text-center text-lg transition-colors hover:bg-muted"
            >
              {flipped ? card.back : card.front}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              {flipped ? "¿La sabías?" : "Toca la tarjeta para ver la respuesta"}
            </p>
            <DialogFooter>
              <Button variant="outline" disabled={!flipped} onClick={() => answer(false)}>
                Repasar
              </Button>
              <Button disabled={!flipped} onClick={() => answer(true)}>
                Lo sabía
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="py-6 text-center text-3xl font-semibold">
              {known} / {cards.length}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={restart}>
                Repasar de nuevo
              </Button>
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
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
  title?: string
  questions: Question[]
  onClose: () => void
  onFinish: (result: QuizResult) => void
}

// Astra's "Cuestionario": one question at a time, "Revisar" shows the explanation, results show accuracy and time.
export function Quiz({ title = "Cuestionario", questions, onClose, onFinish }: QuizProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<number[][]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const startedAt = useRef(0)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{result ? "Resultados" : `Pregunta ${index + 1} de ${questions.length} · ${q.topic}`}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2 rounded-2xl border p-6 text-center">
              <ScoreRing value={result.accuracy} size={72} />
              <p className="text-lg font-semibold">Cuestionario completado</p>
              <p className="text-sm text-muted-foreground">
                {Math.round((result.accuracy / 100) * result.count)}/{result.count} respuestas correctas · {formatTime(result.seconds)}
              </p>
              <p className="font-medium">
                {result.accuracy >= 80 ? "¡Excelente trabajo!" : result.accuracy >= 50 ? "¡Vas avanzando!" : "Puedes mejorar"}
              </p>
            </div>
            {strong.length > 0 && <p className="text-sm">💪 Fortalezas: {strong.join(", ")}</p>}
            {weak.length > 0 && <p className="text-sm">⚡ Puntos débiles: {weak.join(", ")}</p>}
            <DialogFooter>
              <Button onClick={onClose}>Listo</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
            </div>
            <QuestionCard key={index} question={q} continueLabel={last ? "Ver resultados" : "Continuar"} onDone={answered} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

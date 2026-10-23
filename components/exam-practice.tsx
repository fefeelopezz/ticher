"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Card, Question } from "@/lib/store"

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

type QuizProps = {
  questions: Question[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onFinish: (scoreByTopic: Record<string, number>, total: number) => void
}

export function PracticeExam({ questions, open, onOpenChange, onFinish }: QuizProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [submitted, setSubmitted] = useState(false)
  const correct = questions.filter((q, i) => answers[i] === q.answer).length
  const total = questions.length ? Math.round((correct / questions.length) * 100) : 0

  function submit() {
    setSubmitted(true)
    const byTopic: Record<string, { right: number; count: number }> = {}
    questions.forEach((q, i) => {
      const t = (byTopic[q.topic] ??= { right: 0, count: 0 })
      t.count++
      if (answers[i] === q.answer) t.right++
    })
    onFinish(
      Object.fromEntries(Object.entries(byTopic).map(([topic, t]) => [topic, Math.round((t.right / t.count) * 100)])),
      total
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Examen de práctica</DialogTitle>
          <DialogDescription>
            {submitted ? `Resultado: ${correct} de ${questions.length} (${total}%)` : `${questions.length} preguntas de opción múltiple`}
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-6">
          {questions.map((q, i) => (
            <li key={i} className="space-y-2">
              <p className="font-medium">
                {i + 1}. {q.question}
              </p>
              <div className="grid gap-2" role="radiogroup" aria-label={`Pregunta ${i + 1}`}>
                {q.options.map((option, j) => {
                  const chosen = answers[i] === j
                  const right = submitted && j === q.answer
                  const wrong = submitted && chosen && j !== q.answer
                  return (
                    <button
                      key={j}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      disabled={submitted}
                      onClick={() => setAnswers(answers.map((a, k) => (k === i ? j : a)))}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        chosen && !submitted && "border-primary bg-primary/10",
                        right && "border-green-600 bg-green-600/10",
                        wrong && "border-destructive bg-destructive/10",
                        !submitted && "hover:bg-muted"
                      )}
                    >
                      {right && <Check className="size-4 shrink-0 text-green-600" />}
                      {wrong && <X className="size-4 shrink-0 text-destructive" />}
                      {option}
                    </button>
                  )
                })}
              </div>
              {submitted && <p className="text-sm text-muted-foreground">{q.explanation}</p>}
            </li>
          ))}
        </ol>
        <DialogFooter>
          {submitted ? (
            <Button onClick={() => onOpenChange(false)}>Listo</Button>
          ) : (
            <Button disabled={answers.some((a) => a === null)} onClick={submit}>
              Calificar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

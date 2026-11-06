"use client"

import { useEffect, useState } from "react"
import { Check, CornerDownLeft, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isRight } from "@/lib/grading"
import { cn } from "@/lib/utils"
import type { Question } from "@/lib/store"

type Props = {
  question: Question
  label?: string
  continueLabel?: string
  onDone: (right: boolean, chosen: number[]) => void
}

// Percent ring shown on Astra's "Cuestionario completado" card.
export function ScoreRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = 15.5
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" role="img" aria-label={`${value}%`}>
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" className="stroke-muted" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform="rotate(-90 18 18)"
        className="stroke-primary"
      />
      <text x="18" y="21" textAnchor="middle" className="fill-foreground text-[8px] font-semibold">
        {value}%
      </text>
    </svg>
  )
}

// Astra's multiple-choice card: numbered options (keys 1-4), a choice that stays open until it is sent,
// an "Explicación" box and a bottom bar with the verdict and "Continuar" (Enter).
// Slides only run with no-preference for reduced motion; the fades always do.
export function QuestionCard({ question: q, label, continueLabel = "Continuar", onDone }: Props) {
  const [chosen, setChosen] = useState<number[]>([])
  const [checked, setChecked] = useState(false)
  const multiple = q.correct.length > 1
  const right = isRight(q.correct, chosen)
  const found = chosen.filter((c) => q.correct.includes(c)).length

  function pick(option: number) {
    if (checked) return
    if (!multiple) return setChosen([option])
    setChosen((c) => (c.includes(option) ? c.filter((o) => o !== option) : [...c, option]))
  }

  // Keyboard like Astra: number keys pick an option, Enter checks or continues.
  const keyHandler = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const n = Number(e.key)
    if (n >= 1 && n <= q.options.length) pick(n - 1)
    else if (e.key === "Enter") {
      e.preventDefault()
      if (checked) onDone(right, chosen)
      else if (chosen.length) setChecked(true)
    }
  }
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler(e)
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  })

  return (
    <div className="overflow-hidden rounded-2xl border bg-card duration-300 animate-in fade-in-0 motion-safe:slide-in-from-bottom-2">
      {label && (
        <div className="border-b px-5 py-3">
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
        </div>
      )}
      <div className="space-y-5 p-5">
        <div className="space-y-1">
          <p className="text-lg leading-snug font-medium text-balance">{q.question}</p>
          {multiple && <p className="text-xs text-muted-foreground">Hay más de una respuesta correcta · elige {q.correct.length}</p>}
        </div>

        <div className="space-y-2.5" role={multiple ? "group" : "radiogroup"} aria-label="Opciones">
          {q.options.map((option, j) => {
            const on = chosen.includes(j)
            const isCorrect = checked && q.correct.includes(j)
            const isWrong = checked && on && !q.correct.includes(j)
            return (
              <div
                key={j}
                className="flex items-center gap-3 duration-300 animate-in fade-in-0 fill-mode-both motion-safe:slide-in-from-bottom-1"
                style={{ animationDelay: `${(j + 1) * 50}ms` }}
              >
                <kbd className="hidden size-5 shrink-0 items-center justify-center rounded border text-[10px] text-muted-foreground sm:flex">
                  {j + 1}
                </kbd>
                <button
                  type="button"
                  role={multiple ? "checkbox" : "radio"}
                  aria-checked={on}
                  disabled={checked}
                  onClick={() => pick(j)}
                  className={cn(
                    "flex min-h-12 flex-1 items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all duration-200",
                    !checked && "hover:border-foreground/30 hover:bg-muted/50 motion-safe:active:scale-[0.99]",
                    on && !checked && "border-primary bg-primary/10",
                    isCorrect && "border-emerald-500/70 bg-emerald-500/10",
                    isWrong && "border-red-500/70 bg-red-500/10"
                  )}
                >
                  <span
                    className={cn(
                      "size-4 shrink-0 rounded-full border-2 transition-all duration-200",
                      multiple && "rounded-[4px]",
                      on && !checked && "border-primary bg-primary",
                      isCorrect && "border-emerald-500 bg-emerald-500",
                      isWrong && "border-red-500 bg-red-500"
                    )}
                  />
                  <span className="flex-1">{option}</span>
                  {isCorrect && <Check className="size-4 shrink-0 text-emerald-500 duration-300 animate-in fade-in-0 zoom-in-50" />}
                  {isWrong && <X className="size-4 shrink-0 text-red-500 duration-300 animate-in fade-in-0 zoom-in-50" />}
                </button>
              </div>
            )
          })}
        </div>

        {checked && (
          <div className="rounded-xl bg-gradient-to-br from-primary/70 via-primary/20 to-sky-500/50 p-px duration-300 animate-in fade-in-0 motion-safe:slide-in-from-top-1">
            <div className="space-y-1.5 rounded-[11px] bg-card px-4 py-3">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Explicación</p>
              <p className="text-sm leading-relaxed">{q.explanation}</p>
              {q.source && (
                <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                  <FileText className="size-3.5 shrink-0" /> Fuente: {q.source}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-3 border-t px-5 py-3 transition-colors duration-300",
          checked && (right ? "border-t-emerald-500/60" : "border-t-red-500/60")
        )}
      >
        <p className="text-sm font-medium" aria-live="polite">
          {!checked ? "" : right ? "🎉 Correcto" : multiple && found > 0 ? `🤔 ${found} de ${q.correct.length} correctas` : "🤔 Incorrecto"}
        </p>
        {checked ? (
          <Button onClick={() => onDone(right, chosen)}>
            {continueLabel} <CornerDownLeft />
          </Button>
        ) : (
          <Button disabled={!chosen.length} onClick={() => setChecked(true)}>
            Enviar <CornerDownLeft />
          </Button>
        )}
      </div>
    </div>
  )
}

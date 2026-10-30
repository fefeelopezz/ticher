"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Flashcards } from "@/components/exam-practice"
import { FocusShell, Missing, useLessonRoute } from "@/components/focus-shell"
import { useStudyTimer, type Card as StudyCard } from "@/lib/store"

// Tarjetas de repaso as their own page. The whole exam reuses its saved deck;
// a single topic gets a new deck saved under that topic.
export default function CardsPage() {
  const { id, prep, hydrated, busy, update, generate, saveLesson, topic, back, found } = useLessonRoute()
  const router = useRouter()
  const [deck, setDeck] = useState<{ round: number; cards: StudyCard[] }>()
  const [failed, setFailed] = useState(false)
  const requested = useRef(false)
  useStudyTimer()

  const saved = !topic && prep?.cards?.length ? prep.cards : undefined
  const cards = deck?.cards ?? saved

  async function create() {
    setFailed(false)
    const res = await generate<{ cards: StudyCard[] }>("flashcards", topic ? { topics: [topic.name] } : {})
    if (!res?.cards.length) return setFailed(true)
    // A topic's deck is saved under that topic and opened from there; the exam keeps one shared deck.
    if (topic) return router.replace(`/exams/${id}/lessons/${saveLesson({ kind: "cards", topicId: topic.id, cards: res.cards })}`)
    update((p) => ({ ...p, cards: res.cards }))
    setDeck((d) => ({ round: (d?.round ?? 0) + 1, cards: res.cards }))
  }

  // Create the deck on first visit; the ref stops double requests.
  useEffect(() => {
    if (hydrated && found && !cards && !requested.current) {
      requested.current = true
      create()
    }
  })

  if (!hydrated) return null
  if (!found) return <Missing back={back} />

  const title = topic?.name ?? "Tarjetas de memoria"
  if (cards) return <Flashcards key={deck?.round ?? 0} cards={cards} back={back} title={title} onNew={create} busy={busy !== null} />

  return (
    <FocusShell back={back} eyebrow="Tarjetas de repaso" title={title}>
      {failed ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">No pudimos crear las tarjetas. Revisa el mensaje de abajo e intenta otra vez.</p>
          <Button onClick={create} disabled={busy !== null}>
            <RotateCcw /> Reintentar
          </Button>
        </div>
      ) : (
        <div className="space-y-4" aria-busy="true">
          <p className="text-muted-foreground">Ticher está armando tus tarjetas. Tarda unos segundos.</p>
          <div className="h-64 animate-pulse rounded-3xl bg-muted" />
        </div>
      )}
    </FocusShell>
  )
}

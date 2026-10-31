"use client"

import { useState } from "react"
import { Flashcards } from "@/components/exam-practice"
import { FocusShell, Missing, useLessonRoute } from "@/components/focus-shell"
import { isDue, useStudyTimer, type Card } from "@/lib/store"
import { allCards, logLesson, same } from "@/lib/use-prep"
import { FocusSkeleton } from "@/components/page-skeletons"

// Today's spaced-repetition review: every card of the exam (or one topic) that is due.
export default function ReviewPage() {
  const { prep, hydrated, reviewCard, topic, back, found } = useLessonRoute()
  // Fixed when the page opens, so answering a card doesn't pull it out of the running deck.
  const [deck, setDeck] = useState<Card[]>()
  useStudyTimer()

  if (!hydrated) return <FocusSkeleton />
  if (!found || !prep) return <Missing back={back} />

  const due = deck ?? allCards(prep).filter((c) => isDue(prep.reviews?.[c.front]) && (!topic || same(c.topic, topic.name)))
  if (!deck && due.length) setDeck(due)
  const title = topic?.name ?? "Repaso de hoy"

  if (!due.length) {
    return (
      <FocusShell back={back} eyebrow="Repaso espaciado" title={title}>
        <p className="text-muted-foreground">No tienes tarjetas pendientes para hoy. ¡Vuelve mañana! 🎉</p>
      </FocusShell>
    )
  }
  return <Flashcards cards={due} back={back} title={title} onAnswer={reviewCard} onFinish={logLesson} />
}

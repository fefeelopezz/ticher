"use client"

import { useState } from "react"
import { Quiz } from "@/components/exam-practice"
import { FocusShell, Missing, useLessonRoute } from "@/components/focus-shell"
import { useStudyTimer, type Question } from "@/lib/store"
import { same } from "@/lib/use-prep"
import { FocusSkeleton } from "@/components/page-skeletons"

const MAX_QUESTIONS = 10

// "Repasar mis errores": a quiz made only of questions missed before. Right answers leave the list
// (recordQuiz drops them), wrong ones stay for next time.
export default function MistakesPage() {
  const { prep, hydrated, recordQuiz, topic, back, found } = useLessonRoute()
  // Picked once when the page opens; the stored list changes as soon as the quiz is recorded.
  const [questions, setQuestions] = useState<Question[]>()
  useStudyTimer()

  if (!hydrated) return <FocusSkeleton />
  if (!found || !prep) return <Missing back={back} />

  const pool = questions ?? (prep.mistakes ?? []).filter((q) => !topic || same(q.topic, topic.name)).slice(0, MAX_QUESTIONS)
  if (!questions && pool.length) setQuestions(pool)
  const title = topic?.name ?? "Tus errores"

  if (!pool.length) {
    return (
      <FocusShell back={back} eyebrow="Repasar mis errores" title={title}>
        <p className="text-muted-foreground">No tienes errores pendientes en este tema. ¡Bien hecho! 🎉</p>
      </FocusShell>
    )
  }
  return <Quiz eyebrow="Repasar mis errores" title={title} back={back} questions={pool} onFinish={recordQuiz} subject={prep.subject} />
}

"use client"

import { MockExam, type Graded } from "@/components/mock-exam"
import { Missing, useLessonRoute } from "@/components/focus-shell"
import { average, useStudyTimer, type MockAttempt, type MockTask } from "@/lib/store"
import { applyScores } from "@/lib/use-prep"
import { FocusSkeleton } from "@/components/page-skeletons"

// Examen escrito as its own page: set it up, write the answers, get the AI grade.
export default function WrittenPage() {
  const { hydrated, update, generate, saveLesson, topic, topicNames, back, found } = useLessonRoute()
  useStudyTimer()

  if (!hydrated) return <FocusSkeleton />
  if (!found) return <Missing back={back} />

  function finish(attempt: MockAttempt) {
    const byTopic: Record<string, number[]> = {}
    attempt.tasks.forEach((t, i) => (byTopic[t.topic] ??= []).push(attempt.grades[i].score))
    const scores = Object.fromEntries(Object.entries(byTopic).map(([t, s]) => [t, average(s)]))
    update((p) => ({ ...applyScores(p, scores, attempt.score), attempts: [attempt, ...(p.attempts ?? [])].slice(0, 20) }))
    if (topic) saveLesson({ kind: "written", topicId: topic.id, attempt, score: attempt.score })
  }

  return (
    <MockExam
      topics={topic ? [topic.name] : topicNames}
      title={topic?.name ?? "Examen escrito simulado"}
      back={back}
      create={async (chosen, count, difficulty) => (await generate<{ tasks: MockTask[] }>("mock", { topics: chosen, count, difficulty }))?.tasks}
      grade={(tasks, answers) => generate<Graded>("grade", { tasks, answers })}
      onDone={finish}
    />
  )
}

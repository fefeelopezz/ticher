"use client"

import { useParams } from "next/navigation"
import { Flashcards, Quiz } from "@/components/exam-practice"
import { Missing } from "@/components/focus-shell"
import { MockResult } from "@/components/mock-exam"
import { useStudyTimer } from "@/lib/store"
import { usePrep } from "@/lib/use-prep"
import { FocusSkeleton } from "@/components/page-skeletons"

// A lesson saved under a topic, reopened from that topic's options on the prep page.
export default function SavedLessonPage() {
  const { id, lessonId } = useParams<{ id: string; lessonId: string }>()
  const { prep, hydrated, recordQuiz, scoreLesson } = usePrep(id)
  useStudyTimer()

  const lesson = prep?.savedLessons?.find((l) => l.id === lessonId)
  const title = prep?.topics?.find((t) => t.id === lesson?.topicId)?.name ?? prep?.name ?? ""
  const back = prep ? `/exams/${id}` : "/exams"

  if (!hydrated) return <FocusSkeleton />
  if (!lesson) return <Missing back={back} text="No encontramos esta lección." />

  if (lesson.kind === "cards")
    return <Flashcards cards={lesson.cards} back={back} title={title} onFinish={(known) => scoreLesson(lesson.id, known)} />
  if (lesson.kind === "written") return <MockResult attempt={lesson.attempt} back={back} />
  return (
    <Quiz
      title={title}
      back={back}
      questions={lesson.questions}
      onFinish={(result) => {
        recordQuiz(result)
        scoreLesson(lesson.id, result.accuracy)
      }}
    />
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DifficultyPicker, Quiz, TopicPicker } from "@/components/exam-practice"
import { FocusShell, Missing, useLessonRoute } from "@/components/focus-shell"
import { useStudyTimer, type Difficulty, type Question } from "@/lib/store"
import { FocusSkeleton } from "@/components/page-skeletons"

const QUIZ_SIZES = [5, 10, 15]

// Opción múltiple as its own page: choose topics, size and difficulty, then answer one question at a time.
export default function QuizPage() {
  const { id, hydrated, busy, generate, recordQuiz, saveLesson, topic, topicNames, back, found } = useLessonRoute()
  const router = useRouter()
  const [setup, setSetup] = useState<{ topics: string[]; count: number; difficulty: Difficulty }>()
  const [questions, setQuestions] = useState<Question[]>()
  useStudyTimer()

  if (!hydrated) return <FocusSkeleton />
  if (!found) return <Missing back={back} />

  const title = topic?.name ?? "Cuestionario"
  if (questions) return <Quiz title={title} back={back} questions={questions} onFinish={recordQuiz} />

  const s = setup ?? { topics: topic ? [topic.name] : topicNames, count: 10, difficulty: "medio" as Difficulty }

  async function start() {
    const res = await generate<{ questions: Question[] }>("quiz", { topics: s.topics, count: s.count, difficulty: s.difficulty })
    if (!res?.questions.length) return
    // A topic's quiz is saved under that topic and opened from there; the whole-exam quiz is one-off.
    if (topic) router.replace(`/exams/${id}/lessons/${saveLesson({ kind: "quiz", topicId: topic.id, questions: res.questions })}`)
    else setQuestions(res.questions)
  }

  return (
    <FocusShell back={back} eyebrow="Opción múltiple" title={title} description="Algunas preguntas tienen varias respuestas correctas.">
      <div className="space-y-6">
        {/* A topic's lesson always asks about that topic; only the whole-exam quiz lets you choose. */}
        {!topic && (
          <div className="space-y-2">
            <Label>Selecciona temas</Label>
            <TopicPicker topics={topicNames} selected={s.topics} onChange={(t) => setSetup({ ...s, topics: t })} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Número de preguntas</Label>
          <div className="flex gap-2" role="radiogroup" aria-label="Número de preguntas">
            {QUIZ_SIZES.map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                role="radio"
                aria-checked={s.count === n}
                variant={s.count === n ? "default" : "outline"}
                onClick={() => setSetup({ ...s, count: n })}
              >
                {n} preguntas
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Dificultad</Label>
          <DifficultyPicker value={s.difficulty} onChange={(d) => setSetup({ ...s, difficulty: d })} />
        </div>
        <Button size="lg" className="h-12 w-full rounded-xl text-base" disabled={!s.topics.length || busy !== null} onClick={start}>
          {busy ? "Creando cuestionario…" : "Comenzar"}
        </Button>
      </div>
    </FocusShell>
  )
}

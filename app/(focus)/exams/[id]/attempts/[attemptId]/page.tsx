"use client"

import { useParams } from "next/navigation"
import { MockResult } from "@/components/mock-exam"
import { Missing } from "@/components/focus-shell"
import { usePrep } from "@/lib/use-prep"
import { FocusSkeleton } from "@/components/page-skeletons"

// A past written exam, opened from the Progreso tab of its prep.
export default function AttemptPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>()
  const { prep, hydrated } = usePrep(id)
  const attempt = prep?.attempts?.find((a) => a.id === attemptId)

  if (!hydrated) return <FocusSkeleton />
  const back = prep ? `/exams/${id}` : "/exams"
  if (!attempt) return <Missing back={back} text="No encontramos este examen." />
  return <MockResult attempt={attempt} back={back} />
}

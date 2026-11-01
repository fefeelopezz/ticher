// Run with: node --test lib/prep-context.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { MAX_CHARS, prepContext } from "./prep-context.ts"

const prep = {
  id: "p1",
  name: "Parcial de Geología",
  subject: "Geologia",
  date: "2026-11-10",
  mastery: 40,
  topics: [{ id: "t1", name: "Rocas ígneas", mastery: 60, lessons: 2 }],
  summaries: {
    t1: {
      title: "Cómo se forman las rocas ígneas",
      intro: "Nacen del **magma** al enfriarse.",
      sections: [{ title: "Intrusivas", subtitle: "", body: "Se enfrían lento bajo tierra.", callouts: [{ kind: "ejemplo", title: "Granito", text: "Cristales grandes." }], cards: [], steps: [] }],
      finalQuiz: [],
    },
  },
  savedLessons: [{ id: "l1", topicId: "t1", date: "2026-11-01", kind: "cards", cards: [{ topic: "Rocas ígneas", front: "¿Qué es el basalto?", back: "Roca volcánica" }] }],
  mistakes: [{ topic: "Rocas ígneas", question: "¿El granito es extrusivo?", options: ["Sí", "No"], correct: [1], explanation: "" }],
}

test("includes the prep's topics, smart texts, lessons and mistakes", () => {
  const text = prepContext([prep], new Date("2026-11-01T12:00:00"))
  for (const piece of ["Parcial de Geología", "faltan 9 días", "Rocas ígneas: dominio 60%", "Cómo se forman las rocas ígneas", "Nacen del magma", "Ejemplo, Granito", "¿Qué es el basalto? → Roca volcánica", "¿El granito es extrusivo? (correcta: No)"])
    assert.ok(text.includes(piece), `missing: ${piece}`)
})

test("tolerates older preps without the optional fields", () => {
  assert.match(prepContext([{ id: "p", name: "Viejo", subject: "X", date: "2026-01-01", mastery: 0 }], new Date("2026-01-02T12:00:00")), /fue hace 1 días/)
})

test("caps the size sent to the AI", () => {
  const big = { ...prep, mistakes: Array.from({ length: 3000 }, () => prep.mistakes[0]) }
  assert.ok(prepContext([big]).length <= MAX_CHARS + 20)
})

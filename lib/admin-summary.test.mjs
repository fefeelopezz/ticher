// Run with: node --test lib/admin-summary.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { summarize } from "./admin-summary.ts"

const prep = {
  id: "p1",
  name: "Parcial de Geología",
  subject: "Geologia",
  date: "2026-11-12",
  mastery: 40,
  topics: [{ id: "t1", name: "Rocas ígneas", mastery: 60, lessons: 2 }],
  summaries: { t1: { title: "Rocas", intro: "", sections: [], finalQuiz: [], score: 80 } },
  savedLessons: [
    { id: "l1", topicId: "t1", date: "2026-11-01", kind: "cards", cards: [], score: 75 },
    { id: "l2", topicId: "t1", date: "2026-11-02", kind: "quiz", questions: [] },
  ],
  finals: [{ date: "2026-11-03", score: 70, seconds: 1200 }],
}

const rows = [
  { email: "ana@ejemplo.com", key: "profile", value: { name: "Ana", level: "Universidad" }, updated_at: "2026-11-03T10:00:00Z", created_at: "2026-10-30T09:00:00Z" },
  { email: "ana@ejemplo.com", key: "preps", value: [prep], updated_at: "2026-11-03T12:00:00Z", created_at: "2026-10-31T09:00:00Z" },
  { email: "ana@ejemplo.com", key: "minutes", value: { "2026-11-01": 20, "2026-11-02": 15 }, updated_at: "2026-11-02T08:00:00Z" },
  { email: "beto@ejemplo.com", key: "profile", value: { name: "" }, updated_at: "2026-11-01T10:00:00Z" },
]

test("one summary per user, most recently active first", () => {
  const users = summarize(rows)
  assert.deepEqual(users.map((u) => u.email), ["ana@ejemplo.com", "beto@ejemplo.com"])
  assert.equal(users[1].name, "Sin nombre")
})

test("sign-up is the earliest first save, activity the latest update", () => {
  const ana = summarize(rows)[0]
  assert.equal(ana.joined, "2026-10-30T09:00:00Z")
  assert.equal(ana.lastActive, "2026-11-03T12:00:00Z")
  assert.equal(ana.minutes, 35)
})

test("exam history lists lessons, smart texts and finals, newest first", () => {
  const [ana] = summarize(rows)
  assert.equal(ana.exams[0].name, "Parcial de Geología")
  assert.deepEqual(
    ana.exams[0].history.map((h) => [h.kind, h.date, h.score]),
    [
      ["Examen final", "2026-11-03", 70],
      ["Cuestionario", "2026-11-02", null],
      ["Tarjetas", "2026-11-01", 75],
      ["Texto inteligente", null, 80],
    ]
  )
  assert.equal(ana.lessons, 4)
})

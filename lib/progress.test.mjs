// Run with: node --test lib/progress.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { bump, earn, daysUntil, forecast, isoDate, longestStreak, readiness, withSnapshot, todayPlan } from "./progress.ts"

const now = new Date("2026-10-23T21:30:00")
const day = (n) => isoDate(new Date(now.getTime() + n * 86_400_000))

test("daysUntil counts local calendar days", () => {
  assert.equal(daysUntil(day(0), now), 0)
  assert.equal(daysUntil(day(8), now), 8)
  assert.equal(daysUntil(day(-3), now), -3)
})

test("readiness uses topic mean once topics exist", () => {
  assert.equal(readiness({ mastery: 40 }), 40)
  assert.equal(readiness({ mastery: 40, topics: [{ mastery: 10 }, { mastery: 30 }] }), 20)
})

test("forecast projects the recent pace to the exam date", () => {
  // +2 points/day over the last 5 days, exam in 10 days -> 30 + 20 = 50
  assert.equal(forecast(30, [{ date: day(-5), mastery: 20 }], day(10), now), 50)
  assert.equal(forecast(30, [], day(10), now), 30)
  assert.equal(forecast(90, [{ date: day(-1), mastery: 50 }], day(10), now), 100)
  // snapshots older than 14 days are ignored
  assert.equal(forecast(30, [{ date: day(-20), mastery: 0 }], day(10), now), 30)
})

test("withSnapshot keeps one point per day", () => {
  const h = withSnapshot(withSnapshot([], 10, day(0)), 15, day(0))
  assert.deepEqual(h, [{ date: day(0), mastery: 15 }])
})

test("bump stays within 0-100", () => {
  assert.equal(bump(95, 10), 100)
})

test("earn adds a tenth of the score", () => {
  assert.equal(earn(40, 100), 50)
  assert.equal(earn(40, 70), 47)
  assert.equal(earn(40, 0), 40)
  assert.equal(earn(95, 100), 100)
  assert.equal(earn(40, 150), 50)
})

test("longestStreak counts consecutive days", () => {
  assert.equal(longestStreak([day(-5), day(-4), day(-3), day(-1), day(0), day(-4)]), 3)
  assert.equal(longestStreak([]), 0)
})

test("current streak counts back from today, or from yesterday before studying today", async () => {
  const { currentStreak } = await import("./progress.ts")
  assert.equal(currentStreak([day(0), day(-1), day(-2), day(-4)], now), 3)
  assert.equal(currentStreak([day(-1), day(-2)], now), 2)
  assert.equal(currentStreak([day(-2)], now), 0)
  assert.equal(currentStreak([], now), 0)
})

test("spaced repetition waits longer after each known card and resets on a miss", async () => {
  const { nextReview, isDue } = await import("./progress.ts")
  const first = nextReview(undefined, true, now)
  assert.deepEqual(first, { step: 1, due: day(3) })
  const second = nextReview(first, true, now)
  assert.deepEqual(second, { step: 2, due: day(7) })
  assert.deepEqual(nextReview(second, false, now), { step: 0, due: day(1) })
  assert.deepEqual(nextReview({ step: 4, due: day(0) }, true, now), { step: 4, due: day(30) })
  assert.equal(isDue(undefined, day(0)), true)
  assert.equal(isDue({ step: 1, due: day(3) }, day(0)), false)
  assert.equal(isDue({ step: 1, due: day(0) }, day(0)), true)
})

test("exam reminders fire 7, 3 and 1 days before, and not on other days", async () => {
  const { examsToRemind } = await import("./progress.ts")
  const preps = [0, 1, 2, 3, 7, 8, -1].map((n) => ({ name: `in ${n}`, date: day(n) }))
  assert.deepEqual(
    examsToRemind(preps, now).map((r) => r.days),
    [1, 3, 7]
  )
})

test("today's plan puts the closest exam first and skips past ones", () => {
  const now = new Date("2026-11-06T12:00:00")
  const exam = (id, date, extra) => ({ id, name: id, subject: "x", date, mastery: 0, topics: [{ id: "t", name: "Tema", mastery: 0, lessons: 0 }], ...extra })
  const plan = todayPlan([exam("lejos", "2026-11-20"), exam("pasado", "2026-11-01"), exam("cerca", "2026-11-08", { topics: [] })], now)
  assert.deepEqual(plan.map((t) => [t.exam, t.kind, t.days]), [["cerca", "topics", 2], ["lejos", "read", 14]])
})

test("an exam's tasks follow its state: due cards, the worst mistakes, then reading or practising", () => {
  const now = new Date("2026-11-06T12:00:00")
  const topics = [{ id: "a", name: "A", mastery: 80, lessons: 1 }, { id: "b", name: "B", mastery: 10, lessons: 1 }]
  const prep = {
    id: "e", name: "e", subject: "x", date: "2026-11-10", mastery: 0, topics,
    cards: [{ topic: "A", front: "due", back: "" }, { topic: "A", front: "later", back: "" }],
    reviews: { later: { due: "2026-11-20", step: 2 } },
    mistakes: [{ topic: "b" }, { topic: "B" }, { topic: "A" }],
    summaries: { b: { sections: [{}] } },
  }
  assert.deepEqual(todayPlan([prep], now).map((t) => [t.kind, t.title, t.href]), [
    ["cards", "Repasar 1 tarjeta", "/exams/e/review/all"],
    ["mistakes", "Corregir 2 errores de B", "/exams/e/mistakes/b"],
    ["practice", "Practicar B", "/exams/e/quiz/b"],
  ])
  const done = { ...prep, cards: [], mistakes: [], topics: topics.map((t) => ({ ...t, mastery: 90 })) }
  assert.deepEqual(todayPlan([done], now), [])
})

test("today's plan stays short", () => {
  const now = new Date("2026-11-06T12:00:00")
  const preps = Array.from({ length: 9 }, (_, i) => ({ id: `e${i}`, name: "e", subject: "x", date: "2026-11-10", mastery: 0, topics: [] }))
  assert.equal(todayPlan(preps, now).length, 6)
})

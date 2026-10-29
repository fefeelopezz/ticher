// Run with: node --test lib/grading.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { cleanQuestions, isRight, scoreByTopic } from "./grading.ts"

const q = (correct, options = ["a", "b", "c", "d"]) => ({ topic: "T", question: "¿?", options, correct, explanation: "" })

test("cleanQuestions dedupes, sorts and drops out-of-range indices", () => {
  assert.deepEqual(cleanQuestions([q([2, 0, 2, 7])])[0].correct, [0, 2])
})

test("cleanQuestions drops unusable questions", () => {
  assert.equal(cleanQuestions([q([])]).length, 0) // no right answer
  assert.equal(cleanQuestions([q([0, 1, 2, 3])]).length, 0) // every option right
  assert.equal(cleanQuestions([q([0], ["solo"])]).length, 0) // one option
  assert.equal(cleanQuestions([{ ...q([0]), question: "  " }]).length, 0)
})

test("isRight needs the exact set for multiple answers", () => {
  assert.equal(isRight([1], [1]), true)
  assert.equal(isRight([0, 2], [2, 0]), true)
  assert.equal(isRight([0, 2], [0]), false)
  assert.equal(isRight([0], [0, 1]), false)
})

test("scoreByTopic gives percent right per topic", () => {
  const qs = [
    { topic: "A", correct: [0] },
    { topic: "A", correct: [1] },
    { topic: "B", correct: [0, 1] },
  ]
  assert.deepEqual(scoreByTopic(qs, [[0], [2], [1, 0]]), { A: 50, B: 100 })
  assert.deepEqual(scoreByTopic(qs, []), { A: 0, B: 0 })
})

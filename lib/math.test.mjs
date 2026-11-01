// Run with: node --test lib/math.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { splitMath } from "./math.ts"

test("finds inline and standalone formulas", () => {
  assert.deepEqual(splitMath("Si \\(x^2 = 4\\), entonces:\n\\[ x = \\pm 2 \\]"), [
    { kind: "text", value: "Si " },
    { kind: "math", value: "x^2 = 4", display: false },
    { kind: "text", value: ", entonces:\n" },
    { kind: "math", value: "x = \\pm 2", display: true },
  ])
})

test("leaves prices and plain text alone", () => {
  assert.deepEqual(splitMath("Cuesta $100 y $200."), [{ kind: "text", value: "Cuesta $100 y $200." }])
})

test("an unclosed formula (still being typed) stays as text", () => {
  assert.deepEqual(splitMath("Resultado: \\(x = "), [{ kind: "text", value: "Resultado: \\(x = " }])
})

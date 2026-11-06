// Run with: node --test lib/glossary.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { examGlossary, markTerms } from "./glossary.ts"

const glossary = [
  { term: "célula", definition: "Unidad básica de la vida." },
  { term: "célula madre", definition: "Célula que origina otras." },
  { term: "C++", definition: "Lenguaje de programación." },
]

test("the exam glossary joins every topic's terms, A to Z and without repeats", () => {
  const prep = {
    topics: [{ id: "t1", name: "Uno" }, { id: "t2", name: "Dos" }, { id: "t3", name: "Sin texto" }],
    summaries: {
      t1: { glossary: [{ term: "Zigoto", definition: "a" }, { term: "ATP", definition: "b" }] },
      t2: { glossary: [{ term: "atp ", definition: "c" }, { term: "Árbol", definition: "d" }] },
    },
  }
  assert.deepEqual(examGlossary(prep).map((g) => [g.term, g.topic]), [["Árbol", "Dos"], ["ATP", "Uno"], ["Zigoto", "Uno"]].sort((a, b) => a[0].localeCompare(b[0], "es")))
})

test("marks a term, ignoring case", () => {
  assert.deepEqual(markTerms("La Célula divide.", glossary), [
    { text: "La " },
    { text: "Célula", definition: "Unidad básica de la vida." },
    { text: " divide." },
  ])
})

test("prefers the longest term and matches whole words only, accents included", () => {
  assert.equal(markTerms("Una célula madre.", glossary)[1].definition, "Célula que origina otras.")
  assert.deepEqual(markTerms("Las subcélulas y célulares.", glossary), [{ text: "Las subcélulas y célulares." }])
})

test("marks each term once per block, sharing what was seen across its parts", () => {
  const seen = new Set()
  assert.equal(markTerms("célula y célula", glossary, seen).filter((p) => p.definition).length, 1)
  assert.equal(markTerms("otra célula", glossary, seen).filter((p) => p.definition).length, 0)
})

test("terms with regex characters are safe, and no glossary leaves the text alone", () => {
  assert.equal(markTerms("Uso C++ siempre.", glossary)[1].text, "C++")
  assert.deepEqual(markTerms("Texto", undefined), [{ text: "Texto" }])
})

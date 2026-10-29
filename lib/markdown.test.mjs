// Run with: node --test lib/markdown.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { pagesToMarkdown } from "./markdown.ts"

// One positioned text run; y counts down the page like pdf.js output reads top to bottom.
const t = (str, y, { x = 50, size = 10, eol = true, width = str.length * size * 0.5 } = {}) => ({ str, x, y, width, size, eol })

test("headings by font size, paragraphs joined", () => {
  const md = pagesToMarkdown([
    [
      t("La fotosíntesis", 800, { size: 20 }),
      t("Fase luminosa", 770, { size: 13 }),
      t("La clorofila absorbe la luz", 750),
      t("y rompe el agua.", 738),
      t("La energía se guarda en ATP y NADPH durante el proceso.", 700),
    ],
  ])
  assert.equal(
    md,
    "# La fotosíntesis\n\n## Fase luminosa\n\nLa clorofila absorbe la luz y rompe el agua.\n\nLa energía se guarda en ATP y NADPH durante el proceso."
  )
})

test("bullets become a tight list and hyphenated words rejoin", () => {
  const md = pagesToMarkdown([
    [
      t("Productos de la fotosín-", 800),
      t("tesis en la hoja verde y mucho texto normal aquí", 788),
      t("• Glucosa", 770),
      t("• Oxígeno", 758),
    ],
  ])
  assert.equal(md, "Productos de la fotosíntesis en la hoja verde y mucho texto normal aquí\n\n- Glucosa\n- Oxígeno")
})

test("runs on the same line are merged with spaces from the gap", () => {
  const md = pagesToMarkdown([[t("Ciclo", 800, { eol: false, width: 25 }), t("de Calvin", 800, { x: 80 })]])
  assert.equal(md, "Ciclo de Calvin")
})

test("pages are separated and scanned PDFs give empty text", () => {
  assert.equal(pagesToMarkdown([[t("Página uno", 800)], [t("Página dos", 800)]]), "Página uno\n\nPágina dos")
  assert.equal(pagesToMarkdown([[], []]), "")
})

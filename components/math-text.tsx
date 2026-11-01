"use client"

import katex from "katex"
import "katex/dist/katex.min.css"
import { splitMath } from "@/lib/math"

// Tutor text with its LaTeX formulas typeset. KaTeX escapes what it renders and, without `trust`, refuses
// links or raw HTML, so the AI's output is safe to inject. A formula it can't parse shows as plain text.
export function MathText({ text }: { text: string }) {
  const pieces = splitMath(text)
  const isBlock = (i: number) => pieces[i]?.kind === "math" && (pieces[i] as { display: boolean }).display
  return pieces.map((p, i) => {
    if (p.kind === "text") {
      // A standalone formula is already its own block, so the line break the AI puts around it would add a blank line.
      let value = p.value
      if (isBlock(i - 1)) value = value.replace(/^\n/, "")
      if (isBlock(i + 1)) value = value.replace(/\n$/, "")
      return <span key={i}>{value}</span>
    }
    const html = katex.renderToString(p.value, { displayMode: p.display, throwOnError: false, output: "html" })
    return p.display ? (
      <span key={i} className="my-2 block overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
    ) : (
      <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
    )
  })
}

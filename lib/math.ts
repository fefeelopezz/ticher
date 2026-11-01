// Splits a tutor reply into text and LaTeX pieces. The tutor writes inline formulas as \( … \) and
// standalone ones as \[ … \] (not $, which clashes with prices). Pure so Node can test it.
export type Piece = { kind: "text"; value: string } | { kind: "math"; value: string; display: boolean }

const MATH = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g

export function splitMath(text: string): Piece[] {
  const pieces: Piece[] = []
  let last = 0
  for (const m of text.matchAll(MATH)) {
    if (m.index > last) pieces.push({ kind: "text", value: text.slice(last, m.index) })
    pieces.push({ kind: "math", value: (m[1] ?? m[2]).trim(), display: m[1] !== undefined })
    last = m.index + m[0].length
  }
  if (last < text.length) pieces.push({ kind: "text", value: text.slice(last) })
  return pieces
}

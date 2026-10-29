// Turns positioned PDF text (from pdf.js) into Markdown. Pure, so Node can test it.

export type TextPiece = { str: string; x: number; y: number; width: number; size: number; eol: boolean }

type Line = { text: string; size: number; y: number }

const BULLET = /^[•◦▪●○■–-]\s*/

function toLines(items: TextPiece[]): Line[] {
  const lines: Line[] = []
  let current: (Line & { end: number }) | null = null
  for (const it of items) {
    if (!it.str && !it.eol) continue
    // pdf.js y grows upward; a jump of more than half a glyph means a new line.
    const newLine = !current || Math.abs(it.y - current.y) > Math.max(it.size, current.size) * 0.5
    if (newLine) {
      if (current?.text.trim()) lines.push(current)
      current = { text: it.str, size: it.size, y: it.y, end: it.x + it.width }
    } else if (current) {
      const gap = it.x - current.end
      const space = gap > it.size * 0.15 && !current.text.endsWith(" ") && !it.str.startsWith(" ")
      current.text += (space ? " " : "") + it.str
      current.size = Math.max(current.size, it.str.trim() ? it.size : 0)
      current.end = it.x + it.width
    }
    if (it.eol && current) {
      if (current.text.trim()) lines.push(current)
      current = null
    }
  }
  if (current?.text.trim()) lines.push(current)
  return lines.map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() }))
}

// Body size = the font size that carries the most characters.
function bodySize(lines: Line[]) {
  const weight = new Map<number, number>()
  for (const l of lines) {
    const s = Math.round(l.size * 2) / 2
    weight.set(s, (weight.get(s) ?? 0) + l.text.length)
  }
  return [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
}

export function pagesToMarkdown(pages: TextPiece[][]): string {
  const pageLines = pages.map(toLines)
  const body = bodySize(pageLines.flat())
  const out: string[] = []

  for (const lines of pageLines) {
    let paragraph = ""
    let prev: Line | null = null
    const flush = () => {
      if (paragraph) out.push(paragraph)
      paragraph = ""
    }
    for (const line of lines) {
      const ratio = body ? line.size / body : 1
      const heading = line.text.length <= 120 && ratio >= 1.15 ? (ratio >= 1.6 ? "# " : "## ") : ""
      const bullet = BULLET.test(line.text) && line.text.replace(BULLET, "").length > 0
      const bigGap = prev ? prev.y - line.y > Math.max(prev.size, line.size) * 1.7 : false

      if (heading) {
        flush()
        out.push(heading + line.text)
      } else if (bullet) {
        flush()
        out.push("- " + line.text.replace(BULLET, ""))
      } else if (!paragraph || bigGap) {
        flush()
        paragraph = line.text
      } else if (/[a-záéíóúñü]-$/i.test(paragraph) && /^[a-záéíóúñü]/.test(line.text)) {
        // Rejoin a word hyphenated across lines ("fotosín-" + "tesis").
        paragraph = paragraph.slice(0, -1) + line.text
      } else {
        paragraph += " " + line.text
      }
      prev = line
    }
    flush()
  }
  // Blank line between blocks, but keep consecutive list items together.
  return out
    .map((block, i) => (i > 0 && !(block.startsWith("- ") && out[i - 1].startsWith("- ")) ? "\n" : "") + block)
    .join("\n")
    .trim()
}

import type { ExamPrep, GlossaryEntry } from "./store"

// All the definitions of an exam's smart texts, A to Z, each term once.
export function examGlossary(prep: ExamPrep) {
  const seen = new Set<string>()
  return (prep.topics ?? [])
    .flatMap((topic) => (prep.summaries?.[topic.id]?.glossary ?? []).map((g) => ({ ...g, term: g.term.trim(), topic: topic.name })))
    .filter((g) => !seen.has(g.term.toLowerCase()) && seen.add(g.term.toLowerCase()))
    .sort((a, b) => a.term.localeCompare(b.term, "es"))
}

export type TermPiece = { text: string; definition?: string }

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Splits a text around the glossary's terms, whole words only and ignoring case. `seen` is shared by the
// parts of one block, so each term is marked once there instead of underlining every repeat.
export function markTerms(text: string, glossary: GlossaryEntry[] = [], seen = new Set<string>()): TermPiece[] {
  const terms = glossary.map((g) => g.term.trim()).filter(Boolean).sort((a, b) => b.length - a.length)
  if (!terms.length) return [{ text }]
  // \b only knows ASCII, so it would split words at letters like "á".
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`, "giu")

  const pieces: TermPiece[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const key = match[0].toLowerCase()
    const entry = glossary.find((g) => g.term.trim().toLowerCase() === key)
    if (!entry || seen.has(key)) continue
    seen.add(key)
    pieces.push({ text: text.slice(last, match.index) }, { text: match[0], definition: entry.definition })
    last = match.index + match[0].length
  }
  pieces.push({ text: text.slice(last) })
  return pieces.filter((p) => p.text)
}

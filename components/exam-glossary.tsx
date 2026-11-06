"use client"

import { useState } from "react"
import { Layers, Search } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { examGlossary } from "@/lib/glossary"
import { allCards, type ExamPrep } from "@/lib/store"

// Every definition from the exam's smart texts in one place, one click away from becoming flashcards.
export function ExamGlossary({ prep, update }: { prep: ExamPrep; update: (fn: (p: ExamPrep) => ExamPrep) => void }) {
  const [query, setQuery] = useState("")
  const terms = examGlossary(prep)
  if (!terms.length) return <p className="py-8 text-center text-sm text-muted-foreground">Los conceptos aparecen acá cuando creas un texto inteligente.</p>

  const known = new Set(allCards(prep).map((c) => c.front.trim().toLowerCase()))
  const fresh = terms.filter((t) => !known.has(t.term.trim().toLowerCase()))
  const q = query.trim().toLowerCase()
  const shown = q ? terms.filter((t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)) : terms

  function createCards() {
    update((p) => ({ ...p, cards: [...(p.cards ?? []), ...fresh.map((t) => ({ topic: t.topic, front: t.term, back: t.definition }))] }))
    toast.success(fresh.length === 1 ? "Tarjeta creada" : `${fresh.length} tarjetas creadas`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar concepto" aria-label="Buscar concepto" className="pl-9" />
        </div>
        <Button variant="outline" disabled={!fresh.length} onClick={createCards}>
          <Layers /> {fresh.length ? `Crear ${fresh.length} ${fresh.length === 1 ? "tarjeta" : "tarjetas"}` : "Ya están en tus tarjetas"}
        </Button>
      </div>
      {shown.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No hay conceptos con esa búsqueda.</p>}
      <dl className="divide-y rounded-lg border">
        {shown.map((t) => (
          <div key={t.term} className="space-y-1 p-3">
            <dt className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
              {t.term}
              <Badge variant="outline">{t.topic}</Badge>
            </dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, GraduationCap, Layers, ListChecks, MessageCircle, Paperclip, PenLine, Search, type LucideIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { NO_CHATS, NO_PREPS, NO_SUBJECTS, isCurrentSummary, useStored, type Chat, type ExamPrep, type Subject } from "@/lib/store"
import { same } from "@/lib/use-prep"

type Hit = { key: string; icon: LucideIcon; label: string; detail: string; href: string }

const LESSON_ICONS = { quiz: ListChecks, cards: Layers, written: PenLine }
const LESSON_NAMES = { quiz: "Opción múltiple", cards: "Tarjetas de repaso", written: "Examen escrito" }
const MAX_HITS = 20

// Case- and accent-insensitive, so "fotosintesis" finds "Fotosíntesis".
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

function index(preps: ExamPrep[], chats: Chat[], subjects: Subject[]): Hit[] {
  return [
    ...preps.flatMap((p) => {
      const topic = (id: string) => p.topics?.find((t) => t.id === id)?.name ?? ""
      return [
        { key: p.id, icon: GraduationCap, label: p.name, detail: `Examen · ${p.subject}`, href: `/exams/${p.id}` },
        ...(p.topics ?? []).map((t) => ({ key: t.id, icon: GraduationCap, label: t.name, detail: `Tema · ${p.name}`, href: `/exams/${p.id}` })),
        ...Object.entries(p.summaries ?? {}).flatMap(([topicId, s]) =>
          isCurrentSummary(s)
            ? [{ key: `s-${topicId}`, icon: FileText, label: s.title, detail: `Texto inteligente · ${topic(topicId)}`, href: `/exams/${p.id}/summary/${topicId}` }]
            : []
        ),
        ...(p.savedLessons ?? []).map((l) => ({
          key: l.id,
          icon: LESSON_ICONS[l.kind],
          label: `${LESSON_NAMES[l.kind]}: ${topic(l.topicId)}`,
          detail: `Lección · ${l.date}`,
          href: `/exams/${p.id}/lessons/${l.id}`,
        })),
      ]
    }),
    ...chats.map((c) => ({ key: c.id, icon: MessageCircle, label: c.title, detail: `Conversación · ${c.subject}`, href: `/?chat=${c.id}` })),
    // Files belong to a subject; they open from the Archivos tab of an exam of that subject.
    ...subjects.flatMap((s) => {
      const prep = preps.find((p) => same(p.subject, s.name))
      return prep ? s.materials.map((m) => ({ key: m.id, icon: Paperclip, label: m.name, detail: `Archivo · ${s.name}`, href: `/exams/${prep.id}` })) : []
    }),
  ]
}

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [preps] = useStored<ExamPrep[]>("preps", NO_PREPS)
  const [chats] = useStored<Chat[]>("chats", NO_CHATS)
  const [subjects] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)

  const all = useMemo(() => index(preps, chats, subjects), [preps, chats, subjects])
  const words = fold(query).split(/\s+/).filter(Boolean)
  const hits = words.length ? all.filter((h) => words.every((w) => fold(`${h.label} ${h.detail}`).includes(w))).slice(0, MAX_HITS) : []

  function go(hit: Hit | undefined) {
    if (!hit) return
    onOpenChange(false)
    setQuery("")
    router.push(hit.href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Buscar en Ticher</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1))
              else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0))
              else if (e.key === "Enter") go(hits[active])
              else return
              e.preventDefault()
            }}
            placeholder="Busca un examen, tema, lección, chat o archivo…"
            aria-label="Buscar"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="search-results"
            aria-activedescendant={hits[active] ? `hit-${hits[active].key}` : undefined}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id="search-results" role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {words.length > 0 && hits.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados.</li>}
          {words.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Escribe para buscar en todo Ticher.</li>}
          {hits.map((h, i) => (
            <li
              key={h.key}
              id={`hit-${h.key}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm", i === active && "bg-muted")}
            >
              <h.icon className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{h.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{h.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

// Ctrl+K (Cmd+K on Mac) opens the search from anywhere in the app.
export function useSearchShortcut(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])
}

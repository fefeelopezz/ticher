"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Missing, useLessonRoute } from "@/components/focus-shell"
import { isCurrentSummary } from "@/lib/store"
import { FocusSkeleton } from "@/components/page-skeletons"

// The AI marks key terms with **bold**; on paper they're kept as plain text.
const plain = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, "$1")

// A topic's reading and flashcards laid out for paper; the browser's print dialog also saves it as PDF.
export default function PrintPage() {
  const { prep, hydrated, topic, back, found } = useLessonRoute()

  if (!hydrated) return <FocusSkeleton />
  if (!found || !prep || !topic) return <Missing back={back} />

  const stored = prep.summaries?.[topic.id]
  const summary = isCurrentSummary(stored) ? stored : undefined
  const cards = (prep.savedLessons ?? []).flatMap((l) => (l.kind === "cards" && l.topicId === topic.id ? l.cards : []))

  return (
    // Pages print with no margin (see globals.css), so the padding is the margin; "clone" repeats it on every sheet.
    <main className="mx-auto w-full max-w-[44rem] space-y-8 px-6 py-8 print:max-w-none print:px-[16mm] print:py-[18mm] print:text-black print:[box-decoration-break:clone]">
      {/* Chrome names the saved PDF after the page title. */}
      <title>{`${topic.name} · ${prep.name}`}</title>
      {/* Fixed elements repeat on every printed page. */}
      <p className="fixed top-[7mm] right-[16mm] hidden text-[9px] text-foreground/40 print:block">
        Ticher · Tu tutor de IA para estudiar y preparar exámenes
      </p>
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={back} />}>
          <ArrowLeft /> Volver
        </Button>
        <Button onClick={() => window.print()} disabled={!summary && !cards.length}>
          <Printer /> Imprimir o guardar PDF
        </Button>
      </div>

      <header className="space-y-1 border-b pb-4">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          {prep.subject} · {prep.name}
        </p>
        <h1 className="font-serif text-3xl leading-tight print:text-black">{topic.name}</h1>
      </header>

      {!summary && !cards.length && (
        <p className="text-muted-foreground">
          Este tema todavía no tiene lectura ni tarjetas. Crea un texto inteligente o tarjetas de repaso y vuelve a exportarlo.
        </p>
      )}

      {summary && (
        <section className="space-y-5">
          {summary.title.trim().toLowerCase() !== topic.name.trim().toLowerCase() && <h2 className="text-lg font-semibold">{summary.title}</h2>}
          <p className="leading-relaxed">{plain(summary.intro)}</p>
          {summary.sections.map((s, i) => (
            <article key={i} className="space-y-2 break-inside-avoid">
              <h3 className="font-semibold">
                {i + 1}. {s.title}
              </h3>
              <p className="leading-relaxed whitespace-pre-line">{plain(s.body)}</p>
              {s.callouts.map((c, j) => (
                <p key={j} className="rounded-lg border-l-4 border-primary/60 bg-muted/40 px-3 py-2 text-sm">
                  <b>{c.title}:</b> {plain(c.text)}
                </p>
              ))}
              {s.steps.length > 0 && (
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {s.steps.map((st, j) => (
                    <li key={j}>
                      {/* The list already numbers the steps; drop a number the AI put in the title. */}
                      <b>{st.title.replace(/^\d+[.)]\s*/, "")}:</b> {plain(st.text)}
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))}
        </section>
      )}

      {cards.length > 0 && (
        <section className="space-y-3 break-before-page">
          <h2 className="text-lg font-semibold">Tarjetas de repaso ({cards.length})</h2>
          <div className="grid gap-2 sm:grid-cols-2 print:grid-cols-2">
            {cards.map((c, i) => (
              <div key={i} className="space-y-1 rounded-lg border p-3 text-sm break-inside-avoid">
                <p className="font-medium">{c.front}</p>
                <p className="text-muted-foreground">{c.back}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

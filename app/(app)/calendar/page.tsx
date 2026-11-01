"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, GraduationCap, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/date-picker"
import { SubjectSelect } from "@/components/subject-select"
import { NO_EVENTS, NO_PREPS, daysUntil, today, useHydrated, useStored, type CalendarEvent, type ExamPrep } from "@/lib/store"
import { CalendarSkeleton } from "@/components/page-skeletons"

const fmt = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })

// An event, or an exam prep shown as one; `exam` is the prep's id when it links to an existing prep.
type Item = CalendarEvent & { exam?: string }

export default function CalendarPage() {
  const hydrated = useHydrated()
  const [events, setEvents] = useStored<CalendarEvent[]>("events", NO_EVENTS)
  const [preps] = useStored<ExamPrep[]>("preps", NO_PREPS)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today)

  // New preps add their own event (prepId); older ones, made before that, are listed from the preps themselves.
  const prepIds = new Set(preps.map((p) => p.id))
  const linked = new Set(events.map((e) => e.prepId).filter(Boolean))
  const items: Item[] = [
    ...events.map((e) => ({ ...e, exam: e.prepId && prepIds.has(e.prepId) ? e.prepId : undefined })),
    ...preps
      .filter((p) => !linked.has(p.id))
      .map((p) => ({ id: `prep-${p.id}`, title: p.name, date: p.date, subject: p.subject, note: "", exam: p.id })),
  ]
  const upcoming = items.filter((e) => daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))

  function add(form: FormData) {
    setEvents([
      ...events,
      {
        id: crypto.randomUUID(),
        title: String(form.get("title")).trim(),
        date: String(form.get("date")),
        subject: String(form.get("subject") || "Otro"),
        note: String(form.get("note") ?? "").trim(),
      },
    ])
    setOpen(false)
    setDate(today())
  }

  // Before hydration the stored data is not read yet; show the page's shape instead of empty defaults.
  if (!hydrated) return <CalendarSkeleton />

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Mi calendario</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus /> Agregar evento
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form action={add} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Agregar evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" placeholder="Examen de biología" required maxLength={80} />
              </div>
              {/* One per row: the full date ("Domingo, 1 de noviembre de 2026") doesn't fit in half the dialog. */}
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <DatePicker id="date" name="date" value={date} onChange={setDate} />
              </div>
              <div className="space-y-2">
                <Label>Materia</Label>
                <SubjectSelect name="subject" defaultValue="Otro" className="w-full data-[size=default]:h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Nota adicional (opcional)</Label>
                <Textarea id="note" name="note" maxLength={300} />
              </div>
              <DialogFooter>
                <Button type="submit">Agregar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Próximos</h2>
        {upcoming.length === 0 && <p className="py-12 text-center text-muted-foreground">No hay eventos</p>}
        {upcoming.map((e) =>
          e.exam ? (
            // Exams are managed from their prep (rename, date, delete), so here they just link to it.
            <Link key={e.id} href={`/exams/${e.exam}`} className="block rounded-xl transition-colors hover:bg-muted/40">
              <Card size="sm" className="border-primary/30 bg-transparent">
                <CardContent className="flex items-center gap-4">
                  <div className="w-20 shrink-0 text-sm text-muted-foreground">{fmt(e.date)}</div>
                  <GraduationCap className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{e.subject}</p>
                  </div>
                  <Badge variant="outline" className="hidden border-primary/40 text-primary sm:inline-flex">
                    Examen
                  </Badge>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={e.id} size="sm">
              <CardContent className="flex items-center gap-4">
                <div className="w-20 shrink-0 text-sm text-muted-foreground">{fmt(e.date)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {e.subject}
                    {e.note && ` · ${e.note}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar ${e.title}`}
                  onClick={() => setEvents(events.filter((x) => x.id !== e.id))}
                >
                  <Trash2 />
                </Button>
              </CardContent>
            </Card>
          )
        )}
      </section>
    </div>
  )
}

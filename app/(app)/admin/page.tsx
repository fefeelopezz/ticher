"use client"

import { useEffect, useState } from "react"
import { BookOpen, ChevronDown, Clock, GraduationCap, MessageCircle, Search, Sparkles, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/components/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Message, UserSummary } from "@/lib/admin-summary"

const day = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : "—"

function ago(iso: string, now: number) {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (mins < 60) return `hace ${Math.max(1, mins)} min`
  if (mins < 60 * 24) return `hace ${Math.round(mins / 60)} h`
  return `hace ${Math.round(mins / 60 / 24)} días`
}

const moment = (iso: string) => new Date(iso).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

const hours = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${(minutes / 60).toFixed(1)} h`)

// Only for the emails in ADMIN_EMAILS: /api/admin answers 404 to everyone else, and so does this page.
export default function AdminPage() {
  const [users, setUsers] = useState<UserSummary[]>()
  const [messages, setMessages] = useState<Message[]>([])
  const [me, setMe] = useState("")
  const [confirm, confirmDialog] = useConfirm()
  const [state, setState] = useState<"loading" | "ready" | "hidden" | "error">("loading")
  const [query, setQuery] = useState("")
  // When the data arrived: "active in the last 7 days" and "hace X" are measured from here, not during render.
  const [now, setNow] = useState(0)

  useEffect(() => {
    fetch("/api/admin")
      .then(async (res) => {
        if (res.status === 404) return setState("hidden")
        if (!res.ok) return setState("error")
        const data = await res.json()
        setUsers(data.users)
        setMessages(data.messages)
        setMe(data.me)
        setNow(Date.now())
        setState("ready")
      })
      .catch(() => setState("error"))
  }, [])

  if (state === "hidden") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-2xl font-semibold">Página no encontrada</p>
      </div>
    )
  }
  if (state === "error") {
    return <p className="mx-auto max-w-2xl px-4 py-24 text-center text-muted-foreground">No se pudieron cargar los usuarios. Intenta de nuevo.</p>
  }
  if (state === "loading" || !users) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )
  }

  async function removeUser(u: UserSummary) {
    const ok = await confirm({
      title: `¿Eliminar a ${u.email}?`,
      description: "Se borran para siempre sus exámenes, conversaciones, archivos, accesos, uso de IA y mensajes, y se cierra su sesión. No se puede deshacer.",
      confirmLabel: "Eliminar usuario",
    })
    if (!ok) return
    const res = await fetch("/api/admin", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email }) })
    if (!res.ok) return toast.error((await res.json().catch(() => null))?.error ?? "No se pudo eliminar el usuario.")
    setUsers((all) => all?.filter((x) => x.email !== u.email))
    setMessages((all) => all.filter((m) => m.email !== u.email))
    toast.success("Usuario eliminado")
  }

  const week = now - 7 * 86_400_000
  const totals = [
    { label: "Usuarios", value: users.length, icon: Users },
    { label: "Activos (7 días)", value: users.filter((u) => new Date(u.lastActive).getTime() > week).length, icon: Clock },
    { label: "Exámenes", value: users.reduce((n, u) => n + u.exams.length, 0), icon: GraduationCap },
    { label: "Lecciones", value: users.reduce((n, u) => n + u.lessons, 0), icon: BookOpen },
    { label: "Estudio total", value: hours(users.reduce((n, u) => n + u.minutes, 0)), icon: Clock },
    { label: "IA (24 h)", value: users.reduce((n, u) => n + u.ai.day, 0), icon: Sparkles },
  ]
  const q = query.trim().toLowerCase()
  const shown = q ? users.filter((u) => u.email.includes(q) || u.name.toLowerCase().includes(q)) : users

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      {confirmDialog}
      <h1 className="text-2xl font-semibold tracking-tight">Panel de administración</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {totals.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardContent className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5" /> {label}
              </p>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuarios ({users.length})</TabsTrigger>
          <TabsTrigger value="messages">Mensajes ({messages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o email" aria-label="Buscar usuario" className="pl-9" />
      </div>

      <section className="space-y-2">
        {shown.length === 0 && <p className="py-8 text-center text-muted-foreground">No hay usuarios con ese nombre o email.</p>}
        {shown.map((u) => (
          <details key={u.email} className="group rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-4 [&::-webkit-details-marker]:hidden">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {u.name[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="min-w-56 flex-1">
                <span className="block truncate font-medium">{u.name}</span>
                <span className="block truncate text-sm text-muted-foreground">{u.email}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Se unió el {day(u.joined)} · activo {ago(u.lastActive, now)}
              </span>
              <span className="flex gap-1.5">
                <Badge variant="outline">{u.level}</Badge>
                <Badge variant="outline">{u.exams.length} exám.</Badge>
                <Badge variant="outline">{u.lessons} lecc.</Badge>
                <Badge variant="outline">{hours(u.minutes)}</Badge>
                <Badge variant="outline">{u.ai.total} IA</Badge>
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>

            <div className="space-y-5 border-t p-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">Exámenes ({u.exams.length})</p>
                {u.exams.length === 0 && <p className="text-sm text-muted-foreground">Todavía no creó exámenes.</p>}
                {u.exams.map((e, i) => (
                  <div key={i} className="rounded-lg border">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                      <p className="font-medium">
                        {e.name} <span className="text-sm font-normal text-muted-foreground">· {e.subject}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Examen el {day(e.date)} · {e.topics} temas · dominio {e.mastery}%
                      </p>
                    </div>
                    {e.history.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Sin lecciones todavía.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-xs text-muted-foreground">
                            <tr>
                              <th className="px-3 py-1.5 font-medium">Fecha</th>
                              <th className="px-3 py-1.5 font-medium">Lección</th>
                              <th className="px-3 py-1.5 font-medium">Tema</th>
                              <th className="px-3 py-1.5 text-right font-medium">Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            {e.history.map((h, j) => (
                              <tr key={j} className="border-t">
                                <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{day(h.date)}</td>
                                <td className="px-3 py-1.5 whitespace-nowrap">{h.kind}</td>
                                <td className="px-3 py-1.5">{h.topic}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{h.score === null ? "—" : `${Math.round(h.score)}%`}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uso de IA</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Últimas 24 h</dt>
                    <dd className="text-right tabular-nums">{u.ai.day}</dd>
                    <dt className="text-muted-foreground">Últimos 7 días</dt>
                    <dd className="text-right tabular-nums">{u.ai.week}</dd>
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="text-right tabular-nums">{u.ai.total}</dd>
                    <dt className="text-muted-foreground">Tokens</dt>
                    <dd className="text-right tabular-nums">{u.ai.tokens.toLocaleString("es")}</dd>
                  </dl>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Accesos ({u.logins.length})</p>
                  {u.logins.length === 0 && <p className="text-sm text-muted-foreground">Sin accesos registrados.</p>}
                  {u.logins.slice(0, 10).map((l) => (
                    <p key={l} className="text-sm text-muted-foreground">
                      {moment(l)}
                    </p>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Conversaciones ({u.chats.length})</p>
                {u.chats.length === 0 && <p className="text-sm text-muted-foreground">Sin conversaciones.</p>}
                {u.chats.map((c, i) => (
                  <p key={i} className="flex items-center gap-2 text-sm">
                    <MessageCircle className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.subject} · {c.messages} mensajes · {day(c.updatedAt)}
                    </span>
                  </p>
                ))}
              </div>

              {u.email !== me && (
                <div className="flex justify-end border-t pt-4">
                  <Button variant="destructive" size="sm" onClick={() => removeUser(u)}>
                    <Trash2 /> Eliminar usuario
                  </Button>
                </div>
              )}
            </div>
          </details>
        ))}
      </section>
        </TabsContent>

        <TabsContent value="messages" className="space-y-2">
          {messages.length === 0 && <p className="py-8 text-center text-muted-foreground">Todavía no llegaron mensajes.</p>}
          {messages.map((m) => (
            <article key={m.id} className="space-y-2 rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="min-w-0 truncate text-sm font-medium">
                  {m.email || "Visitante sin correo"}
                  {m.email && !m.detail.signedIn && <span className="font-normal text-muted-foreground"> · correo sin verificar</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {moment(m.created_at)} · {m.detail.page || "—"}
                </p>
              </div>
              <p className="text-sm break-words whitespace-pre-wrap">{m.detail.message}</p>
              {m.email && (
                <a href={`mailto:${m.email}`} className="inline-block text-sm text-primary hover:underline">
                  Responder
                </a>
              )}
            </article>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

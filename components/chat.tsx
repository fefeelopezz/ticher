"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUp, BookOpen, GraduationCap, Lightbulb, Mic, Paperclip, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { SubjectSelect } from "@/components/subject-select"
import { openMaterial, storeFiles } from "@/components/subjects-section"
import { postJson } from "@/lib/api"
import { toPayload } from "@/lib/files"
import {
  DEFAULT_PROFILE,
  NO_CHATS,
  NO_SUBJECTS,
  useStored,
  useStudyTimer,
  write,
  type Chat as ChatData,
  type ChatMessage,
  type Material,
  type Profile,
  type Subject,
} from "@/lib/store"

type Recognition = {
  lang: string
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onend: () => void
  start: () => void
}
type RecognitionCtor = new () => Recognition

// Web Speech API (Chrome, Edge, Safari); the mic button hides where it's missing.
const getRecognition = () => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}
const noop = () => () => {}

const ATTACH_ACCEPT = "application/pdf,image/png,image/jpeg,image/gif,image/webp,.txt,.md"

type Props = { chatId?: string; initialPrompt?: string; initialSubject?: string }

export function Chat({ chatId, initialPrompt = "", initialSubject }: Props) {
  const router = useRouter()
  const [profile] = useStored<Profile>("profile", DEFAULT_PROFILE)
  const [chats] = useStored<ChatData[]>("chats", NO_CHATS)
  const [subjects] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  const saved = chats.find((c) => c.id === chatId)

  const [id, setId] = useState(chatId)
  const [input, setInput] = useState(initialPrompt)
  const [subject, setSubject] = useState(saved?.subject ?? initialSubject ?? "Otro")
  const [pendingFiles, setPendingFiles] = useState<Material[]>([])
  const [useMaterial, setUseMaterial] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [listening, setListening] = useState(false)
  const canDictate = useSyncExternalStore(noop, () => !!getRecognition(), () => false)
  const fileInput = useRef<HTMLInputElement>(null)
  useStudyTimer()

  const chat = chats.find((c) => c.id === id)
  const messages = chat?.messages ?? []
  const files = chat?.files ?? pendingFiles
  const suggestions = chat?.suggestions ?? []
  const subjectMaterials = subjects.find((s) => s.name.toLowerCase() === subject.toLowerCase())?.materials ?? []
  const name = profile.name.trim().split(" ")[0]

  function updateChat(chatId: string, fn: (c: ChatData) => ChatData) {
    write<ChatData[]>("chats", NO_CHATS, (all) => all.map((c) => (c.id === chatId ? fn(c) : c)))
  }

  async function send(text = input.trim()) {
    if (!text || thinking) return
    const userMessage: ChatMessage = { role: "user", content: text }
    const history = [...messages, userMessage]
    let current = id
    if (!current) {
      const newId = crypto.randomUUID()
      current = newId
      write<ChatData[]>("chats", NO_CHATS, (all) => [
        { id: newId, title: text.slice(0, 60), subject, messages: history, files: pendingFiles, updatedAt: Date.now() },
        ...all,
      ])
      setId(current)
      setPendingFiles([])
    } else {
      updateChat(current, (c) => ({ ...c, subject, messages: history, suggestions: [], updatedAt: Date.now() }))
    }
    setInput("")
    setThinking(true)
    try {
      const { files: payload, skipped } = await toPayload([...files, ...(useMaterial ? subjectMaterials : [])])
      if (skipped.length) toast.info(`No se enviaron a la IA: ${skipped.join(", ")} (formato no compatible o muy grande).`)
      const data = await postJson<{ reply: string; suggestions: string[] }>("/api/chat", {
        subject,
        name: profile.name,
        socratic: profile.socratic,
        messages: history,
        files: payload,
      })
      updateChat(current, (c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: data.reply }],
        suggestions: data.suggestions,
        updatedAt: Date.now(),
      }))
      if (!chatId) router.replace(`/?chat=${current}`, { scroll: false })
    } catch (e) {
      // Drop the unanswered question (and a chat it would leave empty); put it back in the box to retry.
      const failed = current
      write<ChatData[]>("chats", NO_CHATS, (all) =>
        all.flatMap((c) => (c.id !== failed ? [c] : c.messages.length > 1 ? [{ ...c, messages: c.messages.slice(0, -1) }] : []))
      )
      if (messages.length === 0) {
        setId(chatId)
        setPendingFiles(files)
      }
      setInput(text)
      toast.error((e as Error).message)
    } finally {
      setThinking(false)
    }
  }

  async function attach(list: File[]) {
    const stored = await storeFiles(list)
    if (!stored.length) return
    if (id) updateChat(id, (c) => ({ ...c, files: [...c.files, ...stored] }))
    else setPendingFiles([...pendingFiles, ...stored])
  }

  function dictate() {
    const Ctor = getRecognition()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = "es-ES"
    rec.onresult = (e) => setInput((prev) => `${prev} ${e.results[0][0].transcript}`.trim())
    rec.onend = () => setListening(false)
    setListening(true)
    rec.start()
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <SubjectSelect value={subject} onChange={setSubject} />
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
            <Plus /> Nuevo chat
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 py-6">
        {messages.length === 0 ? (
          <div className="my-auto space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight">{name ? `Hola, ${name}` : "¿Algo se te complica?"}</h1>
              <p className="text-muted-foreground">
                {name ? "¿Algo se te complica? Vamos a resolverlo ahora." : "Vamos a resolverlo ahora."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card size="sm" className="cursor-pointer" onClick={() => document.querySelector("textarea")?.focus()}>
                <CardHeader>
                  <Lightbulb className="size-4" />
                  <CardTitle>Ayuda rápida</CardTitle>
                  <CardDescription>Escribe tu duda o sube una foto del ejercicio.</CardDescription>
                </CardHeader>
              </Card>
              <Link href="/exams/new">
                <Card size="sm" className="h-full">
                  <CardHeader>
                    <GraduationCap className="size-4" />
                    <CardTitle>Preparación para examen</CardTitle>
                    <CardDescription>Crea un plan de estudio para tu próximo examen.</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-muted px-4 py-2"
                  : "max-w-full whitespace-pre-wrap leading-relaxed"
              }
            >
              {m.content}
            </div>
          ))
        )}
        {thinking && <p className="animate-pulse text-sm text-muted-foreground">Pensando…</p>}
        {!thinking && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button key={s} variant="outline" size="sm" className="h-auto whitespace-normal py-1 text-left" onClick={() => send(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-4 space-y-2">
        {(files.length > 0 || subjectMaterials.length > 0) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {subjectMaterials.length > 0 && (
              <button
                type="button"
                onClick={() => setUseMaterial(!useMaterial)}
                aria-pressed={useMaterial}
                className={`flex items-center gap-1 rounded-full border px-2 py-1 ${useMaterial ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <BookOpen className="size-3" />
                Usar material de {subject} ({subjectMaterials.length})
              </button>
            )}
            {files.map((f) => (
              <span key={f.id} className="flex items-center gap-1 rounded-full border bg-background px-2 py-1">
                <button type="button" className="max-w-40 truncate hover:underline" onClick={() => openMaterial(f)}>
                  {f.name}
                </button>
                {!id && (
                  <button
                    type="button"
                    aria-label={`Quitar ${f.name}`}
                    onClick={() => setPendingFiles(pendingFiles.filter((p) => p.id !== f.id))}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        <form
          className="flex items-end gap-1 rounded-2xl border bg-background p-2"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <Button type="button" variant="ghost" size="icon" aria-label="Adjuntar foto o archivo" onClick={() => fileInput.current?.click()}>
            <Paperclip />
          </Button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ATTACH_ACCEPT}
            className="hidden"
            onChange={(e) => {
              attach([...(e.target.files ?? [])])
              e.target.value = ""
            }}
          />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Pregunta o sube una foto del ejercicio…"
            aria-label="Mensaje"
            maxLength={4000}
            className="max-h-40 min-h-10 resize-none border-0 shadow-none focus-visible:ring-0"
          />
          {canDictate && (
            <Button
              type="button"
              variant={listening ? "secondary" : "ghost"}
              size="icon"
              aria-label="Dictar"
              aria-pressed={listening}
              onClick={dictate}
            >
              <Mic className={listening ? "animate-pulse" : ""} />
            </Button>
          )}
          <Button type="submit" size="icon" disabled={!input.trim() || thinking} aria-label="Enviar">
            <ArrowUp />
          </Button>
        </form>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUp, BookOpen, GraduationCap, Lightbulb, Mic, Paperclip, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { SubjectSelect } from "@/components/subject-select"
import { MathText } from "@/components/math-text"
import { openMaterial, storeFiles } from "@/components/subjects-section"
import { Whiteboard } from "@/components/whiteboard"
import { postJson } from "@/lib/api"
import { getFile, toPayload } from "@/lib/files"
import { prepContext } from "@/lib/prep-context"
import { cn } from "@/lib/utils"
import {
  DEFAULT_PROFILE,
  NO_CHATS,
  NO_PREPS,
  NO_SUBJECTS,
  useHydrated,
  useStored,
  useStudyTimer,
  write,
  type Chat as ChatData,
  type ChatMessage,
  type ExamPrep,
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

// Home greetings; one is picked per visit and {name} becomes the signed-in student's first name.
const GREETINGS = [
  "¿Algo se te complica, {name}?",
  "Resolvamos algo, {name}",
  "¿Qué estudiamos hoy, {name}?",
  "¿En qué te ayudo, {name}?",
  "Vamos con todo, {name}",
  "Hola {name}, ¿qué aprendemos hoy?",
]

// Reveals a reply progressively (about 2 s whatever its length). It reveals text without moving anything,
// so it also runs when the OS asks for reduced motion (Windows often has that on by default).
function TypedText({ text, onDone }: { text: string; onDone: () => void }) {
  const [shown, setShown] = useState(0)
  const done = shown >= text.length
  useEffect(() => {
    if (done) {
      onDone()
      return
    }
    const step = Math.max(2, Math.ceil(text.length / 120))
    const id = setTimeout(() => setShown((s) => Math.min(text.length, s + step)), 16)
    return () => clearTimeout(id)
    // onDone is a fresh closure each render; re-running only on progress is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, done, text.length])
  return (
    <>
      {/* A formula still being typed (no closing delimiter yet) shows as text until it's complete. */}
      <MathText text={text.slice(0, shown)} />
      {!done && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" aria-hidden />}
    </>
  )
}

type Props = { chatId?: string; initialPrompt?: string; initialSubject?: string }

// Concave corner joining the composer's top border (bottom row) to the tab's left side (right column).
// Drawn for the left side; mirror it with -scale-x-100 for the right.
function Shoulder({ className }: { className: string }) {
  return (
    // 13px wide, one more than the curve: the cover reaches 1px into the tab so it hides the tab's side border
    // under the curve in full. The tab is centered with a translate and often lands between pixels (e.g. x = 594.125),
    // which smears that border over two pixel columns and left a faint line in each corner.
    <svg viewBox="0 0 13 12" aria-hidden className={`absolute bottom-0 h-3 w-[13px] ${className}`}>
      {/* The cover's curve also sits half a pixel inside the stroke, so it hides whole pixels of the borders it meets. */}
      <path d="M0 11A11 11 0 0 0 11 0H13V12H0Z" className="fill-background" />
      <path
        d="M0 11.5A11.5 11.5 0 0 0 11.5 0"
        fill="none"
        className="stroke-border transition-colors group-focus-within:stroke-primary/50"
      />
    </svg>
  )
}

// Attached images are shown from their bytes in IndexedDB; other files show as a named chip.
function useFileUrl(id: string, isImage: boolean) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!isImage) return
    let live = true
    let made: string | undefined
    getFile(id)
      .then((blob) => {
        if (!blob || !live) return
        made = URL.createObjectURL(blob)
        setUrl(made)
      })
      .catch(() => {})
    return () => {
      live = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [id, isImage])
  return url
}

function Attachment({ file, size, onRemove }: { file: Material; size: "thumb" | "full"; onRemove?: () => void }) {
  const isImage = file.type.startsWith("image/")
  const url = useFileUrl(file.id, isImage)
  const remove = onRemove && (
    <button
      type="button"
      aria-label={`Quitar ${file.name}`}
      onClick={onRemove}
      className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
    >
      <X className="size-3" />
    </button>
  )
  if (isImage) {
    return (
      <span className="relative inline-flex">
        {/* Orange marks what's about to be sent; once in the conversation it's a plain bordered picture. */}
        <button
          type="button"
          onClick={() => openMaterial(file)}
          title={file.name}
          className={cn("overflow-hidden rounded-xl bg-muted", size === "thumb" ? "border-2 border-primary/70" : "border")}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image can't optimize it
            <img src={url} alt={file.name} className={size === "thumb" ? "size-16 object-cover" : "max-h-40 w-auto max-w-60 object-contain"} />
          ) : (
            <span className={cn("block animate-pulse", size === "thumb" ? "size-16" : "h-32 w-48")} />
          )}
        </button>
        {remove}
      </span>
    )
  }
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1 rounded-xl bg-background px-2.5 py-1.5 text-xs",
        size === "thumb" ? "border-2 border-primary/70" : "border"
      )}
    >
      <Paperclip className="size-3 shrink-0 text-primary" />
      <button type="button" className="max-w-40 truncate hover:underline" onClick={() => openMaterial(file)}>
        {file.name}
      </button>
      {remove}
    </span>
  )
}

// "Material" button: a popup with one switch per source the tutor can read for this subject.
function MaterialPicker(p: {
  subject: string
  files: number
  preps: number
  useFiles: boolean
  usePrep: boolean
  onFiles: (on: boolean) => void
  onPrep: (on: boolean) => void
}) {
  const active = (p.files > 0 && p.useFiles) || (p.preps > 0 && p.usePrep)
  const rows = [
    p.files > 0 && {
      id: "use-files",
      label: `Archivos (${p.files})`,
      hint: "Tus apuntes y archivos de la materia.",
      checked: p.useFiles,
      onChange: p.onFiles,
    },
    p.preps > 0 && {
      id: "use-prep",
      label: `Preparación de examen${p.preps > 1 ? `es (${p.preps})` : ""}`,
      hint: "Temas, textos inteligentes, lecciones y errores.",
      checked: p.usePrep,
      onChange: p.onPrep,
    },
  ].filter((r) => !!r)
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon" className="relative" aria-label={`Material de ${p.subject}${active ? " (en uso)" : ""}`} title="Material de estudio" />
        }
      >
        <BookOpen />
        {/* Orange dot: the tutor is reading at least one source. */}
        {active && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />}
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 space-y-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Material de {p.subject}</p>
          <p className="text-xs text-muted-foreground">Elige qué puede leer el tutor para responderte.</p>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3">
            <Label htmlFor={r.id} className="flex-col items-start gap-0.5 font-normal">
              <span className="text-sm">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.hint}</span>
            </Label>
            <Switch id={r.id} checked={r.checked} onCheckedChange={r.onChange} />
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

export function Chat({ chatId, initialPrompt = "", initialSubject }: Props) {
  const router = useRouter()
  const [profile] = useStored<Profile>("profile", DEFAULT_PROFILE)
  const [chats] = useStored<ChatData[]>("chats", NO_CHATS)
  const [subjects] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  const [preps] = useStored<ExamPrep[]>("preps", NO_PREPS)
  const saved = chats.find((c) => c.id === chatId)

  const [id, setId] = useState(chatId)
  const [input, setInput] = useState(initialPrompt)
  const [subject, setSubject] = useState(saved?.subject ?? initialSubject ?? "Otro")
  const [pendingFiles, setPendingFiles] = useState<Material[]>([])
  // Both on by default; the "Material" popup lets the student leave either out.
  const [useFiles, setUseFiles] = useState(true)
  const [usePrep, setUsePrep] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [listening, setListening] = useState(false)
  const canDictate = useSyncExternalStore(noop, () => !!getRecognition(), () => false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [typing, setTyping] = useState<number | null>(null)
  const [greeting] = useState(() => Math.floor(Math.random() * GREETINGS.length))
  const hydrated = useHydrated()
  useStudyTimer()

  const chat = chats.find((c) => c.id === id)
  const messages = chat?.messages ?? []
  const chatFiles = chat?.files ?? []
  const suggestions = chat?.suggestions ?? []
  const subjectMaterials = subjects.find((s) => s.name.toLowerCase() === subject.toLowerCase())?.materials ?? []
  // The exam preps of this subject: the tutor can answer about their lessons, smart texts and mistakes.
  const subjectPreps = preps.filter((p) => p.subject.toLowerCase() === subject.toLowerCase())
  const name = profile.name.trim().split(" ")[0]

  function updateChat(chatId: string, fn: (c: ChatData) => ChatData) {
    write<ChatData[]>("chats", NO_CHATS, (all) => all.map((c) => (c.id === chatId ? fn(c) : c)))
  }

  async function send(text = input.trim()) {
    if (!text || thinking) return
    // What's in the composer goes with this message; the AI keeps seeing every file of the conversation.
    const sent = pendingFiles
    const userMessage: ChatMessage = { role: "user", content: text, ...(sent.length && { files: sent.map((f) => f.id) }) }
    const history = [...messages, userMessage]
    let current = id
    if (!current) {
      const newId = crypto.randomUUID()
      current = newId
      write<ChatData[]>("chats", NO_CHATS, (all) => [
        { id: newId, title: text.slice(0, 60), subject, messages: history, files: sent, updatedAt: Date.now() },
        ...all,
      ])
      setId(current)
    } else {
      updateChat(current, (c) => ({ ...c, subject, messages: history, files: [...c.files, ...sent], suggestions: [], updatedAt: Date.now() }))
    }
    setPendingFiles([])
    setInput("")
    setThinking(true)
    try {
      const { files: payload, skipped } = await toPayload([...chatFiles, ...sent, ...(useFiles ? subjectMaterials : [])])
      if (skipped.length) toast.info(`No se enviaron a la IA: ${skipped.join(", ")} (formato no compatible o muy grande).`)
      const data = await postJson<{ reply: string; suggestions: string[]; title?: string }>("/api/chat", {
        subject,
        name: profile.name,
        socratic: profile.socratic,
        messages: history,
        files: payload,
        prep: usePrep && subjectPreps.length ? prepContext(subjectPreps) : "",
      })
      updateChat(current, (c) => ({
        ...c,
        // The AI re-summarizes the whole conversation on every reply, so the sidebar name follows the topic.
        title: data.title || c.title,
        messages: [...c.messages, { role: "assistant", content: data.reply }],
        suggestions: data.suggestions,
        updatedAt: Date.now(),
      }))
      setTyping(history.length)
    } catch (e) {
      // Drop the unanswered question (and a chat it would leave empty); put it and its files back in the box to retry.
      const failed = current
      const sentIds = new Set(sent.map((f) => f.id))
      write<ChatData[]>("chats", NO_CHATS, (all) =>
        all.flatMap((c) =>
          c.id !== failed
            ? [c]
            : c.messages.length > 1
              ? [{ ...c, messages: c.messages.slice(0, -1), files: c.files.filter((f) => !sentIds.has(f.id)) }]
              : []
        )
      )
      if (messages.length === 0) setId(chatId)
      setPendingFiles(sent)
      setInput(text)
      toast.error((e as Error).message)
    } finally {
      setThinking(false)
    }
  }

  async function attach(list: File[]) {
    const stored = await storeFiles(list)
    if (stored.length) setPendingFiles((p) => [...p, ...stored])
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
      {messages.length > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
            <Plus /> Nuevo chat
          </Button>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 py-6">
        {messages.length === 0 ? (
          <div className="my-auto space-y-6">
            <div className="space-y-2 text-center animate-in fade-in motion-safe:slide-in-from-bottom-2 duration-700">
              <h1 className="text-3xl font-semibold tracking-tight text-balance">
                {name && hydrated ? (
                  GREETINGS[greeting].split("{name}").map((part, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-primary">{name}</span>}
                      {part}
                    </span>
                  ))
                ) : (
                  "¿Algo se te complica?"
                )}
              </h1>
              <p className="text-muted-foreground">Vamos a resolverlo ahora.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 animate-in fade-in duration-700 delay-150 fill-mode-both">
              <Card
                size="sm"
                className="cursor-pointer transition-all hover:-translate-y-0.5 hover:ring-primary/40"
                onClick={() => document.querySelector("textarea")?.focus()}
              >
                <CardHeader>
                  <Lightbulb className="size-4" />
                  <CardTitle>Ayuda rápida</CardTitle>
                  <CardDescription>Escribe tu duda o sube una foto del ejercicio.</CardDescription>
                </CardHeader>
              </Card>
              <Link href="/exams/new">
                <Card size="sm" className="h-full transition-all hover:-translate-y-0.5 hover:ring-primary/40">
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
          messages.map((m, i) => {
            const attached = (m.files ?? []).flatMap((fid) => chatFiles.filter((f) => f.id === fid))
            return (
              <div
                key={i}
                className={cn(
                  "animate-in fade-in motion-safe:slide-in-from-bottom-1 duration-300",
                  m.role === "user" ? "ml-auto flex max-w-[85%] flex-col items-end gap-2" : "max-w-full whitespace-pre-wrap leading-relaxed"
                )}
              >
                {attached.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-2">
                    {attached.map((f) => (
                      <Attachment key={f.id} file={f} size="full" />
                    ))}
                  </div>
                )}
                {m.role === "user" ? (
                  <span className="whitespace-pre-wrap rounded-2xl bg-muted px-4 py-2">{m.content}</span>
                ) : i === typing ? (
                  <TypedText
                    text={m.content}
                    onDone={() => {
                      setTyping(null)
                      // Swap to the conversation URL only after the reply finished writing (it remounts the chat).
                      if (!chatId && id) router.replace(`/?chat=${id}`, { scroll: false })
                    }}
                  />
                ) : (
                  <MathText text={m.content} />
                )}
              </div>
            )
          })
        )}
        {thinking && (
          <div className="flex items-center gap-1.5 py-2" role="status" aria-label="Pensando">
            {[0, 150, 300].map((delay) => (
              <span key={delay} className="size-2 rounded-full bg-primary/70 animate-pulse motion-safe:animate-bounce" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
        )}
        {!thinking && typing === null && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in fade-in duration-500">
            {suggestions.map((s) => (
              <Button key={s} variant="outline" size="sm" className="h-auto whitespace-normal py-1 text-left" onClick={() => send(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-4 space-y-2">
        <form
          className="group relative mt-11 flex flex-col gap-2 rounded-2xl border bg-background p-2 shadow-sm transition-colors focus-within:border-primary/50"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          {/* Tab rising out of the composer's top edge; each shoulder draws the curve from the composer border
              up into the tab's side while hiding the border under it. */}
          <div className="absolute bottom-full left-1/2 z-10 -translate-x-1/2 rounded-t-2xl border border-b-0 bg-background px-2 pt-1.5 pb-1 transition-colors group-focus-within:border-primary/50">
            <Shoulder className="-left-3" />
            <SubjectSelect
              value={subject}
              onChange={setSubject}
              size="sm"
              className="max-w-44 rounded-full border-primary bg-primary/10 px-3 text-xs font-semibold dark:bg-primary/10 dark:hover:bg-primary/20"
            />
            <Shoulder className="-right-3 -scale-x-100" />
          </div>
          {/* Attached but not sent yet: inside the composer, so they read as part of the message. */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 px-1 pt-1">
              {pendingFiles.map((f) => (
                <Attachment key={f.id} file={f} size="thumb" onRemove={() => setPendingFiles((p) => p.filter((x) => x.id !== f.id))} />
              ))}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="Adjuntar foto o archivo" onClick={() => fileInput.current?.click()}>
              <Paperclip />
            </Button>
            <Whiteboard onDone={(file) => attach([file])} />
            {(subjectMaterials.length > 0 || subjectPreps.length > 0) && (
              <MaterialPicker
                subject={subject}
                files={subjectMaterials.length}
                preps={subjectPreps.length}
                useFiles={useFiles}
                usePrep={usePrep}
                onFiles={setUseFiles}
                onPrep={setUsePrep}
              />
            )}
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
              // The composer box is the field; the textarea itself stays transparent so icons line up on one axis.
              className="max-h-40 min-h-9 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
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
          </div>
        </form>
      </div>
    </div>
  )
}

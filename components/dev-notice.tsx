"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { ArrowRight, Construction, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { postJson } from "@/lib/api"
import type { Lang } from "@/lib/lang"
import { cn } from "@/lib/utils"

const ES = {
  banner: "Ticher está en desarrollo. ¿Encontraste un error o tienes una idea?",
  bannerCta: "Escríbenos",
  card: "Ticher está en desarrollo",
  cardCta: "Cuéntanos qué mejorar",
  title: "Envíanos un mensaje",
  lead: "Ticher está en desarrollo. Cuéntanos qué error encontraste, qué te gustaría que agreguemos o lo que quieras: leemos todos los mensajes.",
  message: "Tu mensaje",
  placeholder: "Escribe tu mensaje…",
  email: "Tu correo (opcional, para poder responderte)",
  cancel: "Cancelar",
  send: "Enviar",
  sending: "Enviando…",
  thanks: "¡Gracias! Recibimos tu mensaje.",
}

const EN: typeof ES = {
  banner: "Ticher is in development. Found a bug or have an idea?",
  bannerCta: "Write to us",
  card: "Ticher is in development",
  cardCta: "Tell us what to improve",
  title: "Send us a message",
  lead: "Ticher is in development. Tell us about a bug you found, something you'd like us to add or anything else: we read every message.",
  message: "Your message",
  placeholder: "Write your message…",
  email: "Your email (optional, so we can reply)",
  cancel: "Cancel",
  send: "Send",
  sending: "Sending…",
  thanks: "Thanks! We got your message.",
}

// The "in development" notice: a thin bar on the landing, a card in the app's sidebar. Either opens a
// form whose messages are emailed to the team (app/api/feedback). Signed-in users are known by their session.
export function DevNotice({ variant, lang = "es" }: { variant: "banner" | "card"; lang?: Lang }) {
  const t = lang === "en" ? EN : ES
  const page = usePathname()
  // Visitors on the landing have no session, so they can leave an email to get a reply.
  const askEmail = variant === "banner"
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    try {
      await postJson("/api/feedback", { message, email, page, website })
      toast.success(t.thanks)
      setMessage("")
      setOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "banner" ? (
        <DialogTrigger className="group flex w-full items-center justify-center gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-foreground/90 transition-colors hover:bg-primary/15 sm:text-sm">
          <Construction className="size-4 shrink-0 text-primary" />
          <span className="truncate">{t.banner}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
            {t.bannerCta}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </DialogTrigger>
      ) : (
        <DialogTrigger className="mx-2 mb-1 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-left text-xs transition-colors hover:bg-primary/15">
          <Construction className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span className="space-y-0.5">
            <span className="block font-medium">{t.card}</span>
            <span className="block text-muted-foreground">{t.cardCta}</span>
          </span>
        </DialogTrigger>
      )}
      {/* The landing is always dark; the dialog renders outside it, so it takes the dark palette explicitly. */}
      <DialogContent className={cn("sm:max-w-md", variant === "banner" && "dark bg-background text-foreground")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <DialogHeader>
            <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Construction className="size-4" />
            </span>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription>{t.lead}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="feedback-message" className="sr-only">
              {t.message}
            </Label>
            <Textarea
              id="feedback-message"
              required
              minLength={3}
              maxLength={3000}
              rows={5}
              autoFocus
              placeholder={t.placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          {askEmail && (
            <div className="space-y-2">
              <Label htmlFor="feedback-email" className="text-xs text-muted-foreground">
                {t.email}
              </Label>
              <Input id="feedback-email" type="email" autoComplete="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          {/* Honeypot: invisible to people, bots fill it in and their message is dropped. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] size-px opacity-0"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t.cancel}</DialogClose>
            <Button type="submit" disabled={busy || message.trim().length < 3}>
              <Send /> {busy ? t.sending : t.send}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

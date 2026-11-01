"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  Clock,
  FileText,
  Layers,
  ListChecks,
  Paperclip,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DevNotice } from "@/components/dev-notice"
import { LangSwitch } from "@/components/lang-switch"
import { Logo } from "@/components/logo"
import { ScoreRing } from "@/components/question-card"
import { useLang, type Lang } from "@/lib/lang"
import { cn } from "@/lib/utils"

const REGISTER = "/login?mode=register"
// Buttons lift a little on hover and sink on press.
const LIFT = "duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as React.CSSProperties

const ES = {
  nav: { prep: "Preparar exámenes", tutor: "Tutor", faq: "Preguntas", login: "Iniciar sesión", register: "Registrarse" },
  hero: {
    badge: "Gratis · Sin contraseña",
    title: ["Prepara tus exámenes", "con un tutor de IA"],
    lead: "Tus apuntes, tus diapositivas, tus exámenes anteriores. Ticher arma un plan de estudio con ellos para que llegues listo al día del examen.",
    cta: "Empieza gratis",
    prompt: "¿Tienes un examen pronto? Dame todo lo que estás estudiando.",
    files: ["Apuntes_Biologia.pdf", "Foto de la pizarra.jpg", "Examen 2025.pdf"],
    date: "Examen: 12 de diciembre",
  },
  prep: {
    title: "Todo lo que necesitas para llegar listo al examen",
    lead: "Tus propios materiales se convierten en lecciones, cuestionarios y simulacros, así estudias solo lo que entra en tu examen.",
    plan: { title: "Un plan paso a paso, hecho con tus apuntes", text: "Pon la fecha del examen y sube tus materiales. Ticher los divide en temas y te dice qué estudiar cada día." },
    planMock: { goal: "Dominio para el 12 dic", topics: ["Célula y membrana", "Mitosis y meiosis", "Genética mendeliana"] },
    ways: { title: "Aprende de la forma que te funcione", text: "Cada tema como prefieras: texto inteligente, tarjetas, cuestionarios o preguntas para escribir." },
    waysMock: ["Texto inteligente", "Tarjetas de repaso", "Cuestionario", "Pregunta escrita"],
    review: { title: "Repaso espaciado para no olvidar", text: "Las tarjetas vuelven justo cuando estás por olvidarlas. Menos horas, más memoria." },
    reviewMock: { front: "¿Qué ocurre en la anafase?", back: "Las cromátidas hermanas se separan hacia polos opuestos.", next: "Próximo repaso en 3 días" },
    mock: { title: "Simulacros como el examen real", text: "Examen final con tiempo y sin ayudas hasta que entregas. Al terminar ves qué temas reforzar." },
    mockMock: { timer: "42:18 restantes", question: "¿Qué orgánulo produce la mayor parte del ATP?", options: ["Ribosoma", "Mitocondria", "Aparato de Golgi"] },
  },
  tutor: {
    title: "Un tutor personal siempre disponible",
    lead: "Pregunta lo que quieras, cuando quieras. Ticher te lo explica paso a paso, a tu nivel, hasta que lo entiendas.",
    ask: { title: "Pregunta lo que quieras, a cualquier hora", text: "Conversa como con un profesor particular: repregunta, pide ejemplos o que te lo explique de otra forma." },
    askMock: {
      user: "No entiendo por qué el producto punto de vectores perpendiculares da cero",
      ai: "Piénsalo así: el producto punto mide cuánto apunta un vector en la dirección del otro. Si forman 90°, cos 90° = 0…",
    },
    photo: { title: "¿Trabado en un ejercicio? Sácale una foto", text: "Sube una foto de tus apuntes o de un problema y Ticher lo lee y te guía." },
    photoMock: "Foto del ejercicio",
    errors: { title: "Entiende tus errores", text: "Cuando te equivocas, Ticher te explica por qué y guarda la pregunta para que la repases después." },
    errorsMock: {
      wrong: "Tu respuesta: Ribosoma",
      right: "Correcta: Mitocondria",
      why: "Los ribosomas fabrican proteínas; el ATP se produce en la respiración celular, dentro de la mitocondria.",
    },
  },
  faq: {
    title: "Preguntas frecuentes",
    items: [
      ["¿Ticher es gratis?", "Sí. Puedes crear tu cuenta y usar el tutor, los planes de estudio y los simulacros sin pagar."],
      ["¿Necesito una contraseña?", "No. Entras con tu correo: te enviamos un código de 6 dígitos cada vez que inicias sesión."],
      ["¿Qué materiales puedo subir?", "PDFs (apuntes, diapositivas, exámenes anteriores) y fotos de tus apuntes o de la pizarra."],
      ["¿Para qué nivel sirve?", "Para primaria, secundaria, preparatoria y universidad. Ticher adapta las explicaciones a tu nivel."],
      ["¿Se guarda mi progreso?", "Sí. Tus exámenes, lecciones y racha se guardan en tu cuenta y los encuentras al volver a entrar."],
    ],
  },
  final: { title: "Todo lo que necesitas para aprobar.", lead: "Mejores notas en menos tiempo." },
  footer: { tagline: "Tu tutor de IA para estudiar y preparar exámenes.", rights: "Todos los derechos reservados." },
}

const EN: typeof ES = {
  nav: { prep: "Exam prep", tutor: "Tutor", faq: "FAQ", login: "Log in", register: "Sign up" },
  hero: {
    badge: "Free · No password",
    title: ["Prepare for your exams", "with an AI tutor"],
    lead: "Your notes, your slides, your past papers. Ticher builds a study plan around them so you walk into exam day ready.",
    cta: "Start for free",
    prompt: "Have an exam coming up? Give me everything you're studying from.",
    files: ["Biology_notes.pdf", "Whiteboard photo.jpg", "2025 exam.pdf"],
    date: "Exam: December 12",
  },
  prep: {
    title: "Everything you need to walk into the exam ready",
    lead: "Your own materials become lessons, quizzes and mock exams, so you only study what's on your exam.",
    plan: { title: "A step-by-step plan, built from your notes", text: "Set your exam date and upload your materials. Ticher splits them into topics and tells you what to study each day." },
    planMock: { goal: "Mastery by Dec 12", topics: ["Cell and membrane", "Mitosis and meiosis", "Mendelian genetics"] },
    ways: { title: "Learn the way that works for you", text: "Each topic however you like: smart reading, flashcards, quizzes or written questions." },
    waysMock: ["Smart reading", "Flashcards", "Quiz", "Written question"],
    review: { title: "Spaced repetition so you don't forget", text: "Cards come back right before you'd forget them. Fewer hours, better memory." },
    reviewMock: { front: "What happens in anaphase?", back: "Sister chromatids separate toward opposite poles.", next: "Next review in 3 days" },
    mock: { title: "Mock exams like the real thing", text: "A timed final exam with no help until you hand it in. Then see which topics to work on." },
    mockMock: { timer: "42:18 left", question: "Which organelle makes most of the ATP?", options: ["Ribosome", "Mitochondrion", "Golgi apparatus"] },
  },
  tutor: {
    title: "A personal tutor, always there for you",
    lead: "Ask anything, anytime. Ticher explains it step by step, at your level, until it clicks.",
    ask: { title: "Ask anything, anytime", text: "Chat like you would with a private tutor: follow up, ask for examples or for another way to explain it." },
    askMock: {
      user: "I don't get why the dot product of perpendicular vectors is zero",
      ai: "Think of it this way: the dot product measures how much one vector points along the other. At 90°, cos 90° = 0…",
    },
    photo: { title: "Stuck on a problem? Snap a photo", text: "Upload a photo of your notes or a problem and Ticher reads it and walks you through it." },
    photoMock: "Photo of the problem",
    errors: { title: "Understand your mistakes", text: "When you get something wrong, Ticher explains why and saves the question so you can review it later." },
    errorsMock: {
      wrong: "Your answer: Ribosome",
      right: "Correct: Mitochondrion",
      why: "Ribosomes build proteins; ATP comes from cellular respiration, inside the mitochondrion.",
    },
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      ["Is Ticher free?", "Yes. You can create an account and use the tutor, study plans and mock exams without paying."],
      ["Do I need a password?", "No. You sign in with your email: we send you a 6-digit code every time you log in."],
      ["What materials can I upload?", "PDFs (notes, slides, past papers) and photos of your notes or the whiteboard."],
      ["What level is it for?", "Primary school, secondary school, high school and university. Ticher adapts its explanations to your level."],
      ["Is my progress saved?", "Yes. Your exams, lessons and streak are saved to your account and waiting for you when you come back."],
    ],
  },
  final: { title: "Everything you need to pass.", lead: "Better grades in less time." },
  footer: { tagline: "Your AI tutor for studying and exam prep.", rights: "All rights reserved." },
}

const TEXT: Record<Lang, typeof ES> = { es: ES, en: EN }
const MASTERY = [92, 70, 40]
const WAY_ICONS: LucideIcon[] = [FileText, Layers, ListChecks, PenLine]
const CORNERS = ["top-2 left-2 border-t-2 border-l-2", "top-2 right-2 border-t-2 border-r-2", "bottom-2 left-2 border-b-2 border-l-2", "right-2 bottom-2 border-r-2 border-b-2"]

export function Landing() {
  const lang = useLang()
  const t = TEXT[lang]
  const root = useRef<HTMLDivElement>(null)

  // Scroll reveal (styles in globals.css): mark each block once it enters the screen.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.setAttribute("data-shown", "")
          io.unobserve(e.target)
        }),
      { rootMargin: "0px 0px -8% 0px" }
    )
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n))
    el.setAttribute("data-reveal-ready", "")
    return () => io.disconnect()
  }, [])
  const nav = [
    ["#preparar", t.nav.prep],
    ["#tutor", t.nav.tutor],
    ["#preguntas", t.nav.faq],
  ]

  return (
    // Always dark, like the share image and the emails.
    <div ref={root} className="dark flex flex-1 flex-col bg-background text-foreground">
      <DevNotice variant="banner" lang={lang} />
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Ticher">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border bg-card/60 p-1 text-sm md:flex">
            {nav.map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <LangSwitch lang={lang} />
            <Button variant="ghost" size="sm" className={cn("hidden sm:inline-flex", LIFT)} nativeButton={false} render={<Link href="/login" />}>
              {t.nav.login}
            </Button>
            <Button size="sm" className={LIFT} nativeButton={false} render={<Link href={REGISTER} />}>
              {t.nav.register}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_65%)]"
          />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 pb-16 text-center sm:pt-28">
            <p data-reveal className="mb-6 inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" /> {t.hero.badge}
            </p>
            <h1 data-reveal style={delay(80)} className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              {t.hero.title[0]} <span className="text-primary">{t.hero.title[1]}</span>
            </h1>
            <p data-reveal style={delay(160)} className="mt-6 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">{t.hero.lead}</p>
            <Ctas t={t} reveal={240} />

            <div data-reveal style={delay(320)} className="mt-16 w-full max-w-xl rounded-3xl border bg-card p-4 text-left shadow-2xl shadow-primary/5 sm:p-5">
              <p className="text-sm sm:text-base">{t.hero.prompt}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {t.hero.files.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1 text-xs">
                    <Paperclip className="size-3 text-muted-foreground" /> {f}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                  <Clock className="size-3" /> {t.hero.date}
                </span>
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ArrowUp className="size-4" />
                </span>
              </div>
            </div>
          </div>
        </section>

        <Section id="preparar" title={t.prep.title} lead={t.prep.lead}>
          <div className="grid gap-4 md:grid-cols-2">
            <Feature i={0} title={t.prep.plan.title} text={t.prep.plan.text}>
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center gap-1 text-center">
                  <ScoreRing value={75} size={84} />
                  <span className="text-xs text-muted-foreground">{t.prep.planMock.goal}</span>
                </div>
                <ul className="min-w-0 flex-1 space-y-3">
                  {t.prep.planMock.topics.map((topic, i) => (
                    <li key={topic} className="space-y-1">
                      <span className="flex justify-between gap-2 text-xs">
                        <span className="truncate">{topic}</span>
                        <span className="text-muted-foreground tabular-nums">{MASTERY[i]}%</span>
                      </span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${MASTERY[i]}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Feature>

            <Feature i={1} title={t.prep.ways.title} text={t.prep.ways.text}>
              <div className="grid grid-cols-2 gap-2">
                {t.prep.waysMock.map((label, i) => {
                  const Icon = WAY_ICONS[i]
                  return (
                    <span key={label} className={cn("flex items-center gap-2 rounded-xl border px-3 py-3 text-sm", i === 1 && "border-primary bg-primary/10")}>
                      <Icon className="size-4 shrink-0 text-primary" /> {label}
                    </span>
                  )
                })}
              </div>
            </Feature>

            <Feature i={0} title={t.prep.review.title} text={t.prep.review.text}>
              <div className="space-y-2">
                <div className="rounded-xl border bg-muted/40 p-4">
                  <p className="font-medium">{t.prep.reviewMock.front}</p>
                  <p className="mt-2 border-t pt-2 text-sm text-muted-foreground">{t.prep.reviewMock.back}</p>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RotateCcw className="size-3 text-primary" /> {t.prep.reviewMock.next}
                </p>
              </div>
            </Feature>

            <Feature i={1} title={t.prep.mock.title} text={t.prep.mock.text}>
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium">
                  <Clock className="size-3.5" /> {t.prep.mockMock.timer}
                </p>
                <p className="text-sm font-medium">{t.prep.mockMock.question}</p>
                {t.prep.mockMock.options.map((o, i) => (
                  <span key={o} className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm", i === 1 && "border-primary bg-primary/10")}>
                    <span className={cn("flex size-4 items-center justify-center rounded-full border", i === 1 && "border-primary bg-primary text-primary-foreground")}>
                      {i === 1 && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    {o}
                  </span>
                ))}
              </div>
            </Feature>
          </div>
        </Section>

        <Section id="tutor" title={t.tutor.title} lead={t.tutor.lead}>
          <div className="grid gap-4 md:grid-cols-3">
            <Feature i={0} title={t.tutor.ask.title} text={t.tutor.ask.text}>
              <div className="space-y-2 text-sm">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">{t.tutor.askMock.user}</p>
                <p className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2">{t.tutor.askMock.ai}</p>
              </div>
            </Feature>

            <Feature i={1} title={t.tutor.photo.title} text={t.tutor.photo.text}>
              <div className="relative flex h-36 items-center justify-center rounded-xl bg-muted/40 font-serif text-2xl">
                {/* Scanner corners around the problem. */}
                {CORNERS.map((c) => (
                  <span key={c} className={cn("absolute size-5 rounded-sm border-primary", c)} />
                ))}
                ∫ x² dx = ?
                <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 font-sans text-xs whitespace-nowrap">
                  <Camera className="size-3 text-primary" /> {t.tutor.photoMock}
                </span>
              </div>
            </Feature>

            <Feature i={2} title={t.tutor.errors.title} text={t.tutor.errors.text}>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
                  <X className="size-4 shrink-0 text-destructive" /> {t.tutor.errorsMock.wrong}
                </p>
                <p className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
                  <Check className="size-4 shrink-0 text-primary" /> {t.tutor.errorsMock.right}
                </p>
                <p className="text-xs text-muted-foreground">{t.tutor.errorsMock.why}</p>
              </div>
            </Feature>
          </div>
        </Section>

        <Section id="preguntas" title={t.faq.title}>
          <div data-reveal className="mx-auto max-w-2xl divide-y rounded-3xl border bg-card">
            {t.faq.items.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {q}
                  <Plus className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </Section>

        <section className="px-4 pb-24">
          <div data-reveal className="mx-auto flex max-w-4xl flex-col items-center rounded-3xl border bg-gradient-to-b from-primary/15 to-card px-6 py-16 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{t.final.title}</h2>
            <p className="mt-4 text-muted-foreground">{t.final.lead}</p>
            <Ctas t={t} />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Logo className="text-foreground" />
            <p>{t.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/login" className="hover:text-foreground">
              {t.nav.login}
            </Link>
            <Link href={REGISTER} className="hover:text-foreground">
              {t.nav.register}
            </Link>
            <span>© 2026 Ticher. {t.footer.rights}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Ctas({ t, reveal = 0 }: { t: typeof ES; reveal?: number }) {
  return (
    <div data-reveal style={delay(reveal)} className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
      <Button
        size="lg"
        className={cn("group h-12 rounded-full px-7 text-base shadow-lg shadow-primary/20 hover:shadow-primary/40", LIFT)}
        nativeButton={false}
        render={<Link href={REGISTER} />}
      >
        {t.hero.cta}
        <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
      </Button>
      <Button size="lg" variant="outline" className={cn("h-12 rounded-full px-7 text-base", LIFT)} nativeButton={false} render={<Link href="/login" />}>
        {t.nav.login}
      </Button>
    </div>
  )
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h2>
          {lead && <p className="mt-4 text-pretty text-muted-foreground">{lead}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

// i staggers the cards of one row so they appear one after another.
function Feature({ i, title, text, children }: { i: number; title: string; text: string; children: React.ReactNode }) {
  return (
    <article data-reveal style={delay(i * 120)} className="flex flex-col gap-6 rounded-3xl border bg-card p-6 transition-colors hover:border-primary/40">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold tracking-tight text-balance">{title}</h3>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </article>
  )
}

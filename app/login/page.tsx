"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LangSwitch } from "@/components/lang-switch"
import { postJson } from "@/lib/api"
import { useLang, type Lang } from "@/lib/lang"
import { DEFAULT_PROFILE, LEVELS, adoptLegacyData, readStored, write, type Profile } from "@/lib/store"

const RESEND_SECONDS = 30

const ES = {
  back: "Volver al inicio",
  welcome: "Bienvenido de nuevo",
  welcomeLead: "Entra con tu correo para seguir estudiando.",
  create: "Crea tu cuenta",
  createLead: "Es gratis y sin contraseña. Solo necesitas tu correo.",
  checkMail: "Revisa tu correo",
  codeSent: "Ingresa el código que te enviamos a",
  askName: "¿Cómo te llamas?",
  askNameLead: "Así te saludamos cuando entres.",
  login: "Iniciar sesión",
  register: "Registrarse",
  name: "Tu nombre",
  level: "Nivel educativo",
  levelPick: "Elige tu nivel educativo.",
  // Same order as LEVELS; the stored value stays in Spanish.
  levels: ["Primaria", "Secundaria", "Preparatoria", "Universidad", "Otro"],
  email: "Correo electrónico",
  emailPlaceholder: "Ingresa tu correo electrónico",
  sending: "Enviando…",
  createAccount: "Crear cuenta",
  codeHint: "Te enviaremos un código de 6 dígitos para entrar sin contraseña.",
  code: "Código de 6 dígitos",
  verifying: "Verificando…",
  enter: "Entrar",
  changeEmail: "Cambiar correo",
  resendIn: (s: number) => `Enviar un nuevo código en ${s}s`,
  resend: "Enviar un nuevo código",
  start: "Empezar",
  terms: "Al continuar, aceptas los Términos de uso y la Política de privacidad.",
}

const EN: typeof ES = {
  back: "Back to home",
  welcome: "Welcome back",
  welcomeLead: "Sign in with your email to keep studying.",
  create: "Create your account",
  createLead: "It's free and passwordless. All you need is your email.",
  checkMail: "Check your email",
  codeSent: "Enter the code we sent to",
  askName: "What's your name?",
  askNameLead: "So we can greet you when you come in.",
  login: "Log in",
  register: "Sign up",
  name: "Your name",
  level: "Education level",
  levelPick: "Choose your education level.",
  levels: ["Primary school", "Secondary school", "High school", "University", "Other"],
  email: "Email",
  emailPlaceholder: "Enter your email",
  sending: "Sending…",
  createAccount: "Create account",
  codeHint: "We'll send you a 6-digit code to sign in without a password.",
  code: "6-digit code",
  verifying: "Verifying…",
  enter: "Sign in",
  changeEmail: "Change email",
  resendIn: (s: number) => `Send a new code in ${s}s`,
  resend: "Send a new code",
  start: "Get started",
  terms: "By continuing, you accept the Terms of use and the Privacy policy.",
}

const TEXT: Record<Lang, typeof ES> = { es: ES, en: EN }

// useSearchParams needs a Suspense boundary so the rest of the route can prerender.
export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  )
}

function Login() {
  const router = useRouter()
  const lang = useLang()
  const t = TEXT[lang]
  // Same email-code flow for both: there's no account database, so sign-up just collects the profile up front.
  const [mode, setMode] = useState<"login" | "register">(useSearchParams().get("mode") === "register" ? "register" : "login")
  const [step, setStep] = useState<"email" | "code" | "name">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [level, setLevel] = useState("")
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function sendCode() {
    if (mode === "register" && !level) return toast.error(t.levelPick)
    setBusy(true)
    try {
      await postJson("/api/auth/send", { email })
      setStep("code")
      setCode("")
      setCooldown(RESEND_SECONDS)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function verify(value: string) {
    setBusy(true)
    try {
      await postJson("/api/auth/verify", { code: value })
      adoptLegacyData()
      if (mode === "register" && name.trim()) {
        write<Profile>("profile", DEFAULT_PROFILE, (p) => ({ ...p, name: name.trim(), level: level || p.level }))
        return finish()
      }
      // First sign-in on this browser: ask for a name to greet them with.
      if (readStored<Profile>("profile", DEFAULT_PROFILE).name.trim()) finish()
      else setStep("name")
    } catch (e) {
      toast.error((e as Error).message)
      setCode("")
    } finally {
      setBusy(false)
    }
  }

  function finish() {
    router.replace("/")
    router.refresh()
  }

  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-16">
      <div className="absolute inset-x-4 top-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft /> {t.back}
        </Button>
        <LangSwitch lang={lang} />
      </div>
      <div key={step} className="w-full max-w-sm space-y-8 animate-in fade-in motion-safe:slide-in-from-bottom-2 duration-500">
        <div className="space-y-2 text-center">
          <p className="text-3xl font-semibold tracking-tight">
            Ticher<span className="text-primary">.</span>
          </p>
          {step === "email" && (
            <>
              <h1 className="text-lg font-medium">{mode === "login" ? t.welcome : t.create}</h1>
              <p className="text-sm text-muted-foreground">{mode === "login" ? t.welcomeLead : t.createLead}</p>
            </>
          )}
          {step === "code" && (
            <>
              <h1 className="text-lg font-medium">{t.checkMail}</h1>
              <p className="text-sm text-muted-foreground">
                {t.codeSent} <span className="font-medium text-foreground">{email}</span>
              </p>
            </>
          )}
          {step === "name" && (
            <>
              <h1 className="text-lg font-medium">{t.askName}</h1>
              <p className="text-sm text-muted-foreground">{t.askNameLead}</p>
            </>
          )}
        </div>

        {step === "email" && (
          <div className="space-y-5">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  {t.login}
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1">
                  {t.register}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <form
              key={mode}
              className="space-y-3 animate-in fade-in duration-300"
              onSubmit={(e) => {
                e.preventDefault()
                sendCode()
              }}
            >
              {mode === "register" && (
                <>
                  <Label htmlFor="register-name" className="sr-only">
                    {t.name}
                  </Label>
                  <Input
                    id="register-name"
                    required
                    autoFocus
                    autoComplete="given-name"
                    maxLength={40}
                    placeholder={t.name}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                  <Select value={level || null} onValueChange={(v) => setLevel(String(v ?? ""))}>
                    <SelectTrigger className="h-11! w-full" aria-label={t.level}>
                      <SelectValue>{(v: string | null) => (v ? t.levels[LEVELS.indexOf(v)] : <span className="text-muted-foreground">{t.level}</span>)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l, i) => (
                        <SelectItem key={l} value={l}>
                          {t.levels[i]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Label htmlFor="email" className="sr-only">
                {t.email}
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus={mode === "login"}
                autoComplete="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
              <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
                <Mail /> {busy ? t.sending : mode === "login" ? t.login : t.createAccount}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t.codeHint}</p>
            </form>
          </div>
        )}

        {step === "code" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.length === 6) verify(code)
            }}
          >
            <Label htmlFor="code" className="sr-only">
              {t.code}
            </Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              disabled={busy}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                setCode(value)
                if (value.length === 6) verify(value)
              }}
              className="h-14 text-center text-2xl tracking-[0.5em] tabular-nums"
            />
            <Button type="submit" size="lg" className="h-11 w-full" disabled={busy || code.length !== 6}>
              {busy ? t.verifying : t.enter}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("email")}>
                <ArrowLeft /> {t.changeEmail}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={busy || cooldown > 0} onClick={sendCode}>
                {cooldown > 0 ? t.resendIn(cooldown) : t.resend}
              </Button>
            </div>
          </form>
        )}

        {step === "name" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              write<Profile>("profile", DEFAULT_PROFILE, (p) => ({ ...p, name: name.trim() }))
              finish()
            }}
          >
            <Label htmlFor="name" className="sr-only">
              {t.name}
            </Label>
            <Input
              id="name"
              required
              autoFocus
              autoComplete="given-name"
              maxLength={40}
              placeholder={t.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
            <Button type="submit" size="lg" className="h-11 w-full" disabled={!name.trim()}>
              {t.start}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">{t.terms}</p>
      </div>
    </main>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { postJson } from "@/lib/api"
import { DEFAULT_PROFILE, adoptLegacyData, readStored, write, type Profile } from "@/lib/store"

const RESEND_SECONDS = 30

export default function LoginPage() {
  const router = useRouter()
  // Same email-code flow for both: there's no account database, so sign-up just collects the name up front.
  const [mode, setMode] = useState<"login" | "register">("login")
  const [step, setStep] = useState<"email" | "code" | "name">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function sendCode() {
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
        write<Profile>("profile", DEFAULT_PROFILE, (p) => ({ ...p, name: name.trim() }))
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
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div key={step} className="w-full max-w-sm space-y-8 animate-in fade-in motion-safe:slide-in-from-bottom-2 duration-500">
        <div className="space-y-2 text-center">
          <p className="text-3xl font-semibold tracking-tight">
            Ticher<span className="text-primary">.</span>
          </p>
          {step === "email" && (
            <>
              <h1 className="text-lg font-medium">{mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h1>
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? "Entra con tu correo para seguir estudiando." : "Es gratis y sin contraseña. Solo necesitas tu correo."}
              </p>
            </>
          )}
          {step === "code" && (
            <>
              <h1 className="text-lg font-medium">Revisa tu correo</h1>
              <p className="text-sm text-muted-foreground">
                Ingresa el código que te enviamos a <span className="font-medium text-foreground">{email}</span>
              </p>
            </>
          )}
          {step === "name" && (
            <>
              <h1 className="text-lg font-medium">¿Cómo te llamas?</h1>
              <p className="text-sm text-muted-foreground">Así te saludamos cuando entres.</p>
            </>
          )}
        </div>

        {step === "email" && (
          <div className="space-y-5">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  Iniciar sesión
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1">
                  Registrarse
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
                    Tu nombre
                  </Label>
                  <Input
                    id="register-name"
                    required
                    autoFocus
                    autoComplete="given-name"
                    maxLength={40}
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </>
              )}
              <Label htmlFor="email" className="sr-only">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus={mode === "login"}
                autoComplete="email"
                placeholder="Ingresa tu correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
              <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
                <Mail /> {busy ? "Enviando…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Te enviaremos un código de 6 dígitos para entrar sin contraseña.</p>
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
              Código de 6 dígitos
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
              {busy ? "Verificando…" : "Entrar"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("email")}>
                <ArrowLeft /> Cambiar correo
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={busy || cooldown > 0} onClick={sendCode}>
                {cooldown > 0 ? `Enviar un nuevo código en ${cooldown}s` : "Enviar un nuevo código"}
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
              Tu nombre
            </Label>
            <Input
              id="name"
              required
              autoFocus
              autoComplete="given-name"
              maxLength={40}
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
            <Button type="submit" size="lg" className="h-11 w-full" disabled={!name.trim()}>
              Empezar
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">Al continuar, aceptas los Términos de uso y la Política de privacidad.</p>
      </div>
    </main>
  )
}

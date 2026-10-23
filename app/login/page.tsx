"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  // shortcut: no real auth yet; social buttons are placeholders and email just enters the app.
  const soon = () => toast("Próximamente")

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-1">
          <p className="text-3xl font-semibold tracking-tight">Ticher</p>
          <h1 className="text-lg">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">Inicia sesión o crea una nueva cuenta. Es gratis.</p>
        </div>
        <div className="space-y-2">
          <Button variant="outline" size="lg" className="w-full" onClick={soon}>
            Continuar con Google
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={soon}>
            Continuar con Apple
          </Button>
        </div>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            router.push("/")
          }}
        >
          <Input type="email" required placeholder="Ingresa tu correo electrónico" aria-label="Correo electrónico" />
          <Button type="submit" size="lg" className="w-full">
            Continuar con correo electrónico
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Al continuar, aceptas los Términos de uso y la Política de privacidad.
        </p>
      </div>
    </main>
  )
}

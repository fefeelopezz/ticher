import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/logo"

// Public legal pages (Términos, Privacidad): plain readable text, reachable with or without a session.
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="Ticher">
            <Logo />
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-muted-foreground">
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 py-6 text-sm text-muted-foreground">
          <Link href="/terminos" className="hover:text-foreground">
            Términos de uso
          </Link>
          <Link href="/privacidad" className="hover:text-foreground">
            Política de privacidad
          </Link>
          <span>© 2026 Ticher</span>
        </div>
      </footer>
    </div>
  )
}

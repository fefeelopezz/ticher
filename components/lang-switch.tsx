"use client"

import { setLang, type Lang } from "@/lib/lang"
import { cn } from "@/lib/utils"

export function LangSwitch({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Idioma / Language" className={cn("flex rounded-full border p-0.5 text-xs font-medium", className)}>
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() => setLang(l)}
          className={cn("rounded-full px-2.5 py-1 uppercase transition-colors", lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

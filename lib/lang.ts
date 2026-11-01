"use client"

import { useEffect, useSyncExternalStore } from "react"

// Language of the public pages (landing and login). The app itself is Spanish only for now.
export type Lang = "es" | "en"

const KEY = "ticher.lang"
const listeners = new Set<() => void>()

function read(): Lang {
  try {
    return localStorage.getItem(KEY) === "en" ? "en" : "es"
  } catch {
    return "es"
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang)
  } catch {}
  listeners.forEach((l) => l())
}

// Server and first paint render Spanish; the saved choice takes over right after hydration.
export function useLang() {
  const lang = useSyncExternalStore(subscribe, read, () => "es" as Lang)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return lang
}

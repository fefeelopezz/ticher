"use client"

import { useRef } from "react"
import { Camera, Flame } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_DAILY_GOAL, DEFAULT_PROFILE, LEVELS, useActivity, useEmail, useHydrated, useStored, type Profile } from "@/lib/store"
import { SettingsSkeleton } from "@/components/page-skeletons"
import { toAvatar } from "@/lib/avatar"

const DAILY_GOALS = [10, 20, 30, 45, 60]

export default function SettingsPage() {
  const hydrated = useHydrated()
  const [profile, setProfile] = useStored<Profile>("profile", DEFAULT_PROFILE)
  const update = (patch: Partial<Profile>) => setProfile({ ...profile, ...patch })
  const photoInput = useRef<HTMLInputElement>(null)
  const email = useEmail()
  const { streak, longest } = useActivity()

  async function choosePhoto(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) return toast.error("Elige una imagen (JPG, PNG o WebP).")
    try {
      update({ photo: await toAvatar(file) })
    } catch {
      toast.error("No pudimos leer esa imagen. Prueba con otra.")
    }
  }

  // Before hydration the stored data is not read yet; show the page's shape instead of empty defaults.
  if (!hydrated) return <SettingsSkeleton />

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Mi perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {profile.photo && <AvatarImage src={profile.photo} alt="Tu foto de perfil" />}
              <AvatarFallback className="text-xl">{(profile.name.trim() || "Estudiante")[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => photoInput.current?.click()}>
                <Camera /> {profile.photo ? "Cambiar foto" : "Subir foto"}
              </Button>
              {profile.photo && (
                <Button variant="ghost" size="sm" onClick={() => update({ photo: undefined })}>
                  Quitar
                </Button>
              )}
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Foto de perfil"
              onChange={(e) => {
                choosePhoto(e.target.files?.[0])
                e.target.value = ""
              }}
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <Flame className="size-5 text-primary" />
            <p className="text-sm">
              <span className="font-semibold">
                {streak} {streak === 1 ? "día" : "días"} de racha
              </span>
              <span className="text-muted-foreground"> · tu mejor racha: {longest} días</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" value={email} readOnly disabled aria-describedby="email-hint" />
            <p id="email-hint" className="text-xs text-muted-foreground">
              Es el correo con el que inicias sesión; no se puede cambiar.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={profile.name}
              maxLength={40}
              placeholder="¿Cómo te llamas?"
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Nivel educativo</Label>
            <Select value={profile.level} onValueChange={(v) => update({ level: String(v) })}>
              <SelectTrigger className="w-full" aria-label="Nivel educativo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meta diaria</CardTitle>
          <CardDescription>Cumples la meta con estos minutos de estudio o con una lección terminada. Cada día cumplido suma a tu racha.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={String(profile.dailyGoal ?? DEFAULT_DAILY_GOAL)} onValueChange={(v) => update({ dailyGoal: Number(v) })}>
            <SelectTrigger className="w-full" aria-label="Meta diaria">
              <SelectValue>{(v: string) => `${v} minutos al día`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DAILY_GOALS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} minutos al día
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recordatorios por correo</CardTitle>
          <CardDescription>Te avisamos 7, 3 y 1 día antes de cada examen, con tu nivel de preparación.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch id="reminders" checked={profile.reminders !== false} onCheckedChange={(checked) => update({ reminders: checked })} />
            <Label htmlFor="reminders">{profile.reminders !== false ? "Activados" : "Desactivados"}</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modo socrático</CardTitle>
          <CardDescription>
            Sin respuestas instantáneas: el tutor te guía paso a paso para que resuelvas cada problema tú mismo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="socratic"
              checked={profile.socratic}
              onCheckedChange={(checked) => update({ socratic: checked })}
            />
            <Label htmlFor="socratic">{profile.socratic ? "Activado" : "Desactivado"}</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

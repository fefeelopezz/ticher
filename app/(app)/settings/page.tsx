"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_PROFILE, useStored, type Profile } from "@/lib/store"

const LEVELS = ["Primaria", "Secundaria", "Preparatoria", "Universidad", "Otro"]

export default function SettingsPage() {
  const [profile, setProfile] = useStored<Profile>("profile", DEFAULT_PROFILE)
  const update = (patch: Partial<Profile>) => setProfile({ ...profile, ...patch })

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Mi perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

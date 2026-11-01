"use client"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NO_SUBJECTS, SUBJECTS, useStored, type Subject } from "@/lib/store"

type Props = {
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
  size?: "sm" | "default"
}

export function SubjectSelect({ name, value, defaultValue, onChange, className, size }: Props) {
  const [custom] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  // The user's own subjects get their own group; one named like a built-in stays in the built-in list.
  const builtIn = new Set(SUBJECTS.map((s) => s.toLowerCase()))
  const own = [...new Set(custom.map((s) => s.name))].filter((s) => !builtIn.has(s.toLowerCase()))
  return (
    <Select name={name} value={value} defaultValue={defaultValue} onValueChange={(v) => onChange?.(String(v))}>
      <SelectTrigger className={className} size={size} aria-label="Materia">
        <SelectValue />
      </SelectTrigger>
      {/* Two columns keep the list short; it opens beside the trigger since a grid can't line up with the chosen item. */}
      <SelectContent alignItemWithTrigger={false} className="w-auto min-w-72">
        {own.length > 0 && (
          <>
            <SelectGroup className="grid grid-cols-2 gap-x-1">
              <SelectLabel className="col-span-2">Tus materias</SelectLabel>
              {own.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
          </>
        )}
        <SelectGroup className="grid grid-cols-2 gap-x-1">
          {own.length > 0 && <SelectLabel className="col-span-2">Materias</SelectLabel>}
          {SUBJECTS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  // The user's own subjects come first; the Set drops ones that match a built-in name.
  const options = [...new Set([...custom.map((s) => s.name), ...SUBJECTS])]
  return (
    <Select name={name} value={value} defaultValue={defaultValue} onValueChange={(v) => onChange?.(String(v))}>
      <SelectTrigger className={className} size={size} aria-label="Materia">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

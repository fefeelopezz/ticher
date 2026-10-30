"use client"

import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { es } from "react-day-picker/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { isoDate } from "@/lib/store"

// Dates stay "YYYY-MM-DD" strings everywhere else; parse them as local days, not UTC.
const toDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: string
  placeholder?: string
  // Mirrors the value into a hidden input so plain <form action> handlers keep reading it.
  name?: string
}

export function DatePicker({ id, value, onChange, min, placeholder = "Elige una fecha", name }: Props) {
  const [open, setOpen] = useState(false)
  const selected = value ? toDate(value) : undefined

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="h-10 w-full justify-start gap-2 font-normal data-[popup-open]:border-primary/60"
            />
          }
        >
          <CalendarDays className="text-muted-foreground" />
          {selected ? (
            <span className="first-letter:uppercase">
              {selected.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={es}
            selected={selected}
            defaultMonth={selected ?? (min ? toDate(min) : undefined)}
            disabled={min ? { before: toDate(min) } : undefined}
            onSelect={(day) => {
              if (!day) return
              onChange(isoDate(day))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={value} />}
    </>
  )
}

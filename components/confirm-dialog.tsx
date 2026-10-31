"use client"

import { useRef, useState } from "react"
import { Trash2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Options = { title: string; description: string; confirmLabel: string; kind?: "delete" | "leave" }

// Ticher's replacement for window.confirm, styled like the "Eliminar examen" dialog.
// `await confirm({...})` resolves true on confirm, false on cancel or close.
export function useConfirm() {
  const [state, setState] = useState<{ open: boolean; options?: Options }>({ open: false })
  const resolver = useRef<(ok: boolean) => void>(undefined)

  const confirm = (options: Options) =>
    new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setState({ open: true, options })
    })

  // Options stay set while closing so the text doesn't vanish during the exit animation.
  const close = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = undefined
    setState((s) => ({ ...s, open: false }))
  }

  const o = state.options
  const Icon = o?.kind === "leave" ? TriangleAlert : Trash2
  const dialog = (
    <Dialog open={state.open} onOpenChange={(open) => !open && close(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Icon className="size-4" />
          </span>
          <DialogTitle>{o?.title}</DialogTitle>
          <DialogDescription>{o?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button variant="destructive" onClick={() => close(true)}>
            {o?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return [confirm, dialog] as const
}

"use client"

import { useRef, useState } from "react"
import { Brush, Eraser, Pencil, Send, Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Fixed drawing resolution; the canvas scales to the dialog width, pointer positions are mapped back.
const W = 1200
const H = 800
const PAPER = "#ffffff"
const INK = "#171717"
const PEN_WIDTH = 4
const ERASER_WIDTH = 32
const MAX_UNDO = 30

// A sheet to sketch a diagram, formula or exercise; "Enviar al chat" attaches it as a WebP image.
export function Whiteboard({ onDone, disabled }: { onDone: (file: File) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [tool, setTool] = useState<"pen" | "eraser">("pen")
  const [empty, setEmpty] = useState(true)
  const [undoable, setUndoable] = useState(false)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const history = useRef<ImageData[]>([])

  const ctx = () => canvas.current!.getContext("2d")!

  // Runs when the dialog mounts the canvas: start from a blank white sheet.
  function setup(el: HTMLCanvasElement | null) {
    canvas.current = el
    if (!el || el.dataset.ready) return
    el.dataset.ready = "1"
    const c = el.getContext("2d")!
    c.fillStyle = PAPER
    c.fillRect(0, 0, W, H)
    history.current = []
    setEmpty(true)
    setUndoable(false)
  }

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height }
  }

  function snapshot() {
    history.current = [...history.current.slice(-(MAX_UNDO - 1)), ctx().getImageData(0, 0, W, H)]
    setUndoable(true)
  }

  function stroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const c = ctx()
    c.lineCap = c.lineJoin = "round"
    // The eraser paints paper, so the exported image never has holes.
    c.strokeStyle = tool === "eraser" ? PAPER : INK
    c.lineWidth = tool === "eraser" ? ERASER_WIDTH : PEN_WIDTH
    c.beginPath()
    c.moveTo(from.x, from.y)
    c.lineTo(to.x, to.y)
    c.stroke()
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    snapshot()
    const p = point(e)
    last.current = p
    stroke(p, p)
    if (tool === "pen") setEmpty(false)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!last.current) return
    const p = point(e)
    stroke(last.current, p)
    last.current = p
  }

  function undo() {
    const prev = history.current.pop()
    if (prev) ctx().putImageData(prev, 0, 0)
    setUndoable(history.current.length > 0)
  }

  function clear() {
    snapshot()
    ctx().fillStyle = PAPER
    ctx().fillRect(0, 0, W, H)
    setEmpty(true)
  }

  function send() {
    canvas.current!.toBlob(
      (blob) => {
        if (!blob) return
        const ext = blob.type === "image/webp" ? "webp" : "png"
        onDone(new File([blob], `dibujo-${new Date().toTimeString().slice(0, 5).replace(":", "")}.${ext}`, { type: blob.type }))
        setOpen(false)
      },
      "image/webp",
      0.9
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Dibujar en el pizarrón" disabled={disabled} />}>
        <Brush />
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pizarrón</DialogTitle>
          <DialogDescription>Dibuja un diagrama, una fórmula o el ejercicio y envíalo al chat.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-0.5" role="radiogroup" aria-label="Herramienta">
            {(
              [
                ["pen", "Lápiz", Pencil],
                ["eraser", "Borrador", Eraser],
              ] as const
            ).map(([value, label, Icon]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={tool === value ? "secondary" : "ghost"}
                role="radio"
                aria-checked={tool === value}
                onClick={() => setTool(value)}
              >
                <Icon /> {label}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={undo} disabled={!undoable}>
              <Undo2 /> Deshacer
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={empty}>
              <Trash2 /> Limpiar
            </Button>
          </div>
        </div>

        <canvas
          ref={setup}
          width={W}
          height={H}
          aria-label="Pizarrón para dibujar"
          // touch-none keeps the page from scrolling while drawing with a finger.
          className={cn("aspect-[3/2] w-full touch-none rounded-lg border bg-white", tool === "eraser" ? "cursor-cell" : "cursor-crosshair")}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={() => (last.current = null)}
          onPointerCancel={() => (last.current = null)}
        />

        <DialogFooter>
          <Button type="button" onClick={send} disabled={empty}>
            <Send /> Enviar al chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

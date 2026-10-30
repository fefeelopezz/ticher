import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Placeholders shown while a page reads localStorage or streams in; each mirrors its page's layout.

const Block = ({ className }: { className?: string }) => <Skeleton className={cn("rounded-xl", className)} />

// Title row plus stacked cards; `blocks` are Tailwind height classes, `grid` adds a row of small cards.
export function PageSkeleton({ width = "max-w-3xl", blocks, grid = 0 }: { width?: string; blocks: string[]; grid?: number }) {
  return (
    <div className={cn("mx-auto w-full space-y-6 px-4 py-8", width)} aria-busy="true" aria-label="Cargando">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      {grid > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: grid }, (_, i) => (
            <Block key={i} className="h-28" />
          ))}
        </div>
      )}
      {blocks.map((h, i) => (
        <Block key={i} className={h} />
      ))}
    </div>
  )
}

export const ExamsSkeleton = () => <PageSkeleton blocks={["h-56", "h-24"]} />
export const ActivitySkeleton = () => <PageSkeleton grid={3} blocks={["h-64", "h-40", "h-48"]} />
export const CalendarSkeleton = () => <PageSkeleton width="max-w-2xl" blocks={["h-20", "h-20", "h-20"]} />
export const SettingsSkeleton = () => <PageSkeleton width="max-w-xl" blocks={["h-72", "h-28"]} />

export function PrepSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6" aria-busy="true" aria-label="Cargando">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Block className="h-36" />
      <Skeleton className="h-9 w-72 rounded-lg" />
      <Block className="h-32" />
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} className="h-16" />
        ))}
      </div>
    </div>
  )
}

// Same frame as FocusShell: header bar, eyebrow, serif title, then the activity body.
export function FocusSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="flex h-14 items-center gap-3 border-b px-3 sm:px-4">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="mx-auto h-1.5 w-full max-w-sm rounded-full" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <div className="mx-auto w-full max-w-[40rem] space-y-8 px-5 pt-10 sm:pt-14">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <Block className="h-64 rounded-3xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}

// The empty chat: greeting, two shortcut cards and the composer at the bottom.
export function ChatSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-44" />
        <div className="mt-4 grid w-full gap-3 sm:grid-cols-2">
          <Block className="h-24" />
          <Block className="h-24" />
        </div>
      </div>
      <Skeleton className="mt-11 h-14 w-full rounded-2xl" />
    </div>
  )
}

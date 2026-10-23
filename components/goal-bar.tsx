import { cn } from "@/lib/utils"

// Progress bar with a tick at the student's goal, like Astra's readiness bar.
export function GoalBar({ value, goal, className }: { value: number; goal: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${value}% de preparación, meta ${goal}%`}
      className={cn("relative h-2 w-full rounded-full bg-muted", className)}
    >
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
      <div className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/60" style={{ left: `${goal}%` }} />
    </div>
  )
}

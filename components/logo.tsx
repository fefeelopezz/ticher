import { cn } from "@/lib/utils"

// Same drawing as app/icon.svg (the favicon), with the wordmark next to it.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-lg font-semibold tracking-wider", className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0a0a0a" className="stroke-border" strokeWidth="1" />
        <rect x="7.5" y="7.5" width="15" height="4.5" rx="1.5" fill="#fafafa" />
        <rect x="12.75" y="7.5" width="4.5" height="17" rx="1.5" fill="#fafafa" />
        <circle cx="23" cy="21.5" r="2.75" fill="#ffa247" />
      </svg>
      <span>
        <span className="text-primary">T</span>icher
      </span>
    </span>
  )
}

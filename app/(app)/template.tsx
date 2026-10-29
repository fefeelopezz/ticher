// Templates remount on every navigation: each page fades in; the slide is skipped under reduced motion.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col animate-in fade-in motion-safe:slide-in-from-bottom-1 duration-300">
      {children}
    </div>
  )
}

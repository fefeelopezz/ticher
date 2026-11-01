import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { PageSkeleton } from "@/components/page-skeletons"

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative">
        {/* Mobile: its own bar. Desktop: floats over the page corner to hide or show the sidebar (also Ctrl+B). */}
        <header className="flex h-12 items-center px-3 md:absolute md:top-2 md:left-2 md:z-20 md:h-auto md:px-0">
          <SidebarTrigger aria-label="Mostrar u ocultar la barra lateral" title="Mostrar u ocultar la barra lateral (Ctrl+B)" />
        </header>
        {/* Pages read the clock and localStorage, so they render per visit instead of at build time. */}
        <Suspense fallback={<PageSkeleton blocks={["h-48", "h-32"]} />}>
          <div className="flex flex-1 flex-col">{children}</div>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}

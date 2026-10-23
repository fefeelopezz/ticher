import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center px-3 md:hidden">
          <SidebarTrigger />
        </header>
        {/* Pages read the clock and localStorage, so they render per visit instead of at build time. */}
        <Suspense>
          <div className="flex flex-1 flex-col">{children}</div>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}

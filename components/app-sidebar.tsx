"use client"

import { Suspense } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  MessageCircle,
  Moon,
  Settings,
  Sun,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { deleteFile } from "@/lib/files"
import { DEFAULT_PROFILE, NO_CHATS, useStored, type Chat, type Profile } from "@/lib/store"

type NavItem = { href: string; label: string; icon: LucideIcon }

const NAV: NavItem[] = [
  { href: "/", label: "Preguntar", icon: MessageCircle },
  { href: "/exams", label: "Exámenes", icon: GraduationCap },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/activity", label: "Mi actividad", icon: BarChart3 },
]
const SETTINGS: NavItem[] = [{ href: "/settings", label: "Ajustes", icon: Settings }]

function NavItems({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return items.map(({ href, label, icon: Icon }) => (
    <SidebarMenuItem key={href}>
      <SidebarMenuButton
        render={<Link href={href} />}
        isActive={href === "/" ? pathname === "/" : !!pathname?.startsWith(href)}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ))
}

function ActiveNavItems({ items }: { items: NavItem[] }) {
  return <NavItems items={items} pathname={usePathname()} />
}

// On dynamic routes like /exams/[id] the pathname is only known per request, so the
// active highlight streams in behind Suspense while the links render immediately.
function Nav({ items }: { items: NavItem[] }) {
  return (
    <Suspense fallback={<NavItems items={items} pathname={null} />}>
      <ActiveNavItems items={items} />
    </Suspense>
  )
}

export function AppSidebar() {
  const { resolvedTheme, setTheme } = useTheme()
  const [chats, setChats] = useStored<Chat[]>("chats", NO_CHATS)

  function removeChat(chat: Chat) {
    chat.files.forEach((f) => deleteFile(f.id).catch(() => {}))
    setChats((all) => all.filter((c) => c.id !== chat.id))
  }
  const [profile] = useStored<Profile>("profile", DEFAULT_PROFILE)
  const name = profile.name || "Estudiante"

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Ticher
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <Nav items={NAV} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {chats.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Conversaciones</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[...chats]
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .slice(0, 15)
                  .map((c) => (
                    <SidebarMenuItem key={c.id}>
                      <SidebarMenuButton render={<Link href={`/?chat=${c.id}`} />}>
                        <span className="truncate">{c.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction showOnHover aria-label={`Eliminar ${c.title}`} onClick={() => removeChat(c)}>
                        <Trash2 />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Icons and label switch via the .dark class, so server and client markup match. */}
            <SidebarMenuButton onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              <Moon className="dark:hidden" />
              <Sun className="hidden dark:block" />
              <span className="dark:hidden">Modo oscuro</span>
              <span className="hidden dark:inline">Modo claro</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <Nav items={SETTINGS} />
          <SidebarMenuItem className="flex items-center gap-2 px-2 py-2">
            <Avatar className="size-7">
              <AvatarFallback>{name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{name}</span>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

"use client"

import { Suspense } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  BarChart3,
  CalendarDays,
  ChevronsUpDown,
  GraduationCap,
  MessageCircle,
  Moon,
  Settings,
  Sun,
  LogOut,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { postJson } from "@/lib/api"
import { deleteFile } from "@/lib/files"
import { DEFAULT_PROFILE, NO_CHATS, useStored, type Chat, type Profile } from "@/lib/store"

type NavItem = { href: string; label: string; icon: LucideIcon }

const NAV: NavItem[] = [
  { href: "/", label: "Preguntar", icon: MessageCircle },
  { href: "/exams", label: "Exámenes", icon: GraduationCap },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
]
// Personal pages open from the user menu at the bottom of the sidebar.
const ACCOUNT: NavItem[] = [
  { href: "/activity", label: "Mi actividad", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings },
]

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
  const router = useRouter()

  async function logout() {
    await postJson("/api/auth/logout", {}).catch(() => {})
    router.replace("/login")
    router.refresh()
  }
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
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-wider">
          {/* Same drawing as app/icon.svg (the favicon). */}
          <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#0a0a0a" className="stroke-border" strokeWidth="1" />
            <rect x="7.5" y="7.5" width="15" height="4.5" rx="1.5" fill="#fafafa" />
            <rect x="12.75" y="7.5" width="4.5" height="17" rx="1.5" fill="#fafafa" />
            <circle cx="23" cy="21.5" r="2.75" fill="#ffa247" />
          </svg>
          <span>
            <span className="text-primary">T</span>icher
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <Nav items={NAV} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {chats.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Conversaciones</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
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
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            {/* Icons and label switch via the .dark class, so server and client markup match. */}
            <SidebarMenuButton onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              <Moon className="dark:hidden" />
              <Sun className="hidden dark:block" />
              <span className="dark:hidden">Modo oscuro</span>
              <span className="hidden dark:inline">Modo claro</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" aria-label="Menú de tu cuenta" />}>
                <Avatar className="size-8">
                  {profile.photo && <AvatarImage src={profile.photo} alt="" />}
                  <AvatarFallback>{name[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm">{name}</span>
                <ChevronsUpDown className="text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="min-w-48">
                {ACCOUNT.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} onClick={() => router.push(href)}>
                    <Icon /> {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

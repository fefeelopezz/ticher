"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  BarChart3,
  CalendarCheck,
  ShieldCheck,
  CalendarDays,
  ChevronsUpDown,
  Flame,
  GraduationCap,
  MessageCircle,
  Moon,
  Search,
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DevNotice } from "@/components/dev-notice"
import { Logo } from "@/components/logo"
import { SearchDialog, useSearchShortcut } from "@/components/search-dialog"
import { postJson } from "@/lib/api"
import { backupFiles, deleteFile } from "@/lib/files"
import { DEFAULT_PROFILE, NO_CHATS, NO_SUBJECTS, useActivity, useEmail, useHydrated, useStored, type Chat, type Profile, type Subject } from "@/lib/store"

type NavItem = { href: string; label: string; icon: LucideIcon }

const NAV: NavItem[] = [
  { href: "/today", label: "Hoy", icon: CalendarCheck },
  { href: "/", label: "Preguntar", icon: MessageCircle },
  { href: "/exams", label: "Exámenes", icon: GraduationCap },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
]
// Personal pages open from the user menu at the bottom of the sidebar.
const ADMIN: NavItem = { href: "/admin", label: "Panel de admin", icon: ShieldCheck }
const ACCOUNT: NavItem[] = [
  { href: "/activity", label: "Mi actividad", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings },
]

function NavItems({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  const { setOpenMobile } = useSidebar()
  return items.map(({ href, label, icon: Icon }) => (
    <SidebarMenuItem key={href}>
      <SidebarMenuButton
        render={<Link href={href} onClick={() => setOpenMobile(false)} />}
        tooltip={label}
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
  const [searching, setSearching] = useState(false)
  // On mobile the sidebar is a drawer: picking a section closes it so the page shows right away.
  const { setOpenMobile } = useSidebar()
  const close = () => setOpenMobile(false)
  useSearchShortcut(useCallback(() => setSearching(true), []))

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
  const [subjects] = useStored<Subject[]>("subjects", NO_SUBJECTS)
  const hydrated = useHydrated()
  const backedUp = useRef(false)
  // Once per visit, a few seconds in: copy to the cloud any of this user's files that only live in this browser.
  useEffect(() => {
    if (!hydrated || backedUp.current) return
    backedUp.current = true
    const ids = [...subjects.flatMap((s) => s.materials.map((m) => m.id)), ...chats.flatMap((c) => c.files.map((f) => f.id))]
    // No cleanup on purpose: the cloud pull changes subjects/chats right after load, which would cancel it.
    setTimeout(() => backupFiles([...new Set(ids)]).catch(() => {}), 4000)
  }, [hydrated, subjects, chats])
  // The server decides who is an admin (ADMIN_EMAILS); the menu only shows the link to them.
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    fetch("/api/admin?check=1")
      .then((res) => (res.ok ? res.json() : { admin: false }))
      .then((data) => setAdmin(!!data.admin))
      .catch(() => {})
  }, [])
  const [profile] = useStored<Profile>("profile", DEFAULT_PROFILE)
  const name = profile.name || "Estudiante"
  const email = useEmail()
  const { streak, todayMinutes, goal, goalMet } = useActivity()

  return (
    <>
      {/* Outside the drawer, so closing the drawer on mobile keeps the search open. */}
      <SearchDialog open={searching} onOpenChange={setSearching} />
      {/* Closing it on desktop leaves an icon rail instead of hiding it; the wide-only parts hide in that mode. */}
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-4 py-5 transition-[padding] group-data-[collapsible=icon]:px-2.5">
          <Link href="/" onClick={close} aria-label="Ticher">
            <Logo className="group-data-[collapsible=icon]:[&>span]:hidden" />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Buscar (Ctrl K)"
                    onClick={() => {
                      close()
                      setSearching(true)
                    }}
                  >
                    <Search />
                    <span className="flex-1">Buscar</span>
                    <kbd className="rounded border px-1.5 text-[10px] text-muted-foreground">Ctrl K</kbd>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <Nav items={NAV} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {chats.length > 0 && (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel>Conversaciones</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {[...chats]
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .slice(0, 15)
                    .map((c) => (
                      <SidebarMenuItem key={c.id}>
                        <SidebarMenuButton render={<Link href={`/?chat=${c.id}`} onClick={close} />}>
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
          <div className="group-data-[collapsible=icon]:hidden">
            <DevNotice variant="card" />
          </div>
          {/* Daily goal: minutes today against the goal, or met by finishing a lesson. */}
          <Link href="/activity" onClick={close} className="mx-2 mb-1 space-y-1.5 rounded-lg border px-3 py-2 text-xs transition-colors group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent">
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 font-medium">
                <Flame className={`size-3.5 ${streak ? "text-primary" : "text-muted-foreground"}`} />
                {streak} {streak === 1 ? "día" : "días"} de racha
              </span>
              <span className="text-muted-foreground tabular-nums">{goalMet ? "Meta cumplida ✓" : `${todayMinutes}/${goal} min`}</span>
            </span>
            <span className="block h-1 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${goalMet ? 100 : Math.min(100, (todayMinutes / goal) * 100)}%` }} />
            </span>
          </Link>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              {/* Icons and label switch via the .dark class, so server and client markup match. */}
              <SidebarMenuButton tooltip="Cambiar tema" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                <Moon className="dark:hidden" />
                <Sun className="hidden dark:block" />
                <span className="dark:hidden">Modo oscuro</span>
                <span className="hidden dark:inline">Modo claro</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Cerrar sesión" onClick={logout}>
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
                <DropdownMenuContent side="top" className="min-w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="space-y-0.5 font-normal">
                      <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                      <span className="block truncate">{email}</span>
                      <span className="flex items-center gap-1 pt-1 text-foreground">
                        <Flame className="size-3.5 text-primary" /> {streak} {streak === 1 ? "día" : "días"} de racha
                      </span>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {[...ACCOUNT, ...(admin ? [ADMIN] : [])].map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem
                      key={href}
                      onClick={() => {
                        close()
                        router.push(href)
                      }}
                    >
                      <Icon /> {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}

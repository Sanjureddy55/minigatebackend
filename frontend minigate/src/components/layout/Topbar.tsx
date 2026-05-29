import {
  Search, Bell, LogOut, User, Settings, ChevronDown, Plus, Command,
  Menu, Moon, Sun, Home, Check, Zap, Info, AlertTriangle, CheckCircle, AlertCircle,
} from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, useAuth } from "@/lib/auth-store";
import { useTheme, themeStore } from "@/lib/theme";
import { useActiveFlat, flatStore } from "@/lib/flats";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem,
  CommandList, CommandSeparator,
} from "@/components/ui/command";
import { notifications, residents, visitors, approvals } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/* ── notification icon by type ─────────────────────────── */
const NotifIcon = ({ type }: { type: string }) => {
  const props = { className: "h-3.5 w-3.5" };
  if (type === "warning") return <AlertTriangle {...props} className="h-3.5 w-3.5 text-yellow-400" />;
  if (type === "alert")   return <AlertCircle  {...props} className="h-3.5 w-3.5 text-red-400" />;
  if (type === "success") return <CheckCircle  {...props} className="h-3.5 w-3.5 text-teal-500" />;
  return <Info className="h-3.5 w-3.5 text-blue-400" />;
};

const notifBg: Record<string, string> = {
  info:    "bg-sky-500/10 border border-sky-500/20",
  warning: "bg-yellow-500/10 border border-yellow-500/20",
  alert:   "bg-red-500/10 border border-red-500/20",
  success: "bg-teal-500/10 border border-teal-500/20",
};

export function Topbar({ onOpenMenu }: { onOpenMenu?: () => void } = {}) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const user        = useAuth();
  const theme       = useTheme();
  const activeFlat  = useActiveFlat();
  const flats       = flatStore.list();
  const [cmdOpen, setCmdOpen]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => {
    if (n.read) return false;
    if (activeFlat.id === "ALL") return true;
    return n.flat === activeFlat.id || n.flat === "ALL";
  }).length;

  /* Cmd+K */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* Close notif panel on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (path: string) => { setCmdOpen(false); navigate({ to: path }); };

  const initials = (user?.name ?? "SA")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  /* Simple breadcrumb from pathname */
  const crumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "));

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-border bg-background px-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] md:px-6">

        {/* Mobile hamburger */}
        <button
          onClick={onOpenMenu}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* ── Property switcher ─────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden md:flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs backdrop-blur transition-all hover:border-border hover:bg-card">
              <div className="grid h-5 w-5 place-items-center rounded-md bg-primary/15">
                <Home className="h-3 w-3 text-primary" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Property</div>
                <div className="font-semibold text-foreground">{activeFlat.label}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 rounded-2xl border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl p-1.5">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
              Switch property
            </DropdownMenuLabel>
            {flats.map((f) => (
              <DropdownMenuItem
                key={f.id}
                onClick={() => flatStore.set(f.id)}
                className="flex items-start gap-2.5 rounded-xl p-2.5 cursor-pointer"
              >
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Home className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{f.society}</div>
                </div>
                {activeFlat.id === f.id && <Check className="h-4 w-4 text-primary shrink-0 mt-1" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="mx-2" />
            <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Add new property
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── Breadcrumb (desktop only) ─────────────────────── */}
        {crumbs.length > 0 && (
          <nav className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/40">/</span>}
                <span className={cn(i === crumbs.length - 1 ? "text-foreground font-medium" : "")}>
                  {c}
                </span>
              </span>
            ))}
          </nav>
        )}

        {/* ── Global search ─────────────────────────────────── */}
        <button
          onClick={() => setCmdOpen(true)}
          className="flex flex-1 max-w-sm items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2 text-sm text-muted-foreground backdrop-blur transition-all hover:border-border hover:bg-muted/50 focus-visible:outline-none ml-auto md:ml-0"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left truncate hidden sm:inline">Search anything…</span>
          <span className="flex-1 text-left truncate sm:hidden">Search…</span>
          <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded-md border border-border/60 bg-background px-1.5 text-[10px] text-muted-foreground font-mono">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        {/* ── Right actions ─────────────────────────────────── */}
        <div className="flex items-center gap-1.5 ml-auto">

          {/* Quick action */}
          <Button
            size="sm"
            className="gap-1.5 hidden sm:inline-flex rounded-xl h-9 text-xs font-semibold px-3"
            style={{ background: "linear-gradient(135deg, #0D9488, #06B6D4)", boxShadow: "0 4px 20px rgba(13,148,136,0.40), 0 0 40px rgba(13,148,136,0.18)" }}
            onClick={() => navigate({ to: "/visitors" })}
          >
            <Zap className="h-3.5 w-3.5" />
            Quick Action
          </Button>

          {/* Theme toggle */}
          <button
            onClick={() => themeStore.toggle()}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait">
              {theme === "dark" ? (
                <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Sun className="h-4 w-4" />
                </motion.div>
              ) : (
                <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Moon className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* ── Notifications ──────────────────────────────── */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="badge-pulse absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-background" style={{ boxShadow: "0 0 8px rgba(13,148,136,0.8)" }} />
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  key="notif-panel"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-11 w-80 z-50 rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unread > 0 && (
                      <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5">
                        {unread} new
                      </span>
                    )}
                  </div>

                  {/* Items */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-border/30">
                    {notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40",
                          !n.read && "bg-primary/[0.03]",
                        )}
                      >
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", notifBg[n.type] ?? notifBg.info)}>
                          <NotifIcon type={n.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground truncate">{n.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</div>
                          <div className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</div>
                        </div>
                        {!n.read && (
                          <div className="h-1.5 w-1.5 mt-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-border/50">
                    <button
                      onClick={() => { setNotifOpen(false); navigate({ to: "/notifications" }); }}
                      className="w-full text-center text-xs text-primary font-medium hover:underline"
                    >
                      View all notifications →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── User profile ────────────────────────────────── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all hover:bg-muted">
                <div
                  className="grid h-8 w-8 place-items-center rounded-xl text-xs font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #0D9488, #06B6D4)" }}
                >
                  {initials}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold leading-tight">{user?.name ?? "Priya Sharma"}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{user?.role ?? "Society Admin"}</div>
                </div>
                <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl p-1.5">
              <DropdownMenuLabel className="px-2 py-2">
                <div className="text-sm font-semibold">{user?.name ?? "Priya Sharma"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{user?.role ?? "Society Admin"}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="mx-2" />
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="rounded-xl gap-2 cursor-pointer">
                <User className="h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="rounded-xl gap-2 cursor-pointer">
                <Settings className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="mx-2" />
              <DropdownMenuItem
                onClick={() => { auth.logout(); navigate({ to: "/login" }); }}
                className="rounded-xl gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Command palette ───────────────────────────────────── */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search residents, visitors, pages or quick actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => go("/dashboard")}>Dashboard</CommandItem>
            <CommandItem onSelect={() => go("/residents")}>Residents</CommandItem>
            <CommandItem onSelect={() => go("/visitors")}>Visitors</CommandItem>
            <CommandItem onSelect={() => go("/approvals")}>Approvals</CommandItem>
            <CommandItem onSelect={() => go("/security")}>Security Operations</CommandItem>
            <CommandItem onSelect={() => go("/admin/analytics")}>Analytics</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Residents">
            {residents.slice(0, 6).map((r) => (
              <CommandItem key={r.id} value={`resident ${r.name} ${r.flat} ${r.email}`}
                onSelect={() => go(`/residents/${r.id}`)}>
                <span className="font-medium">{r.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{r.building} · {r.flat}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Visitors">
            {visitors.slice(0, 5).map((v) => (
              <CommandItem key={v.id} value={`visitor ${v.name} ${v.flat} ${v.purpose}`}
                onSelect={() => go("/visitors")}>
                <span className="font-medium">{v.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{v.purpose}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => go("/visitors")}>Register new visitor</CommandItem>
            <CommandItem onSelect={() => go("/approvals")}>Review pending approvals</CommandItem>
            <CommandItem onSelect={() => go("/onboarding")}>Start society onboarding</CommandItem>
            <CommandItem onSelect={() => { themeStore.toggle(); setCmdOpen(false); }}>
              Toggle {theme === "dark" ? "light" : "dark"} mode
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

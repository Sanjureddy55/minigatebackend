import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, UserCheck, ClipboardCheck, Shield, Bell, Settings,
  Building2, BarChart3, ShieldCheck, Home, Car, PawPrint, HandHelping, UserPlus,
  Truck, Wallet, FileText, AlertTriangle, Clock, QrCode, PhoneCall, Receipt,
  FileBarChart, Wrench, ListChecks, History, Globe, CreditCard, KeyRound,
  Megaphone, MessageSquareWarning, Scroll, Network, ChevronDown, ReceiptText,
  PanelLeftClose, PanelLeftOpen, Package, Calendar, Ticket, ArrowUpCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { society } from "@/lib/mock-data";
import { useAuth, auth, type Role } from "@/lib/auth-store";

type Item  = { to: string; label: string; icon: any; badge?: string };
type Group = { label: string; items: Item[] };

const NAV: Record<Role, Group[]> = {
  "Super Admin": [
    {
      label: "Platform",
      items: [
        { to: "/super/dashboard",      label: "Global Dashboard",   icon: Globe },
        { to: "/super/societies",      label: "Society Management", icon: Building2,  badge: "42" },
        { to: "/super/societies/new",  label: "Create Society",     icon: Building2 },
        { to: "/super/society-admins", label: "Society Admins",     icon: ShieldCheck },
        { to: "/super/subscriptions",  label: "Subscription Plans", icon: CreditCard },
      ],
    },
    {
      label: "Governance",
      items: [
        { to: "/super/users",    label: "Global Users",      icon: Users },
        { to: "/super/roles",    label: "Roles & Permissions", icon: KeyRound },
        { to: "/super/reports",  label: "Global Reports",    icon: FileBarChart },
        { to: "/super/audit",    label: "Audit Logs",        icon: Scroll },
        { to: "/super/settings", label: "System Settings",   icon: Settings },
      ],
    },
  ],

  "Society Admin": [
    {
      label: "Operations",
      items: [
        { to: "/dashboard",  label: "Society Dashboard", icon: LayoutDashboard },
        { to: "/residents",  label: "Residents",         icon: Users,           badge: "824" },
        { to: "/visitors",   label: "Visitors",          icon: UserCheck,       badge: "142" },
        { to: "/approvals",  label: "Approvals",         icon: ClipboardCheck,  badge: "18" },
        { to: "/security",   label: "Security",          icon: Shield },
      ],
    },
    {
      label: "Society",
      items: [
        { to: "/society/buildings",  label: "Buildings",        icon: Building2 },
        { to: "/society/flats",      label: "Flats",            icon: Home },
        { to: "/society/staff",      label: "Staff & Guards",   icon: ShieldCheck },
        { to: "/society/vendors",    label: "Vendors",          icon: Truck },
        { to: "/society/notices",    label: "Notice Board",     icon: Megaphone },
        { to: "/society/complaints", label: "Complaints",       icon: MessageSquareWarning },
        { to: "/society/payments",   label: "Payments Overview",icon: Wallet },
      ],
    },
    {
      label: "Maintenance",
      items: [
        { to: "/society/maintenance-funds",    label: "Fund Dashboard",      icon: Wallet },
        { to: "/society/maintenance-expenses", label: "Expenses",            icon: ReceiptText },
        { to: "/society/monthly-statements",   label: "Monthly Statements",  icon: FileText },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/admin/analytics",  label: "Analytics",         icon: BarChart3 },
        { to: "/admin/rbac",       label: "Roles & Access",    icon: Network },
        { to: "/society/audit",    label: "Audit Logs",        icon: Scroll },
        { to: "/notifications",    label: "Notifications",     icon: Bell, badge: "5" },
        { to: "/settings",         label: "Settings",          icon: Settings },
      ],
    },
  ],

  Resident: [
    {
      label: "Home",
      items: [
        { to: "/resident/dashboard", label: "My Dashboard",   icon: LayoutDashboard },
        { to: "/resident/home",      label: "My Home",        icon: Home },
        { to: "/resident/family",    label: "Family Members", icon: Users },
        { to: "/resident/vehicles",  label: "Vehicles",       icon: Car },
        { to: "/resident/pets",      label: "Pets",           icon: PawPrint },
        { to: "/resident/help",      label: "Daily Help",     icon: HandHelping },
      ],
    },
    {
      label: "Visitors",
      items: [
        { to: "/resident/invite",     label: "Invite Guest",      icon: UserPlus },
        { to: "/resident/visitors",   label: "Visitor Approval",  icon: UserCheck, badge: "3" },
        { to: "/resident/deliveries", label: "Delivery Approval", icon: Truck,     badge: "2" },
        { to: "/resident/history",    label: "Entry / Exit",      icon: History },
      ],
    },
    {
      label: "Society",
      items: [
        { to: "/resident/payments",                label: "Payments",                icon: Wallet },
        { to: "/resident/maintenance-transparency",label: "Maintenance",             icon: ReceiptText },
        { to: "/resident/notices",                 label: "Notices",                 icon: Megaphone },
        { to: "/resident/complaints",              label: "Complaints",              icon: MessageSquareWarning },
        { to: "/resident/sos",                     label: "SOS Emergency",           icon: AlertTriangle },
        { to: "/resident/profile",                 label: "Profile",                 icon: Settings },
      ],
    },
  ],

  "Security Guard": [
    {
      label: "Gate",
      items: [
        { to: "/guard/dashboard",      label: "Guard Dashboard",   icon: LayoutDashboard },
        { to: "/guard/visitor-entry",  label: "Visitor Entry",     icon: UserPlus },
        { to: "/guard/qr-verify",      label: "QR / Passcode",     icon: QrCode },
        { to: "/guard/delivery-verify",label: "Delivery Verify",   icon: Truck },
        { to: "/guard/approved",       label: "Approved Visitors", icon: UserCheck },
      ],
    },
    {
      label: "Operations",
      items: [
        { to: "/guard/logs",    label: "Entry / Exit Logs",  icon: Clock },
        { to: "/guard/alerts",  label: "Emergency Alerts",   icon: AlertTriangle, badge: "2" },
        { to: "/guard/contact", label: "Contact Resident",   icon: PhoneCall },
      ],
    },
  ],

  Accountant: [
    {
      label: "Billing",
      items: [
        { to: "/accounting/dashboard", label: "Billing Dashboard", icon: LayoutDashboard },
        { to: "/accounting/generate",  label: "Generate Bills",    icon: FileText },
        { to: "/accounting/track",     label: "Track Payments",    icon: Wallet },
        { to: "/accounting/dues",      label: "Pending Dues",      icon: AlertTriangle, badge: "37" },
      ],
    },
    {
      label: "Maintenance Funds",
      items: [
        { to: "/society/maintenance-funds",    label: "Fund Dashboard", icon: Wallet },
        { to: "/society/maintenance-expenses", label: "Expenses",       icon: ReceiptText },
        { to: "/society/monthly-statements",   label: "Statements",     icon: FileText },
      ],
    },
    {
      label: "Reports",
      items: [
        { to: "/accounting/receipts", label: "Generate Receipts", icon: Receipt },
        { to: "/accounting/reports",  label: "Payment Reports",   icon: FileBarChart },
        { to: "/accounting/export",   label: "Export Reports",    icon: Scroll },
      ],
    },
  ],

  "Maintenance Staff": [
    {
      label: "Work",
      items: [
        { to: "/maintenance/dashboard", label: "Dashboard",  icon: LayoutDashboard },
        { to: "/maintenance/tasks",     label: "Task Queue", icon: ListChecks },
        { to: "/maintenance/schedule",  label: "Schedule",   icon: Calendar },
      ],
    },
    {
      label: "Resources",
      items: [
        { to: "/maintenance/materials", label: "Materials",    icon: Package },
        { to: "/maintenance/history",   label: "Work History", icon: History },
      ],
    },
  ],

  "Support Staff": [
    {
      label: "Support",
      items: [
        { to: "/support/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
        { to: "/support/tickets",     label: "Tickets",     icon: Ticket },
        { to: "/support/escalations", label: "Escalations", icon: ArrowUpCircle },
      ],
    },
    {
      label: "Records",
      items: [
        { to: "/support/history", label: "Service History", icon: History },
      ],
    },
  ],

  "Delivery Partner": [
    {
      label: "Access",
      items: [
        { to: "/access",        label: "Temporary Access", icon: KeyRound },
        { to: "/access/qr",     label: "QR / Passcode",   icon: QrCode },
        { to: "/access/status", label: "Entry Status",    icon: UserCheck },
      ],
    },
  ],

  "Guest User": [
    {
      label: "Access",
      items: [
        { to: "/access",        label: "My Access Pass", icon: KeyRound },
        { to: "/access/qr",     label: "Show QR Code",  icon: QrCode },
        { to: "/access/status", label: "Entry Status",  icon: UserCheck },
      ],
    },
  ],
};

const ROLES: Role[] = [
  "Super Admin", "Society Admin", "Resident", "Security Guard",
  "Accountant", "Maintenance Staff", "Support Staff", "Delivery Partner", "Guest User",
];

export function Sidebar({ mobile = false }: { mobile?: boolean } = {}) {
  const [collapsedState, setCollapsed] = useState(false);
  const collapsed = mobile ? false : collapsedState;
  const [roleOpen, setRoleOpen] = useState(false);
  const location = useLocation();
  const user = useAuth();
  const role: Role = user?.role ?? "Society Admin";
  const groups = NAV[role] ?? NAV["Society Admin"];
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    groups.forEach((group) => {
      next[group.label] = group.items.some(
        (item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"),
      );
    });
    setOpenGroups((prev) => ({ ...next, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const initials = (user?.name ?? "SA")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.aside
      animate={{ width: mobile ? 288 : collapsed ? 64 : 260 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-full flex-col border-r border-sidebar-border bg-sidebar overflow-hidden"
      style={{ minWidth: mobile ? 288 : collapsed ? 64 : 260 }}
    >
      {/* ── Brand header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border/60">
        {/* Logo mark */}
        <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl font-bold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #0D9488 0%, #06B6D4 100%)", boxShadow: "0 4px 20px rgba(13,148,136,0.40), 0 0 40px rgba(13,148,136,0.15)" }}>
          G
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-teal-400 border-2 border-sidebar" />
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="brand-text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="min-w-0"
            >
              <div className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
                {society.name}
              </div>
              <div className="truncate text-[11px] text-muted-foreground mt-0.5">
                {society.city} · {society.flats} flats
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Role switcher ─────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="role-switcher"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-b border-sidebar-border/60 p-2"
          >
            <button
              onClick={() => setRoleOpen((o) => !o)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all duration-200 hover:bg-sidebar-accent/50"
            >
              <div className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.22), rgba(6,182,212,0.22))", border: "1px solid rgba(13,148,136,0.30)" }}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Acting as</div>
                <div className="truncate text-xs font-semibold text-sidebar-foreground">{role}</div>
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", roleOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {roleOpen && (
                <motion.div
                  key="role-dropdown"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  className="mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-sidebar-border bg-background p-1.5 shadow-xl"
                >
                  {ROLES.map((roleItem) => (
                    <button
                      key={roleItem}
                      onClick={() => { auth.setRole(roleItem); setRoleOpen(false); }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                        roleItem === role
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span>{roleItem}</span>
                      {roleItem === role && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {groups.map((group, gi) => {
          const isOpen = openGroups[group.label] ?? true;

          return (
            <div key={group.label} className={cn(gi > 0 && "mt-4")}>
              {/* Section label */}
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.button
                    key={`label-${group.label}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setOpenGroups((p) => ({ ...p, [group.label]: !isOpen }))}
                    className="flex w-full items-center justify-between px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", !isOpen && "-rotate-90")} />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Nav items */}
              <AnimatePresence initial={false}>
                {(collapsed || isOpen) && (
                  <motion.div
                    key={`items-${group.label}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-0.5"
                  >
                    {group.items.map(({ to, label, icon: Icon, badge }) => {
                      const active =
                        location.pathname === to ||
                        location.pathname.startsWith(to + "/");

                      return (
                        <Link
                          key={to}
                          to={to}
                          title={collapsed ? label : undefined}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                            active
                              ? "nav-active nav-active-bar text-primary font-semibold"
                              : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                          )}
                        >
                          {/* Icon container */}
                          <div className={cn(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-200",
                            active
                              ? "bg-primary/10"
                              : "bg-transparent group-hover:bg-sidebar-accent/60",
                          )}>
                            <Icon className={cn(
                              "h-4 w-4 transition-colors duration-200",
                              active
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-sidebar-foreground",
                            )} />
                          </div>

                          {/* Label */}
                          <AnimatePresence initial={false}>
                            {!collapsed && (
                              <motion.span
                                key={`label-${to}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 truncate"
                              >
                                {label}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Badge */}
                          {!collapsed && badge && (
                            <span className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                              active
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}>
                              {badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* ── Collapse toggle ──────────────────────────────────── */}
      {!mobile && (
        <div className="border-t border-sidebar-border/60 p-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-center rounded-xl py-2 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </motion.aside>
  );
}

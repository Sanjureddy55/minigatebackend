import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Download, ChevronRight, Plus, Activity, ArrowUpRight,
  Users, TrendingUp, Building2, ShieldCheck, Wifi,
} from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { kpis, visitorTrend, recentActivity, approvals, visitors } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TooltipProps } from "recharts";

/* ── Simulated real-time gate events ────────────────────── */
const RT_ACTORS = ["Guard - Gate 1","Guard - Gate 2","Guard - Gate 3"];
const RT_ACTIONS: Array<{ action:string; target:string; type:"entry"|"exit"|"alert" }> = [
  { action:"checked in visitor",  target:"Amazon Delivery → Tower A-402",   type:"entry" },
  { action:"approved entry for",  target:"Guest Priya Nair → Block B-201",   type:"entry" },
  { action:"checked out visitor", target:"Swiggy → Tower C-305",             type:"exit"  },
  { action:"raised alert",        target:"Unknown vehicle at Gate 2",         type:"alert" },
  { action:"verified QR for",     target:"Rahul Kumar → Block D-110",        type:"entry" },
  { action:"checked in delivery", target:"Zomato → Tower A-709",             type:"entry" },
];

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

/* ── Animation variants ─────────────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0 },
};

const staggerGrid: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};

/* ── Custom recharts tooltip ─────────────────────────────── */
function PremiumTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-2xl">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.fill ?? p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Quick insight pill ──────────────────────────────────── */
function InsightPill({
  label, value, sub, color, icon: Icon,
}: { label: string; value: string; sub: string; color: string; icon: React.ElementType }) {
  return (
    <motion.div variants={fadeUp} className="card-premium p-5 flex items-center gap-4">
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
        style={{ background: `${color}1a`, border: `1px solid ${color}2e` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
        <p className="text-sm font-semibold text-foreground/75">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </motion.div>
  );
}

/* ── Resident trend sparkline data ───────────────────────── */
const residentTrend = [
  { m: "Dec", v: 788 }, { m: "Jan", v: 798 }, { m: "Feb", v: 805 },
  { m: "Mar", v: 810 }, { m: "Apr", v: 819 }, { m: "May", v: 824 },
];

function Dashboard() {
  const pendingApprovals = approvals
    .filter((a) => a.status === "pending" || a.status === "in_review")
    .slice(0, 5);
  const liveVisitors = visitors.filter((v) => v.status === "checked_in").slice(0, 5);

  /* Real-time activity feed */
  const [feed, setFeed] = useState(recentActivity);
  const [liveCount, setLiveCount] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const actor  = RT_ACTORS[Math.floor(Math.random() * RT_ACTORS.length)];
      const event  = RT_ACTIONS[Math.floor(Math.random() * RT_ACTIONS.length)];
      const now    = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

      const newEntry = {
        id:     `rt-${Date.now()}`,
        actor,
        action: event.action,
        target: event.target,
        time:   "just now",
      };

      setFeed(prev => [newEntry, ...prev].slice(0, 8));
      setLiveCount(c => c + 1);
      setPulse(true);
      setTimeout(() => setPulse(false), 1500);

      if (event.type === "alert") {
        toast.warning(`Gate Alert`, { description: event.target, duration: 6000 });
      } else {
        toast(`Gate update · ${timeStr}`, {
          description: `${actor} ${event.action}: ${event.target}`,
          duration: 4000,
        });
      }
    }, 22000);

    return () => clearInterval(interval);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-full bg-muted/20">

      {/* ══ Greeting banner ══════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden border-b border-border bg-card px-6 py-7"
      >
        {/* Teal left accent bar */}
        <div aria-hidden className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full"
          style={{ background: "linear-gradient(180deg, #0D9488, #06B6D4)" }} />
        {/* Soft teal circle decoration */}
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-64 opacity-[0.07]"
          style={{ background: "radial-gradient(ellipse at right center, #0D9488, transparent 70%)" }} />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              {today}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {greeting},{" "}
              <span className="gradient-text">Priya.</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">
              Here's what's happening at{" "}
              <span className="font-semibold text-foreground">Greenwood Heights</span> today.
              All systems operational.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-xs h-9 border-border bg-background hover:border-primary/40 hover:text-primary shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              size="sm"
              className="btn-teal gap-1.5 rounded-xl h-9 text-xs font-bold text-white border-0 shadow-md"
            >
              <Plus className="h-3.5 w-3.5" />
              Quick Action
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="p-6 space-y-6 lg:p-8 lg:space-y-8">

        {/* ══ KPI cards ════════════════════════════════════════ */}
        <motion.div
          variants={staggerGrid}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {kpis.map((k) => (
            <motion.div key={k.label} variants={fadeUp}>
              <StatCard {...k} />
            </motion.div>
          ))}
        </motion.div>

        {/* ══ Quick insight pills ═══════════════════════════════ */}
        <motion.div
          variants={staggerGrid}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <InsightPill
            label="Collection Rate"
            value="87%"
            sub="Maintenance dues collected this month"
            color="#0D9488"
            icon={TrendingUp}
          />
          <InsightPill
            label="Occupancy"
            value="96.5%"
            sub="328 of 348 flats occupied"
            color="#0284C7"
            icon={Building2}
          />
          <InsightPill
            label="Active Staff"
            value="24"
            sub="Guards · Maintenance · Support"
            color="#6366F1"
            icon={ShieldCheck}
          />
        </motion.div>

        {/* ══ Charts ═══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          className="grid grid-cols-1 gap-5 lg:grid-cols-3"
        >

          {/* Visitor flow — 2/3 width */}
          <div className="card-premium p-6 lg:col-span-2">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Visitor Flow</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Guests · deliveries · services this week
                </p>
              </div>
              <div className="flex gap-1">
                {["7D", "30D", "90D"].map((p, i) => (
                  <button
                    key={p}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                      i === 0
                        ? "bg-primary/15 text-primary border border-primary/25"
                        : "text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={visitorTrend}
                  barGap={3}
                  barCategoryGap="28%"
                  margin={{ left: -10, right: 4, top: 4 }}
                >
                  <defs>
                    <linearGradient id="gradGuests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2DD4BF" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0D9488" stopOpacity={0.60} />
                    </linearGradient>
                    <linearGradient id="gradDeliveries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity={0.60} />
                    </linearGradient>
                    <linearGradient id="gradServices" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.60} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148,163,184,0.08)"
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(148,163,184,0.8)", fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(148,163,184,0.8)", fontSize: 11 }}
                    width={28}
                  />
                  <Tooltip content={<PremiumTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 8 } as any} />
                  <Bar dataKey="guests"     fill="url(#gradGuests)"     radius={[6,6,2,2]} maxBarSize={30} />
                  <Bar dataKey="deliveries" fill="url(#gradDeliveries)" radius={[6,6,2,2]} maxBarSize={30} />
                  <Bar dataKey="services"   fill="url(#gradServices)"   radius={[6,6,2,2]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-4 justify-center">
              {[
                { color: "#2DD4BF", label: "Guests" },
                { color: "#38BDF8", label: "Deliveries" },
                { color: "#818CF8", label: "Services" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-[11px] text-muted-foreground font-medium">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resident trend — 1/3 width */}
          <div className="card-premium p-6 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-foreground">Residents</h3>
              <span className="flex items-center gap-1 text-xs font-bold text-teal-500">
                <TrendingUp className="h-3.5 w-3.5" /> +4.2%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">6-month growth</p>
            <div className="flex-1 min-h-0 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={residentTrend} margin={{ left: -16, right: 4, top: 4 }}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0D9488" stopOpacity={0.30} />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148,163,184,0.08)"
                  />
                  <XAxis
                    dataKey="m"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(148,163,184,0.8)", fontSize: 10 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(148,163,184,0.8)", fontSize: 10 }}
                    width={30}
                    domain={[780, 830]}
                  />
                  <Tooltip content={<PremiumTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#0D9488"
                    strokeWidth={2.5}
                    fill="url(#areaFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#0D9488", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xl font-extrabold text-foreground">824</p>
                <p className="text-[11px] text-muted-foreground">Active now</p>
              </div>
              <div>
                <p className="text-xl font-extrabold text-foreground">348</p>
                <p className="text-[11px] text-muted-foreground">Total flats</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ══ Activity + Tables ══════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5, ease: "easeOut" }}
          className="grid grid-cols-1 gap-5 lg:grid-cols-3"
        >
          {/* Activity timeline — 1/3 */}
          <div className="card-premium p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">Live Activity</h3>
              <div className="flex items-center gap-2">
                {liveCount > 0 && (
                  <AnimatePresence>
                    <motion.span
                      key={liveCount}
                      initial={{ scale:0.7, opacity:0 }}
                      animate={{ scale:1, opacity:1 }}
                      className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5"
                    >
                      +{liveCount}
                    </motion.span>
                  </AnimatePresence>
                )}
                <span className={cn(
                  "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-500",
                  pulse ? "text-sky-400" : "text-teal-500",
                )}>
                  <Wifi className="h-3 w-3" />
                  {pulse ? "Updating" : "Live"}
                </span>
              </div>
            </div>
            <ol className="relative space-y-0">
              {feed.map((a, idx) => (
                <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {idx !== feed.length - 1 && (
                    <span className="absolute left-[11px] top-6 bottom-0 w-px bg-gradient-to-b from-teal-500/40 to-transparent" />
                  )}
                  <span className="relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug">
                      <span className="font-semibold text-foreground">{a.actor}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>
                    </p>
                    <p className="text-xs text-foreground/70 truncate mt-0.5">{a.target}</p>
                    <p className="text-[10px] text-muted-foreground/55 mt-0.5">{a.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Tables column — 2/3 */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Pending approvals */}
            <PremiumSection title="Pending Approvals" link="/approvals" count={pendingApprovals.length}>
              {pendingApprovals.length === 0 ? (
                <EmptyRow message="All approvals are cleared" />
              ) : (
                pendingApprovals.map((a) => (
                  <Link
                    key={a.id}
                    to="/approvals"
                    className="group flex items-center gap-3.5 px-5 py-3.5 transition-all hover:bg-muted/30"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-xs font-bold text-accent-foreground">
                      {a.requester.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{a.title}</p>
                        <StatusBadge status={a.priority} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {a.requester} · {a.flat} · {a.stage}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                ))
              )}
            </PremiumSection>

            {/* Live visitors */}
            <PremiumSection title="Live at Gate" link="/visitors" count={liveVisitors.length}>
              {liveVisitors.length === 0 ? (
                <EmptyRow message="No visitors currently checked in" />
              ) : (
                liveVisitors.map((v) => (
                  <Link
                    key={v.id}
                    to="/visitors"
                    className="group flex items-center gap-3.5 px-5 py-3.5 transition-all hover:bg-muted/30"
                  >
                    <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-info/10 border border-info/20 text-xs font-bold text-info">
                      {v.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-teal-400 border-2 border-card" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{v.name}</p>
                        <StatusBadge status={v.type} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {v.purpose} → {v.flat}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">{v.checkIn}</p>
                      <p className="text-[10px] font-semibold text-teal-500">Live</p>
                    </div>
                  </Link>
                ))
              )}
            </PremiumSection>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

/* ── Shared sub-components ──────────────────────────────── */

function PremiumSection({
  title, link, count, children,
}: {
  title: string; link: string; count: number; children: React.ReactNode;
}) {
  return (
    <div className="card-premium overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {count}
          </span>
        </div>
        <Link
          to={link}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-border/40">{children}</div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-muted/50">
        <Activity className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

import { TrendingDown, TrendingUp, Users, UserCheck, ClipboardCheck, ShieldAlert, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  users:             Users,
  "user-check":      UserCheck,
  "clipboard-check": ClipboardCheck,
  "shield-alert":    ShieldAlert,
};

const iconTheme: Record<string, {
  bg: string; iconColor: string; stroke: string;
  positiveBadge: string; negativeBadge: string;
}> = {
  users: {
    bg:           "bg-teal-50 border border-teal-100 dark:bg-teal-900/25 dark:border-teal-800/40",
    iconColor:    "text-teal-600 dark:text-teal-400",
    stroke:       "#0D9488",
    positiveBadge:"bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/40",
    negativeBadge:"bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/40",
  },
  "user-check": {
    bg:           "bg-sky-50 border border-sky-100 dark:bg-sky-900/25 dark:border-sky-800/40",
    iconColor:    "text-sky-600 dark:text-sky-400",
    stroke:       "#0284C7",
    positiveBadge:"bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/40",
    negativeBadge:"bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/40",
  },
  "clipboard-check": {
    bg:           "bg-violet-50 border border-violet-100 dark:bg-violet-900/25 dark:border-violet-800/40",
    iconColor:    "text-violet-600 dark:text-violet-400",
    stroke:       "#7C3AED",
    positiveBadge:"bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/40",
    negativeBadge:"bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/40",
  },
  "shield-alert": {
    bg:           "bg-rose-50 border border-rose-100 dark:bg-rose-900/25 dark:border-rose-800/40",
    iconColor:    "text-rose-500 dark:text-rose-400",
    stroke:       "#E11D48",
    positiveBadge:"bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/40",
    negativeBadge:"bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/40",
  },
};

function sparklinePath(delta: number, seed: number, w = 88, h = 32): { line: string; area: string } {
  const pts = 8;
  const dir = delta >= 0 ? 1 : -1;
  const ys = Array.from({ length: pts }, (_, i) => {
    const trend = dir * (i / (pts - 1)) * 14;
    const wave  = Math.sin(i * 1.8 + seed) * 5 + Math.cos(i * 0.9 + seed * 2) * 3;
    return h / 2 - trend - wave;
  });
  const clamp  = (v: number) => Math.max(2, Math.min(h - 2, v));
  const xStep  = w / (pts - 1);
  const coords = ys.map((y, i) => ({ x: i * xStep, y: clamp(y) }));
  let line = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const p = coords[i - 1], c = coords[i], cpx = (p.x + c.x) / 2;
    line += ` C ${cpx} ${p.y}, ${cpx} ${c.y}, ${c.x} ${c.y}`;
  }
  const area = `${line} L ${coords[coords.length - 1].x} ${h} L ${coords[0].x} ${h} Z`;
  return { line, area };
}

const SEEDS: Record<string, number> = {
  users: 1.2, "user-check": 2.7, "clipboard-check": 4.1, "shield-alert": 5.8,
};

interface StatCardProps {
  label: string;
  value: number | string;
  delta: number;
  icon: string;
}

export function StatCard({ label, value, delta, icon }: StatCardProps) {
  const Icon     = iconMap[icon] ?? Users;
  const theme    = iconTheme[icon] ?? iconTheme.users;
  const positive = delta >= 0;
  const seed     = SEEDS[icon] ?? 1;
  const { line, area } = sparklinePath(delta, seed);

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.012 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="card-premium p-5 cursor-default"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("grid h-11 w-11 place-items-center rounded-2xl", theme.bg)}>
          <Icon className={cn("h-5 w-5", theme.iconColor)} />
        </div>
        <div className={cn(
          "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
          positive ? theme.positiveBadge : theme.negativeBadge,
        )}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{delta}%
        </div>
      </div>

      {/* Value */}
      <div className="text-[2.2rem] font-extrabold tracking-tight text-foreground leading-none">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>

      {/* Label */}
      <div className="text-sm font-medium text-muted-foreground mt-1">{label}</div>

      {/* Sparkline */}
      <div className="mt-4 flex items-end justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          vs last month
        </span>
        <svg width="88" height="32" viewBox="0 0 88 32" className="overflow-visible">
          <defs>
            <linearGradient id={`fill-${icon}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.stroke} stopOpacity={0.18} />
              <stop offset="100%" stopColor={theme.stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <motion.path d={area} fill={`url(#fill-${icon})`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }} />
          <motion.path d={line} fill="none" stroke={theme.stroke} strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.9, ease: "easeOut" }} />
        </svg>
      </div>
    </motion.div>
  );
}

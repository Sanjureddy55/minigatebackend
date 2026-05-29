import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: string;
}


export function PageHeader({ title, description, actions, badge }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col gap-4 border-b border-border bg-card px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-7"
    >
      {/* Teal left accent bar */}
      <div
        className="pointer-events-none absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full"
        style={{ background: "linear-gradient(180deg, #0D9488, #06B6D4)" }}
      />
      {/* Soft right decoration */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-48 opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse at right center, #0D9488, transparent 70%)" }}
      />

      <div className="min-w-0 pl-3">
        {badge && (
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
            {badge}
          </span>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </motion.div>
  );
}

import { cn } from "@/lib/utils";

const variants = {
  active: "bg-success/10 text-success border-success/20",
  approved: "bg-success/10 text-success border-success/20",
  checked_in: "bg-info/10 text-info border-info/20",
  checked_out: "bg-muted text-muted-foreground border-border",
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  in_review: "bg-info/10 text-info border-info/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-muted text-muted-foreground border-border",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/15 text-warning-foreground border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
  owner: "bg-info/10 text-info border-info/20",
  tenant: "bg-accent text-accent-foreground border-accent",
  guest: "bg-info/10 text-info border-info/20",
  delivery: "bg-warning/15 text-warning-foreground border-warning/30",
  cab: "bg-accent text-accent-foreground border-accent",
  service: "bg-success/10 text-success border-success/20",
} as const;

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const v = (variants as Record<string, string>)[status] ?? "bg-muted text-muted-foreground border-border";
  const label = status.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap", v, className)}>
      {label}
    </span>
  );
}

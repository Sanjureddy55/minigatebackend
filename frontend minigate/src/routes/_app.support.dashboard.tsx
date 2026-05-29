import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Ticket, Wrench, CheckCircle2, Star, RefreshCw, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
// @ts-ignore
import { supportService } from "@/services/support.service.js";

export const Route = createFileRoute("/_app/support/dashboard")({
  component: Page,
});

const PRIORITY_COLORS: Record<string, string> = {
  high:   "text-destructive bg-destructive/10 border-destructive/20",
  medium: "text-warning-foreground bg-warning/10 border-warning/20",
  low:    "text-muted-foreground bg-muted/30 border-border",
};

function KpiCard({ icon: Icon, value, label, color, bg }: {
  icon: React.ElementType; value: number | string | null; label: string; color: string; bg: string;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className={`text-3xl font-extrabold tracking-tight ${color}`}>{value ?? 0}</div>
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </motion.div>
  );
}

function Page() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["support-dashboard"],
    queryFn: () => supportService.getDashboard().then((r: any) => r.data.data),
    refetchInterval: 60_000,
  });

  const pickup = useMutation({
    mutationFn: (id: number) => supportService.pickupTicket(id),
    onSuccess: () => {
      toast.success("Ticket picked up");
      qc.invalidateQueries({ queryKey: ["support-dashboard"] });
    },
    onError: () => toast.error("Failed to pick up ticket"),
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Loading dashboard…</div>;
  }

  const d      = data ?? {};
  const stats  = d.stats ?? {};

  return (
    <>
      <PageHeader
        title="Support Dashboard"
        description="Your ticket queue and service overview"
        badge="Live"
        actions={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => qc.invalidateQueries({ queryKey: ["support-dashboard"] })}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard icon={Ticket}       value={stats.open}              label="Open Tickets"      color="text-sky-600"    bg="bg-sky-50" />
          <KpiCard icon={Wrench}       value={stats.in_progress}       label="In Progress"       color="text-amber-600"  bg="bg-amber-50" />
          <KpiCard icon={CheckCircle2} value={stats.resolved_this_week} label="Resolved (Week)"  color="text-emerald-600" bg="bg-emerald-50" />
          <KpiCard icon={Star}         value={stats.avg_rating ?? "—"} label="Avg Rating"        color="text-amber-500"  bg="bg-amber-50" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Active Tickets */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">Active Tickets</span>
              <a href="/support/tickets" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </a>
            </div>
            <div className="divide-y divide-border">
              {(d.active_tickets ?? []).length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">No active tickets — great work!</p>
              )}
              {(d.active_tickets ?? []).map((t: any) => (
                <div key={t.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">{t.subject}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">{t.ticket_id}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.resident_name} · {t.flat_number} · {t.time_ago}
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${PRIORITY_COLORS[t.priority] ?? ""}`}>
                    {t.priority}
                  </span>
                  {t.status === "open" && (
                    <button
                      onClick={() => pickup.mutate(t.id)}
                      className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                    >
                      Pick Up
                    </button>
                  )}
                  {t.status === "in_progress" && <StatusBadge status="in_progress" />}
                </div>
              ))}
            </div>
          </div>

          {/* Recently Resolved */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">Recently Resolved</span>
              <a href="/support/history" className="text-xs font-semibold text-primary hover:underline">History →</a>
            </div>
            <div className="divide-y divide-border">
              {(d.recently_resolved ?? []).length === 0 && (
                <p className="px-5 py-6 text-sm text-muted-foreground">No resolved tickets yet.</p>
              )}
              {(d.recently_resolved ?? []).map((t: any) => (
                <div key={t.id} className="px-5 py-3 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{t.subject}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.resident_name} · {t.flat_number}</div>
                    {t.rating && (
                      <div className="text-[11px] text-amber-500 mt-0.5">{"★".repeat(t.rating)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

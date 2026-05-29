import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Ticket, DollarSign, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
// @ts-ignore
import { platformService } from "@/services/platform.service.js";

export const Route = createFileRoute("/_app/super/dashboard")({
  component: Page,
});

function fmt(n: number) {
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtRupees(amount: number) {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000)   return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount}`;
}

function Page() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => platformService.getDashboardStats().then((r: any) => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { data: societiesData, isLoading: socsLoading } = useQuery({
    queryKey: ["platform-societies"],
    queryFn: () => platformService.getDashboardSocieties({ page_size: 10 }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const societies: any[] = societiesData?.results ?? [];

  const kpis = stats
    ? [
        {
          label: "Total Societies",
          value: fmt(stats.total_societies ?? 0),
          hint: `+${stats.new_societies_this_month ?? 0} this month`,
          icon: Building2,
          color: "text-primary",
          bg: "bg-primary/10",
        },
        {
          label: "Active Users",
          value: fmt(stats.active_users ?? 0),
          hint: `${stats.users_mom_change >= 0 ? "+" : ""}${fmt(stats.users_mom_change ?? 0)} MoM`,
          icon: Users,
          color: "text-success",
          bg: "bg-success/10",
        },
        {
          label: "Open Tickets",
          value: stats.open_tickets ?? 0,
          hint: `Across ${stats.societies_with_tickets ?? 0} societies`,
          icon: Ticket,
          color: "text-warning-foreground",
          bg: "bg-warning/10",
        },
        {
          label: "MRR",
          value: fmtRupees(parseFloat(stats.mrr ?? "0")),
          hint: `${stats.mrr_mom_pct >= 0 ? "+" : ""}${stats.mrr_mom_pct}% MoM`,
          icon: DollarSign,
          color: "text-sky-600",
          bg: "bg-sky-500/10",
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Global Dashboard"
        description="Platform-wide health, activity, and society KPIs."
      />

      <div className="space-y-6 p-4 sm:p-6">
        {statsLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        )}

        {!statsLoading && kpis.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {kpis.map(({ label, value, hint, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-extrabold tracking-tight ${color}`}>{value}</div>
                    <div className="text-xs text-muted-foreground font-medium">{label}</div>
                  </div>
                </div>
                {hint && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {hint}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">Recent Societies</span>
            </div>
            {societiesData?.count != null && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                {societiesData.count}
              </span>
            )}
          </div>

          {socsLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!socsLoading && societies.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No societies yet.</p>
          )}

          {societies.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Society</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">City</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Plan</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Users</th>
                    <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {societies.map((s: any) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">{s.name}</td>
                      <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">{s.city_name || "—"}</td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs font-semibold capitalize">
                          {s.plan_display || s.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{s.user_count ?? 0}</td>
                      <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

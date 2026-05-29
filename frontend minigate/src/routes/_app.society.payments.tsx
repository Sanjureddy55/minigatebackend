import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, AlertCircle, Users, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/payments")({
  component: Page,
});

function fmtRupees(amount: number | string) {
  const n = parseFloat(String(amount));
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function Page() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["payments-overview"],
    queryFn: () => societyService.getPaymentsOverview().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const dues: any[] = overview?.dues ?? [];

  const kpis = overview
    ? [
        {
          label: "Collected (Month)",
          value: fmtRupees(overview.collected_this_month),
          icon: TrendingUp,
          color: "text-success",
          bg: "bg-success/10",
        },
        {
          label: "Outstanding",
          value: fmtRupees(overview.outstanding),
          icon: DollarSign,
          color: "text-warning-foreground",
          bg: "bg-warning/10",
        },
        {
          label: "Defaulters",
          value: overview.defaulters,
          icon: Users,
          color: "text-destructive",
          bg: "bg-destructive/10",
        },
        {
          label: "Avg Collection",
          value: `${overview.avg_collection_pct?.toFixed(1) ?? 0}%`,
          icon: AlertCircle,
          color: "text-primary",
          bg: "bg-primary/10",
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Payments Overview"
        description="Maintenance collections and outstanding dues."
      />

      <div className="space-y-6 p-4 sm:p-6">
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && kpis.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">Due Payments</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {dues.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && dues.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No outstanding dues.</p>
          )}

          {dues.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Flat</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Resident</th>
                    <th className="px-5 py-2.5 text-left font-medium">Amount</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Due Date</th>
                    <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dues.map((due: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">
                        {due.flat_number}
                        {due.building && (
                          <div className="text-xs text-muted-foreground">{due.building}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">{due.resident || "—"}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{fmtRupees(due.amount)}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                        {due.due_date ? new Date(due.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={due.status} />
                      </td>
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

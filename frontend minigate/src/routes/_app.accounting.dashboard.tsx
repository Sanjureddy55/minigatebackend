import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, AlertCircle, Users, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
// @ts-ignore
import { accountantService } from "@/services/accountant.service.js";

export const Route = createFileRoute("/_app/accounting/dashboard")({
  component: Page,
});

function fmtRupees(amount: number | string | undefined) {
  const n = parseFloat(String(amount ?? 0));
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["accountant-dashboard"],
    queryFn: () => accountantService.getDashboard().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const kpis = data
    ? [
        { label: "Collected (Month)", value: fmtRupees(data.collected_this_month), icon: TrendingUp,  color: "text-success",            bg: "bg-success/10" },
        { label: "Outstanding",       value: fmtRupees(data.outstanding),          icon: DollarSign,  color: "text-warning-foreground", bg: "bg-warning/10" },
        { label: "Defaulters",        value: data.defaulters ?? 0,                 icon: Users,       color: "text-destructive",        bg: "bg-destructive/10" },
        { label: "Avg Collection",    value: `${(data.avg_collection_pct ?? 0).toFixed(1)}%`, icon: AlertCircle, color: "text-primary", bg: "bg-primary/10" },
      ]
    : [];

  const history: any[] = data?.monthly_history ?? [];

  return (
    <>
      <PageHeader
        title="Billing Dashboard"
        description="Collections, dues and recent activity."
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
                  <div className={`text-xl font-extrabold ${color}`}>{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">Monthly History</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Month</th>
                    <th className="px-5 py-2.5 text-left font-medium">Collected</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Outstanding</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Defaulters</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Avg %</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">{row.month}</td>
                      <td className="px-5 py-3 text-success font-semibold">{fmtRupees(row.collected)}</td>
                      <td className="px-5 py-3 hidden sm:table-cell text-warning-foreground">{fmtRupees(row.outstanding)}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{row.defaulters}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{row.avg_pct?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { IndianRupee, Wallet, ReceiptText, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/maintenance-funds")({
  component: Page,
});

function fmt(v: number | string | undefined) {
  if (v === undefined || v === null) return "₹0";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function Page() {
  const societyId = useSelector((s: any) => s.auth?.legacyUser?.society_id);

  const { data, isLoading } = useQuery({
    queryKey: ["fund-dashboard", societyId],
    queryFn: () => societyService.getFundDashboard({ society: societyId }).then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const kpi = data?.kpi ?? {};
  const latestExpenses: any[] = data?.latest_expenses ?? [];
  const usedPct = kpi.usage_pct ?? 0;

  const cards = [
    { label: "Total Collected", value: kpi.total_collected, icon: IndianRupee, color: "text-success" },
    { label: "Total Expenses", value: kpi.total_expenses_used, icon: ReceiptText, color: "text-destructive" },
    { label: "Remaining Balance", value: kpi.remaining_balance, icon: Wallet, color: "text-primary" },
    { label: "Pending Dues", value: kpi.pending_dues, icon: AlertCircle, color: "text-warning-foreground" },
    { label: "This Month Collection", value: kpi.this_month_collection, icon: TrendingUp, color: "text-success" },
    { label: "This Month Expenses", value: kpi.this_month_expenses, icon: TrendingDown, color: "text-destructive" },
  ];

  return (
    <>
      <PageHeader
        title="Maintenance Fund Dashboard"
        description="Track collection, expenses, balance and proof documents."
        actions={
          <Link to="/society/maintenance-expenses">
            <Button size="sm">Add / Manage Expenses</Button>
          </Link>
        }
      />

      <div className="space-y-6 p-4 md:p-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">{fmt(value)}</p>
            </div>
          ))}
        </div>

        {!isLoading && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-foreground">Fund usage progress</span>
              <span className="text-muted-foreground">{kpi.usage_label ?? `${usedPct.toFixed(1)}% used`}</span>
            </div>
            <Progress value={usedPct} />
            <div className="mt-2 text-xs text-muted-foreground">
              {kpi.usage_description ?? `${fmt(kpi.total_expenses_used)} used from ${fmt(kpi.total_collected)} collected.`}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">Latest published expenses</span>
          </div>
          {latestExpenses.length === 0 && !isLoading && (
            <p className="p-6 text-sm text-muted-foreground text-center">No published expenses yet.</p>
          )}
          {latestExpenses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-5 py-3 text-left font-bold">Expense</th>
                    <th className="px-5 py-3 text-left font-bold">Category</th>
                    <th className="px-5 py-3 text-left font-bold">Amount</th>
                    <th className="px-5 py-3 text-left font-bold hidden sm:table-cell">Proof</th>
                    <th className="px-5 py-3 text-left font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestExpenses.map((ex: any) => {
                    const proofUrl = ex.proof_file_url || ex.proof_url;
                    return (
                      <tr key={ex.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-5 py-3 font-medium text-foreground">{ex.title}</td>
                        <td className="px-5 py-3 text-muted-foreground">{ex.category_display || ex.category}</td>
                        <td className="px-5 py-3 text-foreground">{fmt(ex.amount)}</td>
                        <td className="px-5 py-3 hidden sm:table-cell">
                          {proofUrl ? (
                            <a href={proofUrl} target="_blank" rel="noopener noreferrer"
                              className="text-primary text-xs hover:underline">
                              {proofUrl.split("/").pop()?.slice(0, 24) || "View"}
                            </a>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-medium text-success">{ex.status_display || "Published"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

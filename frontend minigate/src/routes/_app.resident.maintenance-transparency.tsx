import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/maintenance-transparency")({
  component: Page,
});

function fmt(v: number | string | undefined) {
  if (v === undefined || v === null) return "₹0";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-transparency"],
    queryFn: () => residentService.getMaintenanceTransparency().then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const { data: statementsData, isLoading: stmLoading } = useQuery({
    queryKey: ["resident-statements"],
    queryFn: () => residentService.getStatements().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const mt = data ?? {};
  const statements: any[] = statementsData?.results ?? statementsData ?? [];
  const usedPct = mt.fund_usage_pct ?? 0;
  const publishedExpenses: any[] = mt.published_expenses ?? [];

  return (
    <>
      <PageHeader
        title="Maintenance Fund Transparency"
        description="See how your society maintenance money is collected and used."
      />

      <div className="space-y-6 p-4 md:p-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "My Maintenance Paid", value: mt.my_maintenance_paid },
            { label: "Society Collection", value: mt.society_collection },
            { label: "Amount Used", value: mt.amount_used },
            { label: "Remaining Balance", value: mt.remaining_balance },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{fmt(value)}</p>
            </div>
          ))}
        </div>

        {!isLoading && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-foreground">Fund usage</span>
              <span className="text-muted-foreground">{usedPct.toFixed(1)}% used</span>
            </div>
            <Progress value={usedPct} />
          </div>
        )}

        {publishedExpenses.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">Published Expense Proofs</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Expense</th>
                  <th className="px-5 py-2.5 text-left font-medium">Category</th>
                  <th className="px-5 py-2.5 text-left font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Vendor</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Date</th>
                  <th className="px-5 py-2.5 text-left font-medium">Proof</th>
                </tr>
              </thead>
              <tbody>
                {publishedExpenses.map((ex: any) => (
                  <tr key={ex.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">{ex.title}</td>
                    <td className="px-5 py-3 text-muted-foreground">{ex.category_display || ex.category}</td>
                    <td className="px-5 py-3 text-foreground">{fmt(ex.amount)}</td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">{ex.vendor_name || "—"}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground text-xs">{ex.expense_date || "—"}</td>
                    <td className="px-5 py-3">
                      {ex.proof_url ? (
                        <a href={ex.proof_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                            <Eye className="h-3 w-3" /> View
                          </Button>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!stmLoading && statements.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {statements.map((s: any) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  {s.title || `${s.month_label} Statement`}
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>Collected: {fmt(s.total_collected)}</p>
                  <p>Expenses: {fmt(s.total_expenses)}</p>
                  <p>Balance: {fmt(s.closing_balance)}</p>
                  {s.published_date && <p>Published: {s.published_date}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

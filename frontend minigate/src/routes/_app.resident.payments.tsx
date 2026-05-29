import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Calendar, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/payments")({
  component: Page,
});

function fmtRupees(amount: number | string | undefined) {
  const n = parseFloat(String(amount ?? 0));
  return `₹${n.toLocaleString("en-IN")}`;
}

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["resident-payments"],
    queryFn: () => residentService.getPayments({ page_size: 50 }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const payments: any[] = data?.results ?? [];

  const outstanding = payments
    .filter((p: any) => p.status === "pending" || p.status === "overdue")
    .reduce((s: number, p: any) => s + parseFloat(p.amount ?? 0), 0);

  const paidYtd = payments
    .filter((p: any) => p.status === "paid")
    .reduce((s: number, p: any) => s + parseFloat(p.amount ?? 0), 0);

  const nextDue = payments
    .filter((p: any) => p.due_date && (p.status === "pending"))
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  const kpis = [
    { label: "Outstanding", value: fmtRupees(outstanding), icon: DollarSign,   color: "text-warning-foreground", bg: "bg-warning/10" },
    { label: "Paid (YTD)",  value: fmtRupees(paidYtd),    icon: CheckCircle2,  color: "text-success",            bg: "bg-success/10" },
    { label: "Next Due",    value: nextDue ? new Date(nextDue.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—",
      icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Maintenance dues, history and statements."
      />

      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">Payment History</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {data?.count ?? payments.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && payments.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No payment records found.</p>
          )}

          {payments.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Month</th>
                  <th className="px-5 py-2.5 text-left font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Due Date</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Description</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">{p.month || "—"}</td>
                    <td className="px-5 py-3 font-semibold text-foreground">{fmtRupees(p.amount)}</td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">
                      {p.due_date ? new Date(p.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground truncate max-w-xs">
                      {p.description || "—"}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

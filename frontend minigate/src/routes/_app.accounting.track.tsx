import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Search, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
// @ts-ignore
import { accountantService } from "@/services/accountant.service.js";

export const Route = createFileRoute("/_app/accounting/track")({
  component: Page,
});

function fmtRupees(n: number | string) {
  const v = parseFloat(String(n ?? 0));
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function Page() {
  const [search, setSearch] = useState("");

  const { data: summary } = useQuery({
    queryKey: ["track-summary"],
    queryFn: () => accountantService.getTrackPaymentsSummary().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["track-payments", search],
    queryFn: () =>
      accountantService.getTrackPayments({ search: search || undefined, page_size: 50 }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const rows: any[] = data?.results ?? [];

  const handleExport = () => {
    accountantService.exportTrackPayments().then((r: any) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = "track-payments.csv"; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => {});
  };

  const kpis = [
    { label: "Total",    value: summary?.total_payments ?? 0,                 icon: DollarSign,  color: "text-foreground",         bg: "bg-muted/30" },
    { label: "Approved", value: summary?.approved_count ?? 0,                 icon: CheckCircle2, color: "text-success",            bg: "bg-success/10" },
    { label: "Pending",  value: summary?.pending_count ?? 0,                  icon: Clock,       color: "text-warning-foreground", bg: "bg-warning/10" },
    { label: "This Month", value: fmtRupees(summary?.this_month_total ?? 0),  icon: DollarSign,  color: "text-primary",            bg: "bg-primary/10" },
  ];

  return (
    <>
      <PageHeader
        title="Track Payments"
        description="Recorded payments and their approval status."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
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

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by flat, resident, method…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">All Payments</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {data?.count ?? rows.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && rows.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No payments found.</p>}

          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Flat</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Resident</th>
                    <th className="px-5 py-2.5 text-left font-medium">Amount</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Method</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Month</th>
                    <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any) => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">
                        {row.flat_number}
                        {row.building_name && <div className="text-xs text-muted-foreground">{row.building_name}</div>}
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">{row.resident_name || "—"}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{fmtRupees(row.amount)}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground capitalize">
                        {row.payment_method_display || row.payment_method || "—"}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{row.due_month || "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
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

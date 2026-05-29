import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, BarChart3, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
// @ts-ignore
import { accountantService } from "@/services/accountant.service.js";

export const Route = createFileRoute("/_app/accounting/reports")({
  component: Page,
});

function fmtRupees(n: number | string) {
  const v = parseFloat(String(n ?? 0));
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["payment-reports"],
    queryFn: () => accountantService.getPaymentReports({}).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const kpis = data
    ? [
        { label: "Total Payments", value: data.total_payments ?? 0,              icon: BarChart3,   color: "text-foreground",         bg: "bg-muted/30" },
        { label: "Total Amount",   value: fmtRupees(data.total_amount ?? 0),      icon: DollarSign,  color: "text-primary",            bg: "bg-primary/10" },
        { label: "Approved",       value: data.approved_count ?? 0,               icon: CheckCircle2, color: "text-success",           bg: "bg-success/10" },
        { label: "Pending",        value: data.pending_count ?? 0,                icon: Clock,       color: "text-warning-foreground", bg: "bg-warning/10" },
      ]
    : [];

  const monthlyTrend: any[] = data?.monthly_trend ?? [];
  const byMethod: any[]     = data?.by_method ?? [];

  const handleDownloadPdf = () => {
    accountantService.downloadPaymentReportPdf({}).then((r: any) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = "payment-report.pdf"; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => toast.error("Failed to download"));
  };

  return (
    <>
      <PageHeader
        title="Payment Reports"
        description="Detailed payment analytics and breakdown."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadPdf}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        }
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

        {byMethod.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">By Payment Method</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Method</th>
                    <th className="px-5 py-2.5 text-left font-medium">Count</th>
                    <th className="px-5 py-2.5 text-left font-medium">Total</th>
                    <th className="px-5 py-2.5 text-left font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {byMethod.map((m: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground capitalize">{m.method_display || m.method}</td>
                      <td className="px-5 py-3 text-muted-foreground">{m.count}</td>
                      <td className="px-5 py-3 font-semibold">{fmtRupees(m.total)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{m.percentage?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {monthlyTrend.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">Monthly Trend</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Month</th>
                    <th className="px-5 py-2.5 text-left font-medium">Count</th>
                    <th className="px-5 py-2.5 text-left font-medium">Total</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Approved</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTrend.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">{row.month}</td>
                      <td className="px-5 py-3 text-muted-foreground">{row.count}</td>
                      <td className="px-5 py-3 font-semibold">{fmtRupees(row.total)}</td>
                      <td className="px-5 py-3 hidden sm:table-cell text-success">{row.approved}</td>
                      <td className="px-5 py-3 hidden sm:table-cell text-warning-foreground">{row.pending}</td>
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

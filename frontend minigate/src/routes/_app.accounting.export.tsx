import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Receipt, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
// @ts-ignore
import { accountantService } from "@/services/accountant.service.js";

export const Route = createFileRoute("/_app/accounting/export")({
  component: Page,
});

function Page() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const params = {
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  };

  const download = (fn: () => Promise<any>, filename: string) => {
    fn().then((r: any) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => toast.error(`Failed to export ${filename}`));
  };

  const exports = [
    {
      label: "Payments CSV",
      desc: "All payment records in CSV format",
      icon: FileSpreadsheet,
      color: "text-success",
      bg: "bg-success/10",
      onClick: () => download(() => accountantService.exportPaymentsCsv(params), "payments.csv"),
    },
    {
      label: "Payments PDF",
      desc: "Payment report in PDF format",
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10",
      onClick: () => download(() => accountantService.exportPaymentsPdf(params), "payments.pdf"),
    },
    {
      label: "Tally XML",
      desc: "Export for Tally accounting software",
      icon: Receipt,
      color: "text-sky-600",
      bg: "bg-sky-500/10",
      onClick: () => download(() => accountantService.exportTallyXml(params), "payments-tally.xml"),
    },
    {
      label: "Dues CSV",
      desc: "Pending dues in CSV format",
      icon: CreditCard,
      color: "text-warning-foreground",
      bg: "bg-warning/10",
      onClick: () => download(() => accountantService.exportDuesCsv(params), "dues.csv"),
    },
    {
      label: "Expenses CSV",
      desc: "Maintenance expenses in CSV format",
      icon: FileSpreadsheet,
      color: "text-destructive",
      bg: "bg-destructive/10",
      onClick: () => download(() => accountantService.exportExpensesCsv(params), "expenses.csv"),
    },
    {
      label: "Statements CSV",
      desc: "Monthly statements in CSV format",
      icon: FileText,
      color: "text-muted-foreground",
      bg: "bg-muted/30",
      onClick: () => download(() => accountantService.exportStatementsCsv(params), "statements.csv"),
    },
  ];

  return (
    <>
      <PageHeader
        title="Export Reports"
        description="Download financial data in various formats."
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">Date Range (optional)</h3>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exports.map(({ label, desc, icon: Icon, color, bg, onClick }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={onClick}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

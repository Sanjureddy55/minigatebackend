import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// @ts-ignore
import { accountantService } from "@/services/accountant.service.js";

export const Route = createFileRoute("/_app/accounting/receipts")({
  component: Page,
});

function fmtRupees(n: number | string) {
  return `₹${parseFloat(String(n ?? 0)).toLocaleString("en-IN")}`;
}

function Page() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["receipts", search],
    queryFn: () =>
      accountantService.getReceipts({ search: search || undefined, page_size: 50 }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const rows: any[] = data?.results ?? [];

  const downloadPdf = (id: number, receipt_number: string) => {
    accountantService.downloadReceiptPdf(id).then((r: any) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = `${receipt_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => toast.error("Failed to download"));
  };

  const downloadBulkCsv = () => {
    accountantService.downloadBulkCsv({ search: search || undefined }).then((r: any) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = "receipts.csv"; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => {});
  };

  return (
    <>
      <PageHeader
        title="Receipts"
        description="Download and manage payment receipts."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadBulkCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by flat, resident, receipt…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">All Receipts</span>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {data?.count ?? rows.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && rows.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No receipts found.</p>}

          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Receipt #</th>
                    <th className="px-5 py-2.5 text-left font-medium">Flat</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Resident</th>
                    <th className="px-5 py-2.5 text-left font-medium">Amount</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Method</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Date</th>
                    <th className="px-5 py-2.5 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any) => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{row.receipt_number}</td>
                      <td className="px-5 py-3 font-medium text-foreground">
                        {row.flat_number}
                        {row.building_name && <div className="text-xs text-muted-foreground">{row.building_name}</div>}
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">{row.resident_name || "—"}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{fmtRupees(row.amount)}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground capitalize">
                        {row.payment_method_display || "—"}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                        {row.payment_date ? new Date(row.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => downloadPdf(row.id, row.receipt_number)}
                          className="rounded-md p-1.5 hover:bg-muted"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
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

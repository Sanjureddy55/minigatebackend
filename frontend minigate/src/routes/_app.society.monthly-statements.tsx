import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/monthly-statements")({
  component: Page,
});

function fmt(v: number | string | undefined) {
  if (v === undefined || v === null) return "₹0";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function Page() {
  const societyId = useSelector((s: any) => s.auth?.legacyUser?.society_id);

  const { data, isLoading } = useQuery({
    queryKey: ["monthly-statements", societyId],
    queryFn: () => societyService.getStatements({ society: societyId }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const statements: any[] = data?.results ?? data ?? [];

  const downloadPdf = (id: number, label: string) => {
    societyService.downloadStatementPdf(id).then((r: any) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = `statement-${label}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => toast.error("Failed to download PDF"));
  };

  const downloadExcel = (id: number, label: string) => {
    societyService.exportStatementExcel(id).then((r: any) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = `statement-${label}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => toast.error("Failed to download Excel"));
  };

  return (
    <>
      <PageHeader
        title="Monthly Statements"
        description="View and export monthly maintenance fund statements."
      />

      <div className="space-y-4 p-4 md:p-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && statements.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No statements generated yet.
          </div>
        )}

        {statements.map((s: any) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {s.title || `${s.month_label} Statement`}
                </h3>
                {s.published_date && (
                  <p className="mt-0.5 text-xs text-muted-foreground">Published {s.published_date}</p>
                )}
                {!s.is_published && (
                  <p className="mt-0.5 text-xs text-muted-foreground">Draft — not yet published</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => downloadExcel(s.id, s.month_label || s.month)}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => downloadPdf(s.id, s.month_label || s.month)}>
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
              {[
                { label: "Opening Balance", value: s.opening_balance },
                { label: "Collected", value: s.total_collected },
                { label: "Expenses", value: s.total_expenses },
                { label: "Closing Balance", value: s.closing_balance },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold text-foreground mt-0.5">{fmt(value)}</p>
                </div>
              ))}
            </div>

            {s.summary && (
              <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">{s.summary}</p>
            )}

            {s.uploaded_proofs && s.uploaded_proofs.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-foreground mb-2">Proof Documents</p>
                <div className="flex flex-wrap gap-2">
                  {s.uploaded_proofs.map((doc: any) => (
                    <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                      {doc.original_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

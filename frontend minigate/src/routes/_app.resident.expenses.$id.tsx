import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/expenses/$id")({
  component: Page,
});

function fmt(v: number | string | undefined) {
  if (v === undefined || v === null) return "—";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function Page() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-transparency"],
    queryFn: () => residentService.getMaintenanceTransparency().then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const expense = (data?.published_expenses ?? []).find(
    (ex: any) => String(ex.id) === String(id),
  );

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (!expense) {
    return (
      <>
        <PageHeader title="Expense Details" description="Expense not found." />
        <div className="p-6 text-sm text-muted-foreground">
          This expense is not available. It may have been unpublished.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={expense.title}
        description="Maintenance expense proof and payment details."
      />

      <div className="grid gap-6 p-4 md:grid-cols-3 md:p-6">
        <div className="rounded-xl border border-border bg-card p-5 md:col-span-2 space-y-4">
          <h3 className="font-semibold text-foreground">Expense Information</h3>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Category</div>
              <div className="font-medium text-foreground mt-0.5">{expense.category_display || expense.category}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="font-medium text-foreground mt-0.5">{fmt(expense.amount)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Expense Date</div>
              <div className="font-medium text-foreground mt-0.5">{expense.expense_date || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Vendor</div>
              <div className="font-medium text-foreground mt-0.5">{expense.vendor_name || "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Proof Attachment</h3>
          {expense.proof_url ? (
            <>
              <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-foreground">Proof document</span>
              </div>
              <a href={expense.proof_url} target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-1.5">
                  <ExternalLink className="h-4 w-4" />
                  View Proof
                </Button>
              </a>
              <a href={expense.proof_url} download>
                <Button variant="outline" className="w-full gap-1.5">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No proof document attached.</p>
          )}
        </div>
      </div>
    </>
  );
}

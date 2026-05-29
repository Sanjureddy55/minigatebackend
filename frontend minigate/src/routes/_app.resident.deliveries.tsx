import { createFileRoute } from "@tanstack/react-router";
import { Package, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_app/resident/deliveries")({
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader
        title="Delivery Approval"
        description="Authorize incoming deliveries at the gate."
      />

      <div className="p-4 md:p-6 max-w-lg">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">Delivery Approvals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Incoming deliveries are verified by security at the gate.
              Real-time delivery notifications will appear here once enabled by your society admin.
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border p-3 flex items-start gap-2 text-left">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              To pre-authorize a delivery person, create a Guest Pass from the Visitors page.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

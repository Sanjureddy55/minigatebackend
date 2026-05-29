import { createFileRoute } from "@tanstack/react-router";
import { History, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_app/resident/history")({
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader
        title="Entry / Exit History"
        description="Your household's gate movement history."
      />

      <div className="p-4 md:p-6 max-w-lg">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <History className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">Gate History</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Entry and exit logs are recorded by security at the gate.
              Your gate movement history will appear here once the feature is enabled by your society admin.
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border p-3 flex items-start gap-2 text-left">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Gate entry logs are managed by the security system. Contact your society admin for access.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

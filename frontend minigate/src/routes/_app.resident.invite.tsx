import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/resident/invite")({
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader
        title="Invite Guest"
        description="Send a one-time gate pass to your guests."
      />

      <div className="p-4 md:p-6 max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <QrCode className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">Create a Guest Pass</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the Visitors page to create a guest pass. Your guest will receive a QR code
              that security can scan at the gate.
            </p>
          </div>
          <Link to="/resident/visitors">
            <Button className="gap-2 w-full">
              <UserPlus className="h-4 w-4" />
              Go to Visitors
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}

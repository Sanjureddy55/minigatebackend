import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/access/expired")({ component: Expired });

function Expired() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-lg font-semibold">Pass invalid or expired</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          This entry pass is no longer valid. Please contact your host to reissue a new pass.
        </p>
        <Link to="/access" className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Try a new code
        </Link>
      </div>
    </div>
  );
}

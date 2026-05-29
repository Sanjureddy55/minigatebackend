import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { QrCode, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/access/")({
  component: AccessHome,
  validateSearch: (s: Record<string, unknown>) => ({ code: (s.code as string) ?? "GW-2046-7821" }),
});

function AccessHome() {
  const { code } = useSearch({ from: "/access/" });
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/5 via-background to-accent p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          <QrCode className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-lg font-semibold">Greenwood Heights</h1>
        <p className="text-xs text-muted-foreground">Temporary entry pass</p>

        <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-6">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Passcode</div>
          <div className="mt-1 font-mono text-3xl font-semibold tracking-[0.3em]">{code}</div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Valid till 21:00
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link to="/access/qr" className="rounded-md border border-border bg-background p-3 text-xs hover:bg-muted/40">
            <QrCode className="mx-auto mb-1 h-4 w-4" /> Show QR
          </Link>
          <Link to="/access/status" className="rounded-md border border-border bg-background p-3 text-xs hover:bg-muted/40">
            <Clock className="mx-auto mb-1 h-4 w-4" /> Status
          </Link>
          <Link to="/access/expired" className="rounded-md border border-border bg-background p-3 text-xs hover:bg-muted/40">
            <XCircle className="mx-auto mb-1 h-4 w-4" /> Expired
          </Link>
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground">
          Show this pass to the security guard at the gate.
        </p>
      </div>
    </div>
  );
}

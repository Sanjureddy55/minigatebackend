import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, LogIn, LogOut } from "lucide-react";

export const Route = createFileRoute("/access/status")({ component: Status });

function Status() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-center text-lg font-semibold">Entry confirmed</h1>
        <p className="text-center text-xs text-muted-foreground">Welcome to Greenwood Heights</p>

        <div className="mt-5 space-y-3">
          <Row icon={<LogIn className="h-4 w-4 text-success" />} label="Checked in" value="10:24 AM · Gate 1" />
          <Row icon={<LogOut className="h-4 w-4 text-muted-foreground" />} label="Expected exit" value="By 21:00" />
        </div>

        <Link to="/access" className="mt-5 block text-center text-xs font-medium text-primary hover:underline">
          View pass
        </Link>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-muted">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

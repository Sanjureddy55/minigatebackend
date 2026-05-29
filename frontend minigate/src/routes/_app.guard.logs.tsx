import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList, LogIn, LogOut, Users, Download, ArrowRight, ArrowLeft, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { guardService } from "@/services/guard.service.js";

export const Route = createFileRoute("/_app/guard/logs")({
  component: Page,
});

// ── Direction icon ─────────────────────────────────────────────────────────────

function DirectionIcon({ status }: { status: string }) {
  if (status === "inside") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-success/10">
        <ArrowRight className="h-3.5 w-3.5 text-success" />
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-destructive/10">
        <X className="h-3.5 w-3.5 text-destructive" />
      </span>
    );
  }
  // exited / outside
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted">
      <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, color, bg }: {
  icon: React.ElementType; value: number; label: string; color: string; bg: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <div className={`text-2xl font-extrabold tracking-tight ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground font-medium mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Page() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: logData, isLoading } = useQuery({
    queryKey: ["entry-exit-log", search, statusFilter],
    queryFn: () =>
      guardService.getEntryExitLog({
        search: search || undefined,
        status: statusFilter || undefined,
        page_size: 50,
      }).then((r: any) => r.data),
    refetchInterval: 30_000,
  });

  const rows: any[] = logData?.results ?? [];
  const stats       = logData?.stats ?? { inside: 0, exited: 0, rejected: 0 };
  const totalCount  = logData?.count ?? rows.length;

  const handleExport = () => {
    const token = localStorage.getItem("access_token");
    const url = `/api/security-guard/gate-entry/log/export/`;
    const a = document.createElement("a");
    a.href = token ? `${url}?token=${token}` : url;
    a.download = "entry-exit-log.csv";
    a.click();
  };

  return (
    <>
      <PageHeader
        title="Entry / Exit Logs"
        description="Complete movement log for today's gate activity"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Users}   value={stats.inside}   label="Currently Inside" color="text-success"      bg="bg-success/10" />
          <StatCard icon={LogOut}  value={stats.exited}   label="Exited Today"     color="text-sky-600"      bg="bg-sky-50" />
          <StatCard icon={LogIn}   value={stats.rejected}  label="Rejected"         color="text-destructive"  bg="bg-destructive/10" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            className="flex-1 min-w-[200px]"
            placeholder="Search by name, flat, host…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="inside">Inside</SelectItem>
              <SelectItem value="exited">Exited</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">All Movements</span>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {totalCount}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No movements found.</p>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-4 py-3 text-left w-8"></th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Flat</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">In</th>
                    <th className="px-4 py-3 text-left">Out</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any, i: number) => {
                    const inTime  = row.checked_in_at
                      ? new Date(row.checked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "—";
                    const outTime = row.checked_out_at
                      ? new Date(row.checked_out_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "—";
                    return (
                      <tr key={row.id ?? i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <DirectionIcon status={row.status} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {row.visitor_name}
                          {row.mobile && (
                            <div className="text-xs text-muted-foreground font-normal mt-0.5">{row.mobile}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.flat_display || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-semibold capitalize">
                            {row.visit_type_display || row.visit_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">{inTime}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{outTime}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && (
            <div className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
              Showing {rows.length} of {totalCount} movements today
            </div>
          )}
        </div>
      </div>
    </>
  );
}

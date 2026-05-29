import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList, Download, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/audit")({
  component: Page,
});

function Page() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["society-audit", search],
    queryFn: () =>
      societyService.getAuditLogs({
        search: search || undefined,
        page_size: 50,
      }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const logs: any[] = data?.results ?? [];

  const handleExport = () => {
    societyService.exportAuditLogs().then((r: any) => {
      const url  = URL.createObjectURL(r.data);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "audit-logs.csv";
      a.click();
      URL.revokeObjectURL(url);
    }).catch(() => {});
  };

  return (
    <>
      <PageHeader
        title="Society Audit Logs"
        description="Action history within this society."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search actor, action, target…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">Audit Trail</span>
            </div>
            {data?.count != null && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                {data.count}
              </span>
            )}
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && logs.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No audit logs found.</p>
          )}

          {logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Actor</th>
                    <th className="px-5 py-2.5 text-left font-medium">Action</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Target</th>
                    <th className="px-5 py-2.5 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 text-foreground font-medium">
                        {log.actor_display || `${log.actor_role} · ${log.actor_name}`}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{log.action}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{log.target || "—"}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {log.time_ago || new Date(log.created_at).toLocaleString("en-IN")}
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

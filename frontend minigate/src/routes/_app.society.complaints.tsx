import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare, AlertTriangle, CheckCircle2, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/complaints")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const { data: statsData } = useQuery({
    queryKey: ["complaint-stats"],
    queryFn: () => societyService.getComplaintStats().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["complaints", search, statusFilter, priorityFilter],
    queryFn: () =>
      societyService.getComplaints({
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        page_size: 50,
      }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const rows: any[] = data?.results ?? [];
  const stats = statsData ?? { open: 0, in_progress: 0, resolved_30d: 0, high_priority: 0 };

  const kpis = [
    { label: "Open",          value: stats.open,         icon: MessageSquare,  color: "text-foreground",       bg: "bg-muted/30" },
    { label: "In Progress",   value: stats.in_progress,  icon: Clock,          color: "text-warning-foreground", bg: "bg-warning/10" },
    { label: "Resolved (30d)",value: stats.resolved_30d, icon: CheckCircle2,   color: "text-success",           bg: "bg-success/10" },
    { label: "High Priority", value: stats.high_priority, icon: AlertTriangle, color: "text-destructive",       bg: "bg-destructive/10" },
  ];

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => societyService.updateComplaint(id, data),
    onSuccess: () => {
      toast.success("Complaint updated");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      qc.invalidateQueries({ queryKey: ["complaint-stats"] });
    },
    onError: () => toast.error("Failed to update"),
  });

  return (
    <>
      <PageHeader
        title="Complaints"
        description="Track and resolve resident complaints."
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by title, flat, resident…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">All Complaints</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {data?.count ?? rows.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && rows.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No complaints found.</p>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">ID</th>
                    <th className="px-5 py-2.5 text-left font-medium">Issue</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Flat</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Resident</th>
                    <th className="px-5 py-2.5 text-left font-medium">Priority</th>
                    <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any) => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {row.complaint_number}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">{row.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{row.raised_display}</div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">{row.flat_display}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{row.resident_name || "—"}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={row.priority} />
                      </td>
                      <td className="px-5 py-3">
                        <Select
                          value={row.status}
                          onValueChange={v => updateMut.mutate({ id: row.id, data: { status: v } })}
                        >
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
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

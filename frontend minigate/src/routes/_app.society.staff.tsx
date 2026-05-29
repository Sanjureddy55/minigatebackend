import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Shield, Sparkles, Wrench, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/staff")({
  component: Page,
});

function Page() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { data: kpiData } = useQuery({
    queryKey: ["staff-kpi"],
    queryFn: () => societyService.getStaffGuards({ stats: true }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["staff", search, roleFilter],
    queryFn: () =>
      societyService.getStaffGuards({
        search: search || undefined,
        role: roleFilter || undefined,
        page_size: 50,
      }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const staff: any[] = data?.results ?? data ?? [];
  const kpi = kpiData ?? {};

  const kpis = [
    { label: "Total Staff",  value: kpi.total_staff  ?? staff.length, icon: Users,    color: "text-foreground",   bg: "bg-muted/30" },
    { label: "Guards",       value: kpi.guards       ?? 0,            icon: Shield,   color: "text-primary",      bg: "bg-primary/10" },
    { label: "Housekeeping", value: kpi.housekeeping ?? 0,            icon: Sparkles, color: "text-sky-600",      bg: "bg-sky-500/10" },
    { label: "Maintenance",  value: kpi.maintenance  ?? 0,            icon: Wrench,   color: "text-warning-foreground", bg: "bg-warning/10" },
  ];

  return (
    <>
      <PageHeader
        title="Staff & Guard Management"
        description="Roster of guards, housekeeping and on-site staff."
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
              placeholder="Search by name, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Roles</SelectItem>
              <SelectItem value="security_guard">Security Guard</SelectItem>
              <SelectItem value="housekeeping">Housekeeping</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">All Staff</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {data?.count ?? staff.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && staff.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No staff found.</p>
          )}

          {staff.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Name</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Role</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Shift</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Phone</th>
                    <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s: any) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">{s.full_name}</td>
                      <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground capitalize">
                        {s.role_display || s.role}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                        {s.shift_display || s.shift || "—"}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{s.phone || "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
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

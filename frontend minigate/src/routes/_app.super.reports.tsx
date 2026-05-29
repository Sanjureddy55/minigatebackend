import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Building, Users, MessageSquare, TrendingUp, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { platformService } from "@/services/platform.service.js";

export const Route = createFileRoute("/_app/super/reports")({
  component: Page,
});

function KpiCard({ icon: Icon, label, value, sub, color = "text-primary" }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-foreground">{value ?? "—"}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function Page() {
  const [period, setPeriod] = useState("30d");

  const { data: overviewData, isLoading: ovLoading } = useQuery({
    queryKey: ["reports-overview", period],
    queryFn: () => platformService.getReportsOverview({ period }).then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const { data: revData, isLoading: revLoading } = useQuery({
    queryKey: ["reports-revenue", period],
    queryFn: () => platformService.getRevenueReport({ period }).then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const { data: cmpData } = useQuery({
    queryKey: ["reports-complaints", period],
    queryFn: () => platformService.getComplaintsReport({ period }).then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const ov = overviewData ?? {};
  const rev = revData ?? {};
  const cmp = cmpData ?? {};

  const loading = ovLoading || revLoading;

  return (
    <>
      <PageHeader
        title="Global Reports"
        description="Cross-tenant analytics and platform usage."
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard icon={Building} label="Total Societies" value={ov.total_societies}
            sub={`${ov.active_societies ?? 0} active · ${ov.new_societies ?? 0} new this period`} />
          <KpiCard icon={Users} label="Total Users" value={ov.total_users}
            sub={`${ov.active_users ?? 0} active · ${ov.new_users ?? 0} new`}
            color="text-sky-600" />
          <KpiCard icon={IndianRupee} label="MRR" value={ov.mrr ? `₹${Number(ov.mrr).toLocaleString("en-IN")}` : "—"}
            sub={`${period} revenue`} color="text-success" />
          <KpiCard icon={MessageSquare} label="Complaints" value={ov.total_complaints}
            sub={`${ov.open_complaints ?? 0} open · ${ov.resolved_complaints ?? 0} resolved`}
            color="text-warning-foreground" />
          <KpiCard icon={TrendingUp} label="Resolution Rate" value={ov.resolution_rate != null ? `${ov.resolution_rate}%` : "—"}
            sub="Complaints resolved" color="text-success" />
          <KpiCard icon={Users} label="Total Visitors" value={ov.total_visitors}
            sub={`in last ${period}`} color="text-violet-600" />
        </div>

        {cmp && Object.keys(cmp).length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Complaint Breakdown
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Open", value: cmp.open_count, color: "text-destructive" },
                { label: "In Progress", value: cmp.in_progress, color: "text-warning-foreground" },
                { label: "Resolved", value: cmp.resolved, color: "text-success" },
                { label: "High Priority", value: cmp.high_priority, color: "text-destructive" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg bg-muted/30 border border-border p-3 text-center">
                  <div className={`text-2xl font-extrabold ${color}`}>{value ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {rev && Object.keys(rev).length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-success" /> Revenue Summary
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "MRR", value: rev.mrr ? `₹${Number(rev.mrr).toLocaleString("en-IN")}` : "—" },
                { label: "Total Revenue", value: rev.total_revenue ? `₹${Number(rev.total_revenue).toLocaleString("en-IN")}` : "—" },
                { label: "Avg / Society", value: rev.avg_revenue_per_society ? `₹${Number(rev.avg_revenue_per_society).toLocaleString("en-IN")}` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted/30 border border-border p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-xl font-extrabold text-foreground mt-1">{value}</div>
                </div>
              ))}
            </div>
            {rev.by_plan && rev.by_plan.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden mt-3">
                <div className="border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">Revenue by Plan</div>
                {rev.by_plan.map((p: any) => (
                  <div key={p.label} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
                    <span className="capitalize text-foreground">{p.label}</span>
                    <span className="text-muted-foreground">{p.count} societies · {p.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {ov.top_societies && ov.top_societies.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">Top Societies</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Society</th>
                  <th className="px-5 py-2.5 text-left font-medium">Users</th>
                  <th className="px-5 py-2.5 text-left font-medium">Flats</th>
                </tr>
              </thead>
              <tbody>
                {ov.top_societies.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">{s.name || s.label}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.user_count ?? s.count ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.total_flats ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

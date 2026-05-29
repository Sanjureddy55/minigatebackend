import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Calendar, HandCoins, Megaphone, DollarSign, MessageSquare, Users, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/dashboard")({
  component: Page,
});

function fmtRupees(amount: number | string | undefined) {
  const n = parseFloat(String(amount ?? 0));
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const NOTICE_ICONS: Record<string, React.ElementType> = {
  notice:      Megaphone,
  event:       Calendar,
  fundraiser:  HandCoins,
};

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["resident-dashboard"],
    queryFn: () => residentService.getDashboard().then((r: any) => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const kpis = data
    ? [
        { label: "Pending Bills",      value: fmtRupees(data.pending_bills),    icon: DollarSign,    color: "text-warning-foreground", bg: "bg-warning/10" },
        { label: "Maintenance Paid",   value: fmtRupees(data.maintenance_paid), icon: FileText,      color: "text-success",            bg: "bg-success/10" },
        { label: "Society Fund Used",  value: fmtRupees(data.society_fund_used), icon: Users,        color: "text-primary",            bg: "bg-primary/10" },
        { label: "Open Complaints",    value: data.open_complaints ?? 0,        icon: MessageSquare, color: "text-destructive",        bg: "bg-destructive/10" },
      ]
    : [];

  const notices: any[] = data?.recent_notices ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="My Dashboard"
        description="Welcome home. Here's your daily summary."
      />

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <div className={`text-xl font-extrabold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {notices.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Notices</h3>
          {notices.map((notice: any, i: number) => {
            const Icon = NOTICE_ICONS[notice.notice_type] ?? Bell;
            return (
              <Link
                key={notice.id ?? i}
                to="/resident/notices"
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{notice.title}</div>
                    {notice.body && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notice.body}</p>
                    )}
                  </div>
                  {notice.time_ago && (
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">{notice.time_ago}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!isLoading && notices.length === 0 && (
        <div className="py-12 text-center">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No recent notices from your society admin.</p>
        </div>
      )}
    </div>
  );
}

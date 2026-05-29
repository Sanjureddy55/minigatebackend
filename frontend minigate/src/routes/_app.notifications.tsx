import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, CheckCheck, Info, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { notifications as initial } from "@/lib/mock-data";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

const iconMap = { info: Info, warning: AlertTriangle, alert: ShieldAlert, success: CheckCircle2 };
const toneMap = {
  info: "text-info bg-info/10",
  warning: "text-warning-foreground bg-warning/15",
  alert: "text-destructive bg-destructive/10",
  success: "text-success bg-success/10",
};

function NotificationsPage() {
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState("all");

  const filtered = list.filter(n => tab === "all" || (tab === "unread" && !n.read));
  const markAll = () => setList(l => l.map(n => ({ ...n, read: true })));
  const markOne = (id: string) => setList(l => l.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Activity feed, alerts and audit trail"
        actions={<Button variant="outline" size="sm" className="gap-1.5" onClick={markAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      />
      <div className="p-6 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({list.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({list.filter(n=>!n.read).length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">You're all caught up.</p>
            </div>
          ) : filtered.map(n => {
            const Icon = iconMap[n.type];
            return (
              <div key={n.id} onClick={()=>markOne(n.id)} className="flex gap-3 p-4 hover:bg-muted/30 cursor-pointer">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${toneMap[n.type]}`}><Icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

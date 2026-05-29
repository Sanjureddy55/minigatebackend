import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ShieldAlert, AlertTriangle, CheckCircle2, Bell, Phone, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { guardService } from "@/services/guard.service.js";

export const Route = createFileRoute("/_app/guard/alerts")({
  component: Page,
});

// ── Alert type → severity colour map ─────────────────────────────────────────

const SEVERITY: Record<string, { color: string; bg: string; border: string; bar: string; label: string }> = {
  sos:      { color: "text-destructive",        bg: "bg-destructive/10", border: "border-destructive/30",  bar: "bg-destructive",       label: "HIGH" },
  fire:     { color: "text-destructive",        bg: "bg-destructive/10", border: "border-destructive/30",  bar: "bg-destructive",       label: "HIGH" },
  medical:  { color: "text-orange-600",         bg: "bg-orange-500/10",  border: "border-orange-400/30",   bar: "bg-orange-500",        label: "MEDIUM" },
  intruder: { color: "text-destructive",        bg: "bg-destructive/10", border: "border-destructive/30",  bar: "bg-destructive",       label: "HIGH" },
  theft:    { color: "text-orange-600",         bg: "bg-orange-500/10",  border: "border-orange-400/30",   bar: "bg-orange-500",        label: "MEDIUM" },
  other:    { color: "text-muted-foreground",   bg: "bg-muted/30",       border: "border-border",          bar: "bg-muted-foreground",  label: "LOW" },
};

function sev(alertType: string) {
  return SEVERITY[alertType] ?? SEVERITY.other;
}

// ── Initials avatar ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500",
  "bg-amber-500",  "bg-rose-500", "bg-indigo-500",
];

function Avatar({ name }: { name: string }) {
  const initials = (name || "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const color = AVATAR_COLORS[(initials.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────

function AlertCard({ alert, onAcknowledge, loading }: {
  alert: any; onAcknowledge: () => void; loading: boolean;
}) {
  const s = sev(alert.alert_type);

  return (
    <div className={`rounded-xl border ${s.border} bg-card p-4 space-y-3`}>
      <div className="flex items-start gap-3">
        <div className={`w-1.5 rounded-full self-stretch min-h-[48px] ${s.bar}`} />
        <div className="flex-1 min-w-0">
          {/* Severity + type badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full border ${s.border} ${s.bg} px-2 py-0.5 text-[10px] font-extrabold tracking-wider ${s.color}`}>
              {s.label}
            </span>
            <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {alert.alert_type_display || alert.alert_type}
            </span>
          </div>

          {/* Description */}
          <p className="mt-1.5 text-sm font-medium text-foreground leading-snug">
            {alert.description || "No description provided."}
          </p>

          {/* Gate / location + time */}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {(alert.location || alert.gate) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {alert.location || alert.gate}
              </span>
            )}
            <span>{alert.time_ago || new Date(alert.raised_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>

      {/* Raised by — avatar + name + phone */}
      {alert.raised_by_name && (
        <div className="flex items-center gap-2">
          <Avatar name={alert.raised_by_name} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">{alert.raised_by_name}</div>
            {alert.raised_by_mobile && (
              <div className="text-[11px] text-muted-foreground">{alert.raised_by_mobile}</div>
            )}
          </div>
          {alert.raised_by_mobile && (
            <a
              href={`tel:${alert.raised_by_mobile}`}
              className="inline-flex items-center gap-1 rounded-full border border-sky-300/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-500/20 transition-colors flex-shrink-0"
            >
              <Phone className="h-3 w-3" /> Call
            </a>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {alert.status === "active" && (
          <button
            onClick={onAcknowledge}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning-foreground hover:bg-warning/20 transition-colors disabled:opacity-50"
          >
            <AlertTriangle className="h-3 w-3" /> Acknowledge
          </button>
        )}
        {alert.status === "acknowledged" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" /> Acknowledged
          </span>
        )}
        {alert.status === "resolved" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
            Resolved
          </span>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ALERT_TYPES = [
  { value: "sos",      label: "SOS / Emergency" },
  { value: "fire",     label: "Fire" },
  { value: "medical",  label: "Medical" },
  { value: "intruder", label: "Intruder" },
  { value: "theft",    label: "Theft" },
  { value: "other",    label: "Other" },
];

function Page() {
  const qc = useQueryClient();
  const [tab, setTab]           = useState<"all" | "active" | "acknowledged">("all");
  const [showForm, setShowForm] = useState(false);
  const [alertType, setAlertType] = useState("sos");
  const [desc, setDesc]         = useState("");
  const [location, setLocation] = useState("");

  const { data: statsData } = useQuery({
    queryKey: ["alert-stats"],
    queryFn: () => guardService.getAlertStats().then((r: any) => r.data.data ?? r.data),
    refetchInterval: 30_000,
  });

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ["alerts", tab],
    queryFn: () =>
      guardService.getAlerts({
        status: tab === "all" ? undefined : tab,
        page_size: 50,
      }).then((r: any) => r.data.results ?? []),
    refetchInterval: 30_000,
  });

  const ack = useMutation({
    mutationFn: (id: number) => guardService.acknowledgeAlert(id),
    onSuccess: () => {
      toast.success("Alert acknowledged");
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alert-stats"] });
    },
    onError: () => toast.error("Action failed"),
  });

  const ackAll = useMutation({
    mutationFn: () => guardService.acknowledgeAllAlerts(),
    onSuccess: (res: any) => {
      toast.success(res.data.message ?? "All alerts acknowledged");
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alert-stats"] });
    },
    onError: () => toast.error("Failed to acknowledge all"),
  });

  const create = useMutation({
    mutationFn: (data: any) => guardService.createAlert(data),
    onSuccess: () => {
      toast.success("Alert raised");
      setShowForm(false);
      setDesc("");
      setAlertType("sos");
      setLocation("");
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alert-stats"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? "Failed to raise alert"),
  });

  const alerts: any[] = alertsData ?? [];
  const stats  = statsData ?? { active: 0, acknowledged: 0, total: 0 };
  const hasActive = (stats.active ?? 0) > 0;

  const TABS: { key: "all" | "active" | "acknowledged"; label: string }[] = [
    { key: "all",          label: `All ${stats.total ?? ""}` },
    { key: "active",       label: `Active ${stats.active ?? ""}` },
    { key: "acknowledged", label: `Acknowledged ${stats.acknowledged ?? ""}` },
  ];

  return (
    <>
      <PageHeader
        title="Emergency Alerts"
        description="Live SOS and security alerts from residents and guards"
        actions={
          <div className="flex gap-2">
            {hasActive && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={ackAll.isPending}
                onClick={() => ackAll.mutate()}
              >
                <CheckCircle2 className="h-4 w-4" />
                {ackAll.isPending ? "Acknowledging…" : "Acknowledge All"}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => setShowForm((v) => !v)}
            >
              <ShieldAlert className="h-4 w-4" />
              {showForm ? "Cancel" : "Raise Alert"}
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active",       value: stats.active       ?? 0, color: "text-destructive",      bg: "bg-destructive/10",  icon: ShieldAlert },
            { label: "Acknowledged", value: stats.acknowledged ?? 0, color: "text-orange-600",       bg: "bg-orange-500/10",   icon: AlertTriangle },
            { label: "Total Today",  value: stats.total        ?? 0, color: "text-foreground",        bg: "bg-muted/30",        icon: Bell },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <div className={`text-2xl font-extrabold tracking-tight ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Raise Alert form */}
        {showForm && (
          <div className="rounded-xl border border-destructive/30 bg-card p-5 space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" /> Raise Emergency Alert
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Alert Type *</label>
                <Select value={alertType} onValueChange={setAlertType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALERT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Gate / Location</label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  placeholder="e.g. Gate 1 Main"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Description *</label>
              <Textarea
                placeholder="Describe the emergency situation…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="gap-1.5"
              variant="destructive"
              disabled={!desc.trim() || create.isPending}
              onClick={() => create.mutate({ alert_type: alertType, description: desc, location: location || undefined })}
            >
              <ShieldAlert className="h-4 w-4" />
              {create.isPending ? "Raising…" : "Raise Alert"}
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                tab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Alert cards */}
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && alerts.length === 0 && (
          <div className="py-16 text-center">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3" />
            <p className="font-medium text-foreground">No alerts</p>
            <p className="text-sm text-muted-foreground mt-1">Everything looks calm.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.map((alert: any) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={() => ack.mutate(alert.id)}
              loading={ack.isPending}
            />
          ))}
        </div>
      </div>
    </>
  );
}

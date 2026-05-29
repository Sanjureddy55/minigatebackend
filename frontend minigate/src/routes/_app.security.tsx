import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, ShieldCheck, DoorOpen, Camera, AlertTriangle, Activity,
  Check, CheckCircle2, Plus, X, Lock, Unlock, Calendar, Users, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/security")({
  component: SecurityPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ALERT_COLORS: Record<string, { bar: string; icon: string; bg: string }> = {
  unauthorized_vehicle: { bar: "bg-rose-500",   icon: "text-rose-500",   bg: "bg-rose-50/60 dark:bg-rose-950/20" },
  intrusion:            { bar: "bg-rose-600",   icon: "text-rose-600",   bg: "bg-rose-50/60 dark:bg-rose-950/20" },
  fire:                 { bar: "bg-rose-600",   icon: "text-rose-600",   bg: "bg-rose-50/60 dark:bg-rose-950/20" },
  medical:              { bar: "bg-amber-500",  icon: "text-amber-500",  bg: "bg-amber-50/60 dark:bg-amber-950/20" },
  suspicious_activity:  { bar: "bg-amber-400",  icon: "text-amber-500",  bg: "bg-amber-50/40 dark:bg-amber-950/10" },
  other:                { bar: "bg-border",      icon: "text-muted-foreground", bg: "" },
};
function alertColor(type: string) {
  return ALERT_COLORS[type] ?? ALERT_COLORS.other;
}

function initials(name: string) {
  return (name || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const AV_COLORS = [
  "bg-teal-500", "bg-sky-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-indigo-500",
];
function avatarColor(name: string) {
  return AV_COLORS[(initials(name).charCodeAt(0) ?? 0) % AV_COLORS.length];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, value, label, iconBg, iconColor, valueColor,
}: {
  icon: React.ElementType; value: string | number;
  label: string; iconBg: string; iconColor: string; valueColor: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className={cn("mb-4 h-10 w-10 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className={cn("text-3xl font-extrabold tracking-tight", valueColor)}>{value}</div>
      <div className="mt-1 text-sm font-medium text-muted-foreground">{label}</div>
    </motion.div>
  );
}

// ─── Raise Alert Modal ────────────────────────────────────────────────────────

const ALERT_TYPES = [
  { value: "unauthorized_vehicle", label: "Unauthorized Vehicle" },
  { value: "intrusion",            label: "Intrusion" },
  { value: "fire",                 label: "Fire" },
  { value: "medical",              label: "Medical Emergency" },
  { value: "suspicious_activity",  label: "Suspicious Activity" },
  { value: "other",                label: "Other" },
];

function RaiseAlertModal({
  onClose, gates,
}: { onClose: () => void; gates: any[] }) {
  const qc = useQueryClient();
  const [alertType, setAlertType] = useState("unauthorized_vehicle");
  const [description, setDescription] = useState("");
  const [gate, setGate] = useState("");

  const mut = useMutation({
    mutationFn: (d: any) => societyService.createAlert(d),
    onSuccess: () => {
      toast.success("Alert raised");
      qc.invalidateQueries({ queryKey: ["sec-dashboard"] });
      qc.invalidateQueries({ queryKey: ["sec-alerts"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="font-bold text-sm text-foreground">Raise Emergency Alert</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Alert Type *</label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALERT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Gate / Location</label>
            <Select value={gate} onValueChange={setGate}>
              <SelectTrigger><SelectValue placeholder="Select gate (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {gates.map((g: any) => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Description *</label>
            <Textarea
              rows={3}
              placeholder="Describe the emergency…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              variant="destructive" className="flex-1 gap-1.5"
              disabled={!description.trim() || mut.isPending}
              onClick={() => mut.mutate({ alert_type: alertType, description, gate: gate || undefined })}
            >
              <ShieldAlert className="h-4 w-4" />
              {mut.isPending ? "Raising…" : "Raise Alert"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Create Gate Modal ────────────────────────────────────────────────────────

function CreateGateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("closed");

  const mut = useMutation({
    mutationFn: (d: any) => societyService.createGate(d),
    onSuccess: () => {
      toast.success("Gate created");
      qc.invalidateQueries({ queryKey: ["sec-gates"] });
      qc.invalidateQueries({ queryKey: ["sec-dashboard"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm text-foreground">Add New Gate</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Gate Name *</label>
            <Input placeholder="e.g. Gate 3 (Side Entry)" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 gap-1.5"
              disabled={!name.trim() || mut.isPending}
              onClick={() => mut.mutate({ name, status })}
            >
              <Plus className="h-4 w-4" />
              {mut.isPending ? "Creating…" : "Create Gate"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Schedule Shift Modal ─────────────────────────────────────────────────────

function ScheduleShiftModal({
  onClose, guards, gates,
}: { onClose: () => void; guards: any[]; gates: any[] }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [guardId, setGuardId]   = useState("");
  const [date, setDate]         = useState(today);
  const [start, setStart]       = useState("06:00:00");
  const [end, setEnd]           = useState("14:00:00");
  const [gateAssigned, setGateA] = useState("");
  const [shiftStatus, setSS]    = useState("scheduled");

  const mut = useMutation({
    mutationFn: (d: any) => societyService.scheduleShift(d),
    onSuccess: () => {
      toast.success("Shift scheduled");
      qc.invalidateQueries({ queryKey: ["sec-roster"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm text-foreground">Schedule Guard Shift</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Guard *</label>
            <Select value={guardId} onValueChange={setGuardId}>
              <SelectTrigger><SelectValue placeholder="Select guard" /></SelectTrigger>
              <SelectContent>
                {guards.map((g: any) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.full_name || g.name || `Guard #${g.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Shift Date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Start</label>
              <Input type="time" value={start.slice(0, 5)} onChange={(e) => setStart(e.target.value + ":00")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">End</label>
              <Input type="time" value={end.slice(0, 5)} onChange={(e) => setEnd(e.target.value + ":00")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Gate Assigned</label>
            <Select value={gateAssigned} onValueChange={setGateA}>
              <SelectTrigger><SelectValue placeholder="Select gate (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {gates.map((g: any) => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Status</label>
            <Select value={shiftStatus} onValueChange={setSS}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 gap-1.5"
              disabled={!guardId || !date || mut.isPending}
              onClick={() => mut.mutate({
                guard: Number(guardId), shift_date: date,
                start_time: start, end_time: end,
                gate_assigned: gateAssigned || undefined,
                status: shiftStatus,
              })}
            >
              <Calendar className="h-4 w-4" />
              {mut.isPending ? "Scheduling…" : "Schedule Shift"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page — matches screenshot design exactly
// ─────────────────────────────────────────────────────────────────────────────

const GUARD_CHIP_COLORS = [
  "bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-900/20 dark:text-teal-300",
  "bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-900/20 dark:text-sky-300",
  "bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-900/20 dark:text-violet-300",
  "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300",
];

function SecurityPage() {
  const qc = useQueryClient();
  const [showRaise, setShowRaise]   = useState(false);
  const [showGate, setShowGate]     = useState(false);
  const [showShift, setShowShift]   = useState(false);
  const [rosterDate, setRosterDate] = useState(new Date().toISOString().slice(0, 10));

  // ── Data queries ──────────────────────────────────────────────────────────

  const { data: dash } = useQuery({
    queryKey: ["sec-dashboard"],
    queryFn: () =>
      societyService.getSecurityDashboard()
        .then((r: any) => r.data),
    refetchInterval: 30_000,
  });

  const { data: gatesRaw } = useQuery({
    queryKey: ["sec-gates"],
    queryFn: () =>
      societyService.getGates({})
        .then((r: any) => r.data.results ?? r.data ?? []),
    refetchInterval: 60_000,
  });

  const { data: rosterRaw, isLoading: rosterLoading } = useQuery({
    queryKey: ["sec-roster", rosterDate],
    queryFn: () =>
      societyService.getGuardRoster({ date: rosterDate })
        .then((r: any) => r.data.results ?? []),
    refetchInterval: 60_000,
  });

  const { data: staffRaw } = useQuery({
    queryKey: ["staff-for-schedule"],
    queryFn: () =>
      societyService.getStaffGuards({ role: "guard", page_size: 100 })
        .then((r: any) => r.data.results ?? []),
    staleTime: 120_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const openGate = useMutation({
    mutationFn: (id: number) => societyService.openGate(id),
    onSuccess: () => {
      toast.success("Gate opened");
      qc.invalidateQueries({ queryKey: ["sec-gates"] });
      qc.invalidateQueries({ queryKey: ["sec-dashboard"] });
    },
    onError: () => toast.error("Failed to open gate"),
  });

  const closeGate = useMutation({
    mutationFn: (id: number) => societyService.closeGate(id),
    onSuccess: () => {
      toast.success("Gate closed");
      qc.invalidateQueries({ queryKey: ["sec-gates"] });
      qc.invalidateQueries({ queryKey: ["sec-dashboard"] });
    },
    onError: () => toast.error("Failed to close gate"),
  });

  const ackAlert = useMutation({
    mutationFn: (id: number) => societyService.acknowledgeAlert(id),
    onSuccess: () => {
      toast.success("Alert acknowledged");
      qc.invalidateQueries({ queryKey: ["sec-dashboard"] });
      qc.invalidateQueries({ queryKey: ["sec-alerts"] });
    },
    onError: () => toast.error("Failed"),
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const kpi = dash?.data ?? {};
  const liveLog: any[]  = dash?.live_entry_log ?? [];
  const activeAlerts: any[] = kpi.active_alert_list ?? [];
  const gates: any[]    = gatesRaw ?? [];
  const roster: any[]   = rosterRaw ?? [];
  const guards: any[]   = staffRaw ?? [];

  const openCount  = kpi.open_gates      ?? 0;
  const totalGates = kpi.total_gates     ?? gates.length;
  const onDuty     = kpi.guards_on_duty  ?? 0;
  const totalG     = kpi.total_guards    ?? roster.length;
  const alertCount = kpi.active_alerts   ?? activeAlerts.length;
  const eventsToday = kpi.events_today   ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-muted/20">
      <PageHeader
        title="Security Operations"
        description="Live gate operations, alerts and emergency workflows"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Camera className="h-4 w-4" /> CCTV Live
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-rose-500 hover:bg-rose-600 text-white"
              onClick={() => setShowRaise(true)}
            >
              <AlertTriangle className="h-4 w-4" /> Raise Emergency
            </Button>
          </>
        }
      />

      <div className="p-6 lg:p-8 space-y-6">

        {/* ── KPI Tiles ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={DoorOpen} label="Open Gates" value={`${openCount} / ${totalGates}`}
            iconBg="bg-sky-50 dark:bg-sky-900/20"
            iconColor="text-sky-600 dark:text-sky-400"
            valueColor="text-sky-700 dark:text-sky-400"
          />
          <KpiCard
            icon={ShieldCheck} label="Guards on Duty" value={`${onDuty} / ${totalG}`}
            iconBg="bg-teal-50 dark:bg-teal-900/20"
            iconColor="text-teal-600 dark:text-teal-400"
            valueColor="text-teal-700 dark:text-teal-400"
          />
          <KpiCard
            icon={ShieldAlert} label="Active Alerts" value={alertCount}
            iconBg="bg-rose-50 dark:bg-rose-900/20"
            iconColor="text-rose-500 dark:text-rose-400"
            valueColor={alertCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}
          />
          <KpiCard
            icon={Activity} label="Events Today" value={eventsToday}
            iconBg="bg-violet-50 dark:bg-violet-900/20"
            iconColor="text-violet-600 dark:text-violet-400"
            valueColor="text-foreground"
          />
        </div>

        {/* ── Main 2-col grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Live entry / exit log ── */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="text-sm font-bold text-foreground">Live entry / exit log</span>
              <span className="flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="divide-y divide-border/60 max-h-[480px] overflow-y-auto">
              {liveLog.length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">No live entries.</p>
              )}
              {liveLog.map((entry: any) => {
                const inits = initials(entry.full_name);
                const ac = avatarColor(entry.full_name);
                const isIn      = entry.status === "inside";
                const isPending = entry.status === "pending";
                const statusLabel = isIn ? "Checked In" : isPending ? "Pending" : "Checked Out";
                const statusCls = isIn
                  ? "bg-teal-500/10 text-teal-700 border border-teal-500/25 dark:text-teal-400"
                  : isPending
                  ? "bg-amber-500/10 text-amber-700 border border-amber-500/25 dark:text-amber-400"
                  : "bg-muted text-muted-foreground border border-border";
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0", ac)}>
                      {inits}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {entry.full_name}
                        <span className="ml-1.5 font-normal text-muted-foreground">to {entry.flat_number}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.visit_type} · {entry.building_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-mono text-muted-foreground">{fmtTime(entry.checked_in_at)}</span>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusCls)}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-5">

            {/* Active alerts */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="text-sm font-bold text-foreground">Active alerts</span>
                {alertCount > 0 && (
                  <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-600">
                    {alertCount}
                  </span>
                )}
              </div>
              <div className="divide-y divide-border/60">
                {activeAlerts.length === 0 && (
                  <div className="px-5 py-8 text-center">
                    <CheckCircle2 className="h-7 w-7 text-success/60 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No active alerts.</p>
                  </div>
                )}
                {activeAlerts.map((a: any) => {
                  const c = alertColor(a.alert_type);
                  return (
                    <div key={a.id} className={cn("p-4 border-l-[3px]", c.bg)} style={{ borderLeftColor: "" }}>
                      <div className={cn("w-1 hidden")} />
                      <div className="flex items-start gap-2.5">
                        <div className={cn("mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center", c.icon, "border-current")}>
                          <ShieldAlert className="h-2.5 w-2.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug">{a.description}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {a.gate && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.gate}</span>}
                            <span>{a.time_ago}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={ackAlert.isPending}
                          onClick={() => ackAlert.mutate(a.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground/80 hover:border-primary/30 hover:text-primary transition-all shadow-sm disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" /> Acknowledge
                        </button>
                        <button className="px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="px-5 py-3 border-t border-border">
                  <button
                    onClick={() => setShowRaise(true)}
                    className="text-xs font-semibold text-destructive hover:underline"
                  >
                    + Raise new alert
                  </button>
                </div>
              </div>
            </div>

            {/* Guard roster */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="text-sm font-bold text-foreground">Guard roster</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    className="h-7 text-xs px-2 w-32"
                    value={rosterDate}
                    onChange={(e) => setRosterDate(e.target.value)}
                  />
                  <button
                    onClick={() => setShowShift(true)}
                    className="h-7 w-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                    title="Schedule shift"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {rosterLoading && (
                  <p className="px-5 py-6 text-sm text-muted-foreground">Loading…</p>
                )}
                {!rosterLoading && roster.length === 0 && (
                  <div className="px-5 py-8 text-center">
                    <Users className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No shifts scheduled.</p>
                    <button
                      onClick={() => setShowShift(true)}
                      className="mt-1.5 text-xs font-semibold text-primary"
                    >
                      + Schedule shift
                    </button>
                  </div>
                )}
                {roster.map((r: any, i: number) => {
                  const name = r.guard_name ?? `Guard #${r.guard}`;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0", GUARD_CHIP_COLORS[i % GUARD_CHIP_COLORS.length])}>
                        {initials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.gate_assigned || "Patrol"} · {r.shift_time}
                        </div>
                      </div>
                      <span className={cn(
                        "flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        r.on_duty
                          ? "bg-teal-500/10 text-teal-700 border border-teal-500/25 dark:text-teal-400"
                          : "bg-muted text-muted-foreground border border-border",
                      )}>
                        {r.duty_label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Gate Management ── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">Gate Management</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                {gates.length}
              </span>
            </div>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setShowGate(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Gate
            </Button>
          </div>
          {gates.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No gates configured yet.</p>
          )}
          <div className={cn(
            "grid",
            gates.length > 0 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "",
          )}>
            {gates.map((gate: any) => {
              const isOpen  = gate.status === "open";
              const isMaint = gate.status === "maintenance";
              return (
                <div key={gate.id} className="flex items-center gap-3 px-5 py-4 border-b border-r border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                    isOpen ? "bg-teal-500/10" : isMaint ? "bg-amber-500/10" : "bg-muted/60",
                  )}>
                    {isOpen
                      ? <Unlock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      : isMaint
                      ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                      : <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{gate.name}</div>
                    <div className={cn(
                      "text-xs font-semibold mt-0.5",
                      isOpen ? "text-teal-600 dark:text-teal-400" : isMaint ? "text-amber-500" : "text-muted-foreground",
                    )}>
                      {gate.status_display}
                    </div>
                  </div>
                  {!isMaint && (
                    <button
                      disabled={openGate.isPending || closeGate.isPending}
                      onClick={() => isOpen ? closeGate.mutate(gate.id) : openGate.mutate(gate.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1 text-xs font-semibold transition-all disabled:opacity-50",
                        isOpen
                          ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-500/20",
                      )}
                    >
                      {isOpen ? "Close" : "Open"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Modals */}
      {showRaise  && <RaiseAlertModal  onClose={() => setShowRaise(false)}  gates={gates} />}
      {showGate   && <CreateGateModal  onClose={() => setShowGate(false)} />}
      {showShift  && <ScheduleShiftModal onClose={() => setShowShift(false)} guards={guards} gates={gates} />}
    </div>
  );
}

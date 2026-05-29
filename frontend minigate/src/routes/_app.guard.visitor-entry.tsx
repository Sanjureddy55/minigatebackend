import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// @ts-ignore
import { guardService } from "@/services/guard.service.js";

export const Route = createFileRoute("/_app/guard/visitor-entry")({
  component: Page,
});

// ── Avatar colors ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500",
  "bg-amber-500",  "bg-rose-500", "bg-indigo-500",
  "bg-teal-500",   "bg-orange-500",
];

function avatarColor(name: string) {
  const code = (name || "").charCodeAt(0) ?? 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ── Visit type badge colors ───────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  guest:    "bg-primary/10 text-primary border-primary/20",
  delivery: "bg-amber-500/10 text-amber-600 border-amber-400/20",
  service:  "bg-sky-500/10 text-sky-600 border-sky-400/20",
  cab:      "bg-violet-500/10 text-violet-600 border-violet-400/20",
  staff:    "bg-emerald-500/10 text-emerald-600 border-emerald-400/20",
  other:    "bg-muted/30 text-muted-foreground border-border",
};

// ── Form constants ────────────────────────────────────────────────────────────

const VISIT_TYPES = [
  { value: "guest",    label: "Guest" },
  { value: "delivery", label: "Delivery" },
  { value: "service",  label: "Service" },
  { value: "cab",      label: "Cab / Taxi" },
  { value: "staff",    label: "Staff" },
  { value: "other",    label: "Other" },
];

const EMPTY_FORM = {
  full_name: "", mobile: "", visit_type: "guest",
  host_name: "", purpose: "", vehicle_number: "",
};

function Page() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ["gate-log"],
    queryFn: () => guardService.getGateLog().then((r: any) => r.data.results ?? []),
    refetchInterval: 30_000,
  });

  const register = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => guardService.registerVisitor(data),
    onSuccess: () => {
      toast.success(`${form.full_name} checked in successfully`);
      setForm({ ...EMPTY_FORM });
      qc.invalidateQueries({ queryKey: ["gate-log"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Check-in failed");
    },
  });

  const reject = useMutation({
    mutationFn: (id: number) => guardService.rejectVisitor(id),
    onSuccess: () => { toast.success("Visitor rejected"); qc.invalidateQueries({ queryKey: ["gate-log"] }); },
    onError: () => toast.error("Action failed"),
  });

  const checkout = useMutation({
    mutationFn: (id: number) => guardService.checkOutVisitor(id),
    onSuccess: () => { toast.success("Visitor checked out"); qc.invalidateQueries({ queryKey: ["gate-log"] }); },
    onError: () => toast.error("Action failed"),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(form);
  };

  const gateLog: any[] = logData ?? [];

  return (
    <>
      <PageHeader
        title="Visitor Entry"
        description="Check in new visitors and manage today's gate log"
        actions={
          <div className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-bold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            {gateLog.length} today
          </div>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_400px]">
        {/* ── Check-in Form ─────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">New Check-in</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" value={form.full_name} onChange={set("full_name")} placeholder="Visitor's full name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mobile">Mobile *</Label>
                <Input id="mobile" value={form.mobile} onChange={set("mobile")} placeholder="+91 98765 43210" required />
              </div>
              <div className="space-y-1.5">
                <Label>Visitor Type</Label>
                <Select value={form.visit_type} onValueChange={(v) => setForm((f) => ({ ...f, visit_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map((vt) => (
                      <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="host_name">Visiting Flat / Host</Label>
                <Input id="host_name" value={form.host_name} onChange={set("host_name")} placeholder="e.g. A-402 or Ravi Kumar" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vehicle_number">Vehicle Number</Label>
                <Input id="vehicle_number" value={form.vehicle_number} onChange={set("vehicle_number")} placeholder="MH 12 AB 1234 (optional)" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea id="purpose" value={form.purpose} onChange={set("purpose")} placeholder="Reason for visit (optional)" rows={2} />
            </div>

            <Button type="submit" className="w-full gap-1.5" disabled={register.isPending}>
              <UserPlus className="h-4 w-4" />
              {register.isPending ? "Checking in…" : "Check In Visitor"}
            </Button>
          </form>
        </div>

        {/* ── Today's Gate Log ──────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">Today's Gate Log</span>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {gateLog.length}
            </span>
          </div>

          {logLoading && <p className="p-5 text-sm text-muted-foreground">Loading…</p>}
          {!logLoading && gateLog.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No visitors today yet.</p>
          )}

          <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
            {gateLog.map((row: any) => {
              const name     = row.full_name || row.visitor_name || "";
              const code     = (name).charCodeAt(0) ?? 0;
              const color    = AVATAR_COLORS[code % AVATAR_COLORS.length];
              const inits    = row.initials || name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              const typeKey  = row.visit_type || "";
              const typeCls  = TYPE_COLORS[typeKey] ?? TYPE_COLORS.other;
              const inTime   = row.checked_in_at
                ? new Date(row.checked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                : null;

              return (
                <div key={row.id} className="flex items-start gap-3 px-5 py-3">
                  {/* Colored avatar */}
                  <div className={`h-9 w-9 rounded-full ${color} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                    {inits}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${typeCls}`}>
                        {row.visit_type_display || typeKey}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{row.flat_display || "—"}</span>
                      {inTime && (
                        <>
                          <span className="text-border">·</span>
                          <span className="font-mono">{inTime}</span>
                        </>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-1.5 flex gap-1.5">
                      {/* Inside: show both Check Out and Reject */}
                      {row.status === "inside" && (
                        <>
                          <button
                            onClick={() => checkout.mutate(row.id)}
                            disabled={checkout.isPending}
                            className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success hover:bg-success/20 transition-colors"
                          >
                            Check Out
                          </button>
                          <button
                            onClick={() => reject.mutate(row.id)}
                            disabled={reject.isPending}
                            className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {/* Approved: show Reject only */}
                      {row.status === "approved" && (
                        <button
                          onClick={() => reject.mutate(row.id)}
                          disabled={reject.isPending}
                          className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>

                  <StatusBadge status={row.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

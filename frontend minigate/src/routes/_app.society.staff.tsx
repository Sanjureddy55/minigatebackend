import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Download, Search, SlidersHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/staff")({
  component: Page,
});

const ROLES = [
  { value: "security_guard", label: "Security Guard"    },
  { value: "maintenance",    label: "Maintenance Staff" },
  { value: "other",          label: "Support Staff"     },
];

const SHIFTS = [
  { value: "morning", label: "Morning (06:00 – 14:00)" },
  { value: "day",     label: "Day (10:00 – 18:00)"     },
  { value: "evening", label: "Evening (14:00 – 22:00)" },
  { value: "night",   label: "Night (22:00 – 06:00)"   },
];

const STATUSES = [
  { value: "active",   label: "Active"   },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  if (status === "on_leave")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        On Leave
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-4xl font-extrabold text-foreground">{value ?? "—"}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function Page() {
  const qc = useQueryClient();
  const [modal,      setModal]      = useState<null | "add" | any>(null);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // ── KPI stat cards ────────────────────────────────────────────────────────
  const { data: kpi } = useQuery({
    queryKey: ["staff-guards-kpi"],
    queryFn:  () => societyService.getStaffGuardsKpi().then((r: any) => r.data?.data ?? r.data),
    staleTime: 30_000,
  });

  // ── Staff list ────────────────────────────────────────────────────────────
  const { data: staffData, isLoading } = useQuery({
    queryKey: ["staff-guards", search, roleFilter],
    queryFn:  () =>
      societyService.getStaffGuards({
        search:   search     || undefined,
        role:     roleFilter !== "all" ? roleFilter : undefined,
        page_size: 100,
      }).then((r: any) => r.data),
    staleTime: 20_000,
  });
  const staff: any[] = staffData?.results ?? [];

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: number) => societyService.deleteStaffGuard(id),
    onSuccess: () => {
      toast.success("Staff member removed");
      qc.invalidateQueries({ queryKey: ["staff-guards"] });
      qc.invalidateQueries({ queryKey: ["staff-guards-kpi"] });
    },
    onError: () => toast.error("Failed to delete staff member"),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["staff-guards"] });
    qc.invalidateQueries({ queryKey: ["staff-guards-kpi"] });
  };

  return (
    <>
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff & Guard Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Roster of guards, housekeeping and on-site staff.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => setModal("add")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Staff
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Staff"  value={kpi?.total_staff  ?? "—"} />
          <StatCard label="Guards"       value={kpi?.guards       ?? "—"} />
          <StatCard label="Housekeeping" value={kpi?.housekeeping ?? "—"} />
        </div>

        {/* ── Search + Filter ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              placeholder="Search staff & guard management..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none w-full sm:w-44"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors shrink-0">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>

        {/* ── Table ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Role</th>
                  <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Shift</th>
                  <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">Gate</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Loading staff…
                    </td>
                  </tr>
                )}
                {!isLoading && staff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground">
                      No staff found.{" "}
                      <button
                        onClick={() => setModal("add")}
                        className="text-teal-600 underline font-medium"
                      >
                        Add one
                      </button>
                    </td>
                  </tr>
                )}
                {staff.map((s: any) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      {s.full_name}
                    </td>
                    <td className="px-5 py-3.5 text-foreground">
                      {s.role_display || s.role}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-foreground">
                      {s.shift_display
                        ? s.shift_display.split(" ")[0]
                        : s.shift || "—"}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground">
                      {s.gate_assigned || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal(s)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${s.full_name}" from staff?`)) {
                              deleteMut.mutate(s.id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {staffData?.count > staff.length && (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground text-center">
              Showing {staff.length} of {staffData?.count} staff
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {(modal === "add" || (modal && modal?.id)) && (
        <StaffModal
          staff={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={invalidate}
        />
      )}
    </>
  );
}

// ── Add / Edit Staff Modal ────────────────────────────────────────────────────
function StaffModal({
  staff, onClose, onSaved,
}: {
  staff: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!staff;
  const [form, setForm] = useState({
    full_name:    staff?.full_name    ?? "",
    phone:        staff?.phone        ?? "",
    email:        staff?.email        ?? "",
    role:         staff?.role         ?? "security_guard",
    shift:        staff?.shift        ?? "day",
    status:       staff?.status       ?? "active",
    gate_assigned: staff?.gate_assigned ?? "",
    joined_date:  staff?.joined_date  ?? "",
    notes:        staff?.notes        ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, val: string) => {
    setForm((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const mut = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? societyService.updateStaffGuard(staff.id, data)
        : societyService.createStaffGuard(data),
    onSuccess: () => {
      toast.success(isEdit ? "Staff updated" : "Staff member added");
      onSaved();
      onClose();
    },
    onError: (err: any) => {
      const d = err?.response?.data;
      if (d && typeof d === "object") {
        const e: Record<string, string> = {};
        Object.entries(d).forEach(([k, v]) => {
          e[k] = Array.isArray(v) ? (v[0] as string) : String(v);
        });
        setErrors(e);
        toast.error(Object.values(e)[0] ?? "Failed to save");
      } else {
        toast.error("Failed to save staff member");
      }
    },
  });

  const submit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.full_name.trim()) next.full_name = "Name is required";
    if (!form.phone.trim())     next.phone     = "Phone is required";
    if (!form.role)             next.role      = "Role is required";
    setErrors(next);
    if (Object.keys(next).length) return;
    mut.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background">
          <div>
            <h3 className="font-semibold text-foreground">
              {isEdit ? "Edit Staff Member" : "Add Staff Member"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? "Update staff details." : "Add a new staff or guard member."}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full Name *</label>
              <input
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Ramesh Kumar"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Phone *</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="9876543210"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email (optional)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="ramesh@example.com"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          {/* Role + Shift */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Role *</label>
              <select
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Shift</label>
              <select
                value={form.shift}
                onChange={(e) => set("shift", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {SHIFTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status + Gate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Gate Assigned</label>
              <input
                value={form.gate_assigned}
                onChange={(e) => set("gate_assigned", e.target.value)}
                placeholder="Gate 1 (Main)"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>

          {/* Joined Date + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Joined Date</label>
              <input
                type="date"
                value={form.joined_date}
                onChange={(e) => set("joined_date", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any notes..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2 text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {mut.isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

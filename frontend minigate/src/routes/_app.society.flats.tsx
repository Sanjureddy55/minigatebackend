import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Download, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/flats")({
  component: Page,
});

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Vacant
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

// ── Main page ─────────────────────────────────────────────────────────────────
function Page() {
  const qc = useQueryClient();
  const [addOpen,       setAddOpen]       = useState(false);
  const [editFlat,      setEditFlat]      = useState<any>(null);
  const [search,        setSearch]        = useState("");
  const [buildingFilter,setBuildingFilter] = useState("all");

  // ── Dashboard stat cards ──────────────────────────────────────────────────
  const { data: dashData } = useQuery({
    queryKey: ["flats-dashboard"],
    queryFn:  () =>
      societyService.getFlatDashboard().then((r: any) => r.data?.data ?? r.data),
    staleTime: 30_000,
  });

  // ── Buildings for filter dropdown ─────────────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: ["buildings"],
    queryFn:  () =>
      societyService.getBuildings({ page_size: 100 }).then((r: any) => r.data),
    staleTime: 60_000,
  });
  const buildings: any[] = buildingsData?.results ?? [];

  // ── Flats list ────────────────────────────────────────────────────────────
  const { data: flatsData, isLoading } = useQuery({
    queryKey: ["flats", search, buildingFilter],
    queryFn:  () =>
      societyService
        .getFlats({
          search:   search   || undefined,
          building: buildingFilter !== "all" ? buildingFilter : undefined,
          page_size: 100,
        })
        .then((r: any) => r.data),
    staleTime: 20_000,
  });
  const flats: any[] = flatsData?.results ?? [];

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: string) => societyService.deleteFlat(id),
    onSuccess: () => {
      toast.success("Flat deleted");
      qc.invalidateQueries({ queryKey: ["flats"] });
      qc.invalidateQueries({ queryKey: ["flats-dashboard"] });
    },
    onError: () => toast.error("Failed to delete flat"),
  });

  return (
    <>
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flat Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Map flats to owners, tenants and occupants.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { setEditFlat(null); setAddOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Add Flat
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-6">

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total"    value={dashData?.total    ?? flatsData?.count ?? "—"} />
          <StatCard label="Occupied" value={dashData?.occupied ?? "—"} />
          <StatCard label="Vacant"   value={dashData?.vacant   ?? "—"} />
        </div>

        {/* ── Search + Filter row ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search flat management..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {buildings.map((b: any) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* ── Flats Table ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Flat</th>
                  <th className="px-5 py-3 text-left font-medium">Building</th>
                  <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Owner</th>
                  <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">Tenant</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {/* Loading */}
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Loading flats…
                    </td>
                  </tr>
                )}

                {/* Empty */}
                {!isLoading && flats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground">
                      No flats found.{" "}
                      <button
                        onClick={() => { setEditFlat(null); setAddOpen(true); }}
                        className="text-teal-600 underline font-medium"
                      >
                        Add one
                      </button>
                    </td>
                  </tr>
                )}

                {/* Rows */}
                {flats.map((f: any) => (
                  <tr
                    key={f.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      {f.flat_number}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-teal-600">
                      {f.building_name || "—"}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {f.owner
                        ? <span className="text-teal-700 font-medium">{f.owner}</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {f.tenant
                        ? <span className="font-medium text-foreground">{f.tenant}</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => { setEditFlat(f); setAddOpen(true); }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete flat "${f.flat_number}"?`)) {
                              deleteMut.mutate(f.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination hint */}
          {(flatsData?.count ?? 0) > flats.length && (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground text-center">
              Showing {flats.length} of {flatsData?.count} flats
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Dialog ────────────────────────────────────────────────── */}
      <FlatDialog
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setEditFlat(null); }}
        flat={editFlat}
        buildings={buildings}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["flats"] });
          qc.invalidateQueries({ queryKey: ["flats-dashboard"] });
        }}
      />
    </>
  );
}

// ── Add / Edit Flat Dialog ────────────────────────────────────────────────────
function FlatDialog({
  open, onOpenChange, flat, buildings, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  flat: any;
  buildings: any[];
  onSaved?: () => void;
}) {
  const isEdit = !!flat;

  const [flatNumber,   setFlatNumber]   = useState(flat?.flat_number   ?? "");
  const [buildingName, setBuildingName] = useState(flat?.building_name ?? "");
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const resetForm = () => {
    setFlatNumber(flat?.flat_number   ?? "");
    setBuildingName(flat?.building_name ?? "");
    setErrors({});
  };

  const mut = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? societyService.updateFlat(flat.id, { flat_number: data.flat_number })
        : societyService.addFlat({ flat_number: data.flat_number, building: data.building }),
    onSuccess: () => {
      toast.success(isEdit ? "Flat updated" : "Flat added successfully");
      onSaved?.();
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => {
      const d = err.response?.data;
      if (d && typeof d === "object") {
        const e: Record<string, string> = {};
        Object.entries(d).forEach(([k, v]) => {
          e[k] = Array.isArray(v) ? (v[0] as string) : String(v);
        });
        setErrors(e);
        toast.error(e.flat_number ?? e.building ?? "Failed to save flat");
      } else {
        toast.error("Failed to save flat");
      }
    },
  });

  const submit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!flatNumber.trim())        next.flat_number = "Flat number is required";
    if (!isEdit && !buildingName)  next.building    = "Building is required";
    setErrors(next);
    if (Object.keys(next).length) return;
    mut.mutate({ flat_number: flatNumber.trim(), building: buildingName });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Flat" : "Add Flat"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the flat number." : "Add a new flat to a building."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">

          {/* Building — only for new flats */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Building *</Label>
              <Select
                value={buildingName}
                onValueChange={(v) => {
                  setBuildingName(v);
                  setErrors((p) => ({ ...p, building: "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={buildings.length === 0 ? "No buildings yet" : "Select building"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b: any) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.building && (
                <p className="text-xs text-destructive">{errors.building}</p>
              )}
            </div>
          )}

          {/* Flat Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Flat Number *</Label>
            <Input
              value={flatNumber}
              onChange={(e) => {
                setFlatNumber(e.target.value);
                setErrors((p) => ({ ...p, flat_number: "" }));
              }}
              placeholder="e.g. A-402"
              autoFocus
            />
            {errors.flat_number && (
              <p className="text-xs text-destructive">{errors.flat_number}</p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mut.isPending || (!isEdit && buildings.length === 0)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {mut.isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Flat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

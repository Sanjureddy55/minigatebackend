import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Plus, Search, Download, MoreHorizontal,
  Pencil, Trash2, Layers, Home, Filter, X, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/buildings")({
  component: BuildingsPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Building = {
  id: string;
  name: string;
  society: number;
  society_name: string;
  city_name: string;
  total_floors: number;
  flat_count: number;
  status: "active" | "inactive";
  status_display: string;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Building Form Dialog  (Create + Edit)
// ─────────────────────────────────────────────────────────────────────────────

function BuildingDialog({
  open, onOpenChange, building, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  building?: Building | null;
  onSaved: () => void;
}) {
  const isEdit = !!building;
  const [name, setName]         = useState(building?.name ?? "");
  const [floors, setFloors]     = useState(building?.total_floors ? String(building.total_floors) : "");
  const [fpf, setFpf]           = useState("");
  const [status, setStatus]     = useState<"active" | "inactive">(building?.status ?? "active");
  const [fieldErrors, setFE]    = useState<Record<string, string>>({});

  const reset = () => {
    setName(building?.name ?? "");
    setFloors(building?.total_floors ? String(building.total_floors) : "");
    setFpf("");
    setStatus(building?.status ?? "active");
    setFE({});
  };

  const mut = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? societyService.updateBuilding(building!.id, data)
        : societyService.createBuilding(data),
    onSuccess: () => {
      toast.success(isEdit ? "Building updated" : "Building created");
      onSaved();
      onOpenChange(false);
    },
    onError: (err: any) => {
      const d = err.response?.data ?? {};
      const errs: Record<string, string> = {};
      if (d.name)         errs.name   = Array.isArray(d.name) ? d.name[0] : d.name;
      if (d.total_floors) errs.floors = Array.isArray(d.total_floors) ? d.total_floors[0] : d.total_floors;
      if (d.detail)       errs.gen    = d.detail;
      if (Object.keys(errs).length) setFE(errs);
      else toast.error("Failed to save building");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (Object.keys(errs).length) { setFE(errs); return; }
    setFE({});
    const payload: any = { name: name.trim(), status };
    if (floors) payload.total_floors = Number(floors);
    if (!isEdit && fpf) payload.flats_per_floor = Number(fpf);
    mut.mutate(payload);
  };

  const floorsNum = Number(floors) || 0;
  const fpfNum    = Number(fpf)    || 0;
  const autoFlats = !isEdit && floorsNum > 0 && fpfNum > 0 ? floorsNum * fpfNum : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {isEdit ? "Edit Building" : "Add Building"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update building details."
              : "Create a tower or block. Specify floors + flats/floor to auto-generate flat units."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Name *</Label>
            <Input
              placeholder="e.g. Tower A, Block D"
              value={name}
              onChange={(e) => { setName(e.target.value); setFE((p) => ({ ...p, name: "" })); }}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className={cn("grid gap-3", !isEdit ? "grid-cols-2" : "grid-cols-1")}>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Total Floors</Label>
              <Input
                type="number" min="0" placeholder="e.g. 14"
                value={floors}
                onChange={(e) => { setFloors(e.target.value); setFE((p) => ({ ...p, floors: "" })); }}
              />
              {fieldErrors.floors && <p className="text-xs text-destructive">{fieldErrors.floors}</p>}
            </div>
            {!isEdit && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Flats / Floor</Label>
                <Input
                  type="number" min="0" placeholder="e.g. 4"
                  value={fpf}
                  onChange={(e) => setFpf(e.target.value)}
                />
              </div>
            )}
          </div>

          {autoFlats !== null && (
            <div className="flex items-center gap-2 rounded-xl border border-teal-500/25 bg-teal-500/8 px-4 py-2.5">
              <Home className="h-4 w-4 text-teal-600 flex-shrink-0" />
              <p className="text-sm text-teal-700 dark:text-teal-400">
                <strong>{autoFlats}</strong> flats will be auto-generated
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {fieldErrors.gen && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {fieldErrors.gen}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Building"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Dialog
// ─────────────────────────────────────────────────────────────────────────────

function DeleteDialog({
  building, onClose, onConfirm, loading,
}: {
  building: Building; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Delete Building
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{building.name}</strong>?
            {building.flat_count > 0 && (
              <span className="block mt-1 font-semibold text-destructive">
                This will also remove {building.flat_count} flat(s).
              </span>
            )}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page — matches screenshot 1 exactly
// ─────────────────────────────────────────────────────────────────────────────

function BuildingsPage() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [ordering, setOrdering]     = useState("name");
  const [showAdd, setShowAdd]       = useState(false);
  const [editItem, setEditItem]     = useState<Building | null>(null);
  const [deleteItem, setDeleteItem] = useState<Building | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: dashData } = useQuery({
    queryKey: ["building-dashboard"],
    queryFn: () =>
      societyService.getBuildingDashboard()
        .then((r: any) => r.data.data ?? r.data),
    staleTime: 60_000,
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["buildings", search, statusFilter, ordering],
    queryFn: () =>
      societyService.getBuildings({
        search:   search   || undefined,
        status:   statusFilter || undefined,
        ordering: ordering || undefined,
        page_size: 100,
      }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteMut = useMutation({
    mutationFn: (id: string) => societyService.deleteBuilding(id),
    onSuccess: () => {
      toast.success("Building deleted");
      qc.invalidateQueries({ queryKey: ["buildings"] });
      qc.invalidateQueries({ queryKey: ["building-dashboard"] });
      setDeleteItem(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail ?? "Failed to delete"),
  });

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ["buildings"] });
    qc.invalidateQueries({ queryKey: ["building-dashboard"] });
  };

  // ── Data ───────────────────────────────────────────────────────────────────

  const buildings: Building[] = listData?.results ?? listData ?? [];
  const totalCount = listData?.count ?? buildings.length;

  // Fallback: compute stats from list if dashboard not yet loaded
  const stats = dashData ?? {
    buildings: buildings.length,
    floors: buildings.reduce((s, b) => s + (b.total_floors ?? 0), 0),
    flats:  buildings.reduce((s, b) => s + (b.flat_count  ?? 0), 0),
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────

  const exportCsv = () => {
    const rows = [
      ["Name", "City", "Floors", "Flats", "Status"],
      ...buildings.map((b) => [
        b.name, b.city_name ?? "", String(b.total_floors ?? 0),
        String(b.flat_count ?? 0), b.status_display,
      ]),
    ];
    const csv  = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "buildings.csv";
    a.click();
  };

  const hasFilters = !!search || !!statusFilter;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header ── */}
      <PageHeader
        title="Building Management"
        description="Define towers/blocks and their floor plans."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Add Building
            </Button>
          </>
        }
      />

      <div className="p-6 lg:p-8 space-y-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Buildings", value: stats.buildings },
            { label: "Floors",    value: stats.floors    },
            { label: "Flats",     value: stats.flats     },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-card px-6 py-5"
            >
              <p className="text-sm text-muted-foreground mb-1">{label}</p>
              <p className="text-4xl font-bold text-foreground tracking-tight">
                {value ?? 0}
              </p>
            </div>
          ))}
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 h-10 rounded-xl border-border"
              placeholder="Search building management..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            className={cn("gap-2 h-10 rounded-xl", showFilter && "border-primary text-primary")}
            onClick={() => setShowFilter((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </Button>
        </div>

        {/* ── Expanded filter row ── */}
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-3 items-center rounded-xl border border-border bg-muted/30 px-4 py-3"
          >
            <Select value={statusFilter} onValueChange={setStatus}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ordering} onValueChange={setOrdering}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="-name">Name Z–A</SelectItem>
                <SelectItem value="created_at">Oldest First</SelectItem>
                <SelectItem value="-created_at">Newest First</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 text-xs text-muted-foreground h-8"
                onClick={() => { setSearch(""); setStatus(""); }}
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            )}
          </motion.div>
        )}

        {/* ── Table ── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          {/* Table header bar */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] border-b border-border bg-muted/20 px-6 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Building</span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Floors</span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Flats</span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</span>
            <span />
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading buildings…
            </div>
          )}

          {/* Empty */}
          {!isLoading && buildings.length === 0 && (
            <div className="py-20 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-semibold text-foreground">
                {hasFilters ? "No buildings match your filters" : "No buildings yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasFilters
                  ? "Try adjusting your search or filters."
                  : "Get started by adding your first building."}
              </p>
              {!hasFilters && (
                <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4" /> Add Building
                </Button>
              )}
            </div>
          )}

          {/* Rows */}
          {buildings.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] items-center px-6 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              {/* Building name */}
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{b.name}</p>
                {b.society_name && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.society_name}</p>
                )}
              </div>

              {/* Floors */}
              <span className="text-sm text-foreground font-medium">
                {b.total_floors ?? "—"}
              </span>

              {/* Flats */}
              <span className="text-sm text-foreground font-medium">
                {b.flat_count ?? 0}
              </span>

              {/* Status badge */}
              <span className={cn(
                "inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold",
                b.status === "active"
                  ? "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-400"
                  : "border-border bg-muted/50 text-muted-foreground",
              )}>
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  b.status === "active" ? "bg-teal-500" : "bg-muted-foreground",
                )} />
                {b.status_display}
              </span>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors ml-auto">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    className="gap-2 text-sm"
                    onClick={() => setEditItem(b)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-sm text-destructive focus:text-destructive"
                    onClick={() => setDeleteItem(b)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))}

          {/* Footer count */}
          {buildings.length > 0 && (
            <div className="border-t border-border px-6 py-2.5 text-xs text-muted-foreground">
              Showing {buildings.length} of {totalCount} buildings
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <BuildingDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        building={null}
        onSaved={handleSaved}
      />

      {editItem && (
        <BuildingDialog
          open={!!editItem}
          onOpenChange={(v) => !v && setEditItem(null)}
          building={editItem}
          onSaved={handleSaved}
        />
      )}

      {deleteItem && (
        <DeleteDialog
          building={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={() => deleteMut.mutate(deleteItem.id)}
          loading={deleteMut.isPending}
        />
      )}
    </>
  );
}

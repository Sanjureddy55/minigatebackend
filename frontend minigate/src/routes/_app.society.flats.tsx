import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Home, MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/flats")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: flatsData, isLoading } = useQuery({
    queryKey: ["flats", search],
    queryFn: () =>
      societyService.getFlats({ search: search || undefined, page_size: 100 }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const { data: buildingsData } = useQuery({
    queryKey: ["buildings"],
    queryFn: () => societyService.getBuildings({ page_size: 100 }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const flats: any[] = flatsData?.results ?? flatsData ?? [];
  const buildings: any[] = buildingsData?.results ?? buildingsData ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: string) => societyService.deleteFlat(id),
    onSuccess: () => {
      toast.success("Flat deleted");
      qc.invalidateQueries({ queryKey: ["flats"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  return (
    <>
      <PageHeader
        title="Flat Management"
        description="Map flats to buildings and manage occupancy."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setEditItem(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Flat
          </Button>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Total Flats",    value: flats.length,     color: "text-foreground",   bg: "bg-muted/30" },
            { label: "Buildings",      value: buildings.length, color: "text-primary",      bg: "bg-primary/10" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Home className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by flat number or building…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">All Flats</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {flatsData?.count ?? flats.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && flats.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No flats yet.{" "}
              <button onClick={() => setOpen(true)} className="text-primary underline">Add one</button>.
            </p>
          )}

          {flats.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Flat</th>
                    <th className="px-5 py-2.5 text-left font-medium">Building</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Society</th>
                    <th className="w-10 px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {flats.map((f: any) => (
                    <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">{f.flat_number}</td>
                      <td className="px-5 py-3 text-muted-foreground">{f.building_name || "—"}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{f.society_name || "—"}</td>
                      <td className="px-5 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-md p-1.5 hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditItem(f); setOpen(true); }}>Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Delete flat "${f.flat_number}"?`)) deleteMut.mutate(f.id);
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <FlatDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditItem(null); }}
        flat={editItem}
        buildings={buildings}
        onSaved={() => qc.invalidateQueries({ queryKey: ["flats"] })}
      />
    </>
  );
}

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
  const [flatNumber, setFlatNumber] = useState(flat?.flat_number ?? "");
  const [buildingId, setBuildingId] = useState(flat?.building ? String(flat.building) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mut = useMutation({
    mutationFn: (data: any) =>
      isEdit ? societyService.updateFlat(flat.id, data) : societyService.createFlat(data),
    onSuccess: () => {
      toast.success(isEdit ? "Flat updated" : "Flat created");
      onSaved?.();
      onOpenChange(false);
      setFlatNumber("");
      setBuildingId("");
    },
    onError: (err: any) => {
      const data = err.response?.data;
      if (data) {
        const e: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]) => { e[k] = Array.isArray(v) ? v[0] : String(v); });
        setErrors(e);
      } else {
        toast.error("Failed to save flat");
      }
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!flatNumber.trim()) next.flat_number = "Flat number required";
    if (!buildingId) next.building = "Building required";
    setErrors(next);
    if (Object.keys(next).length) return;
    mut.mutate({ flat_number: flatNumber.trim(), building: buildingId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Flat" : "Add Flat"}</DialogTitle>
          <DialogDescription>Map a flat to a building.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Flat number *</Label>
            <Input
              value={flatNumber}
              onChange={e => { setFlatNumber(e.target.value); setErrors({}); }}
              placeholder="A-402"
            />
            {errors.flat_number && <p className="text-xs text-destructive">{errors.flat_number}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Building *</Label>
            <Select value={buildingId} onValueChange={v => { setBuildingId(v); setErrors({}); }}>
              <SelectTrigger>
                <SelectValue placeholder={buildings.length === 0 ? "No buildings yet" : "Select building"} />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.building && <p className="text-xs text-destructive">{errors.building}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending || buildings.length === 0}>
              {mut.isPending ? "Saving…" : isEdit ? "Save" : "Add Flat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

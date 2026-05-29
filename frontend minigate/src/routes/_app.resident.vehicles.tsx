import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Car, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/vehicles")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    vehicle_name: "",
    vehicle_type: "car",
    plate_number: "",
    parking_slot: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => residentService.getVehicles().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const vehicles: any[] = data?.results ?? data ?? [];

  const createMut = useMutation({
    mutationFn: (d: any) => residentService.createVehicle(d),
    onSuccess: () => {
      toast.success("Vehicle registered");
      setOpen(false);
      setForm({ vehicle_name: "", vehicle_type: "car", plate_number: "", parking_slot: "" });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? "Failed to register"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => residentService.deleteVehicle(id),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["vehicles"] }); },
    onError: () => toast.error("Failed to remove"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plate_number.trim()) { toast.error("Plate number required"); return; }
    createMut.mutate({
      vehicle_name: form.vehicle_name || undefined,
      vehicle_type: form.vehicle_type,
      plate_number: form.plate_number,
      parking_slot: form.parking_slot || undefined,
    });
  };

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Registered vehicles for your flat."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 w-fit">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Car className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-primary">{vehicles.length}</div>
            <div className="text-xs text-muted-foreground">Vehicles</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && vehicles.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No vehicles registered yet.</p>
          )}
          {vehicles.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Plate</th>
                  <th className="px-5 py-2.5 text-left font-medium">Type</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Name</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Slot</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="w-10 px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v: any) => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono font-medium text-foreground">{v.plate_number}</td>
                    <td className="px-5 py-3 capitalize text-muted-foreground">
                      {v.vehicle_type_display || v.vehicle_type}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">{v.vehicle_name || "—"}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{v.parking_slot || "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-md p-1.5 hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { if (confirm(`Remove ${v.plate_number}?`)) deleteMut.mutate(v.id); }}
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Register Vehicle</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Plate Number *</Label>
                <Input
                  value={form.plate_number}
                  onChange={e => setForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))}
                  placeholder="KA 05 AB 1234"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.vehicle_type} onValueChange={v => setForm(f => ({ ...f, vehicle_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="two_wheeler">Two-Wheeler</SelectItem>
                    <SelectItem value="ev">EV</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vehicle Name</Label>
                <Input value={form.vehicle_name} onChange={e => setForm(f => ({ ...f, vehicle_name: e.target.value }))} placeholder="Honda City" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Parking Slot</Label>
                <Input value={form.parking_slot} onChange={e => setForm(f => ({ ...f, parking_slot: e.target.value }))} placeholder="P1-12" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Saving…" : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

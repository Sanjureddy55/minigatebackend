import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Heart, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_app/resident/pets")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", calling_name: "", pet_type: "dog", gender: "male", color: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => residentService.getPets().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const pets: any[] = data?.results ?? data ?? [];

  const createMut = useMutation({
    mutationFn: (d: any) => residentService.createPet(d),
    onSuccess: () => {
      toast.success("Pet registered");
      setOpen(false);
      setForm({ name: "", calling_name: "", pet_type: "dog", gender: "male", color: "" });
      qc.invalidateQueries({ queryKey: ["pets"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? "Failed to register"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => residentService.deletePet(id),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["pets"] }); },
    onError: () => toast.error("Failed to remove"),
  });

  return (
    <>
      <PageHeader
        title="Pets"
        description="Register pets living in your flat."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Pet
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 w-fit">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Heart className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-primary">{pets.length}</div>
            <div className="text-xs text-muted-foreground">Pets</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && pets.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No pets registered yet.</p>
          )}
          {pets.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Name</th>
                  <th className="px-5 py-2.5 text-left font-medium">Type</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Gender</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Color</th>
                  <th className="w-10 px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {pets.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">
                      {p.name}
                      {p.calling_name && <span className="text-xs text-muted-foreground ml-1">({p.calling_name})</span>}
                    </td>
                    <td className="px-5 py-3 capitalize text-muted-foreground">{p.pet_type_display || p.pet_type}</td>
                    <td className="px-5 py-3 hidden sm:table-cell capitalize text-muted-foreground">{p.gender_display || p.gender}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{p.color || "—"}</td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-md p-1.5 hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive"
                            onClick={() => { if (confirm(`Remove ${p.name}?`)) deleteMut.mutate(p.id); }}
                          >Remove</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>Register Pet</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (!form.name.trim()) { toast.error("Name required"); return; } createMut.mutate({ name: form.name, calling_name: form.calling_name || undefined, pet_type: form.pet_type, gender: form.gender, color: form.color || undefined }); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Bruno" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Calling Name</Label>
                <Input value={form.calling_name} onChange={e => setForm(f => ({ ...f, calling_name: e.target.value }))} placeholder="Bruni" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.pet_type} onValueChange={v => setForm(f => ({ ...f, pet_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">Dog</SelectItem>
                    <SelectItem value="cat">Cat</SelectItem>
                    <SelectItem value="bird">Bird</SelectItem>
                    <SelectItem value="fish">Fish</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Color / Markings</Label>
                <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Golden brown" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Saving…" : "Register"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

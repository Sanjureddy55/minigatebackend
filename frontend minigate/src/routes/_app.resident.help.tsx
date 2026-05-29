import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Users, MoreHorizontal } from "lucide-react";
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

export const Route = createFileRoute("/_app/resident/help")({
  component: Page,
});

const HELP_TYPES = [
  { value: "cook",          label: "Cook" },
  { value: "maid",          label: "Maid / House Help" },
  { value: "driver",        label: "Driver" },
  { value: "security",      label: "Security" },
  { value: "baby_sitter",   label: "Baby Sitter" },
  { value: "dog_walker",    label: "Dog Walker" },
  { value: "gardener",      label: "Gardener" },
  { value: "other",         label: "Other" },
];

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", help_type: "maid", upi_id: "", monthly_salary: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["daily-help"],
    queryFn: () => residentService.getDailyHelp().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const helpers: any[] = data?.results ?? data ?? [];

  const createMut = useMutation({
    mutationFn: (d: any) => residentService.createDailyHelp(d),
    onSuccess: () => {
      toast.success("Helper registered");
      setOpen(false);
      setForm({ name: "", help_type: "maid", upi_id: "", monthly_salary: "" });
      qc.invalidateQueries({ queryKey: ["daily-help"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? "Failed to register"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => residentService.deleteDailyHelp(id),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["daily-help"] }); },
    onError: () => toast.error("Failed to remove"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name required"); return; }
    createMut.mutate({
      name: form.name,
      help_type: form.help_type,
      upi_id: form.upi_id || undefined,
      monthly_salary: form.monthly_salary ? Number(form.monthly_salary) : undefined,
    });
  };

  return (
    <>
      <PageHeader
        title="Daily Help"
        description="Manage cooks, maids, drivers and other helpers."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Helper
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 w-fit">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-primary">{helpers.length}</div>
            <div className="text-xs text-muted-foreground">Helpers</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && helpers.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No helpers registered yet.</p>
          )}
          {helpers.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Name</th>
                  <th className="px-5 py-2.5 text-left font-medium">Role</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Monthly Salary</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="w-10 px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {helpers.map((h: any) => (
                  <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">{h.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{h.help_type_display || h.help_type}</td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">
                      {h.monthly_salary ? `₹${Number(h.monthly_salary).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={h.status} /></td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-md p-1.5 hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive"
                            onClick={() => { if (confirm(`Remove ${h.name}?`)) deleteMut.mutate(h.id); }}
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
          <DialogHeader><DialogTitle>Register Daily Helper</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={form.help_type} onValueChange={v => setForm(f => ({ ...f, help_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HELP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Monthly Salary (₹)</Label>
                <Input type="number" value={form.monthly_salary} onChange={e => setForm(f => ({ ...f, monthly_salary: e.target.value }))} placeholder="8000" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">UPI ID (optional)</Label>
                <Input value={form.upi_id} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))} placeholder="lakshmi@upi" />
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

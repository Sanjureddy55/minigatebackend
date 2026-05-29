import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Store, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/vendors")({
  component: Page,
});

const CATEGORIES = [
  { value: "water_tanker", label: "Water Tanker" },
  { value: "landscaping",  label: "Landscaping" },
  { value: "plumbing",     label: "Plumbing" },
  { value: "electrical",   label: "Electrical" },
  { value: "security",     label: "Security Agency" },
  { value: "cleaning",     label: "Cleaning" },
  { value: "lift",         label: "Lift Maintenance" },
  { value: "pest",         label: "Pest Control" },
  { value: "other",        label: "Other" },
];

const STATUSES = [
  { value: "active",          label: "Active" },
  { value: "pending_renewal", label: "Pending Renewal" },
  { value: "inactive",        label: "Inactive" },
];

function Page() {
  const qc = useQueryClient();
  const societyId = useSelector((s: any) => s.auth?.legacyUser?.society_id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "other", contact_name: "", contact_phone: "",
    contact_email: "", monthly_cost: "", contract_start: "", contract_end: "",
    status: "active", notes: "",
  });

  const { data: kpiData } = useQuery({
    queryKey: ["vendor-kpi", societyId],
    queryFn: () => societyService.getVendorKpi({ society: societyId }).then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["vendors", societyId],
    queryFn: () => societyService.getVendors({ society: societyId }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const vendors: any[] = data?.results ?? data ?? [];

  const createMut = useMutation({
    mutationFn: (d: any) => societyService.createVendor(d),
    onSuccess: () => {
      toast.success("Vendor added");
      setOpen(false);
      setForm({ name: "", category: "other", contact_name: "", contact_phone: "", contact_email: "", monthly_cost: "", contract_start: "", contract_end: "", status: "active", notes: "" });
      qc.invalidateQueries({ queryKey: ["vendors"] });
      qc.invalidateQueries({ queryKey: ["vendor-kpi"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? "Failed to add vendor"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => societyService.deleteVendor(id),
    onSuccess: () => { toast.success("Vendor removed"); qc.invalidateQueries({ queryKey: ["vendors"] }); qc.invalidateQueries({ queryKey: ["vendor-kpi"] }); },
    onError: () => toast.error("Failed to remove"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact_phone.trim()) { toast.error("Name and phone required"); return; }
    createMut.mutate({
      society: societyId,
      name: form.name,
      category: form.category,
      contact_name: form.contact_name || undefined,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email || undefined,
      monthly_cost: form.monthly_cost ? Number(form.monthly_cost) : undefined,
      contract_start: form.contract_start || undefined,
      contract_end: form.contract_end || undefined,
      status: form.status,
      notes: form.notes || undefined,
    });
  };

  const kpi = kpiData ?? {};

  return (
    <>
      <PageHeader
        title="Vendor Management"
        description="Approved vendors and service partners."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Vendor
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: kpi.total ?? 0, color: "text-primary" },
            { label: "Active", value: kpi.active ?? 0, color: "text-success" },
            { label: "Pending Renewal", value: kpi.pending_renewal ?? 0, color: "text-warning-foreground" },
            { label: "Inactive", value: kpi.inactive ?? 0, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Store className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && vendors.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No vendors added yet.</p>
          )}
          {vendors.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Vendor</th>
                  <th className="px-5 py-2.5 text-left font-medium">Category</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Contact</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Monthly Cost</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="w-10 px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v: any) => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">{v.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.category_display || v.category}</td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">
                      <div>{v.contact_name || "—"}</div>
                      <div className="text-xs">{v.contact_phone}</div>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                      {v.monthly_cost ? `₹${Number(v.monthly_cost).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-md p-1.5 hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive"
                            onClick={() => { if (confirm(`Remove ${v.name}?`)) deleteMut.mutate(v.id); }}
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Vendor Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="AquaPure Services" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact Name</Label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Rajan Kumar" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact Phone *</Label>
                <Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+91 9876543210" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Contact Email</Label>
                <Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="vendor@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Monthly Cost (₹)</Label>
                <Input type="number" value={form.monthly_cost} onChange={e => setForm(f => ({ ...f, monthly_cost: e.target.value }))} placeholder="15000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contract Start</Label>
                <Input type="date" value={form.contract_start} onChange={e => setForm(f => ({ ...f, contract_start: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Contract End</Label>
                <Input type="date" value={form.contract_end} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Saving…" : "Add Vendor"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

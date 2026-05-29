import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Users, Clock, QrCode } from "lucide-react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/visitors")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    mobile: "",
    visit_type: "guest",
    visit_date: "",
    visit_time: "",
    pass_validity: "4h",
    vehicle_number: "",
    notes_for_guard: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["visitor-passes"],
    queryFn: () => residentService.getVisitors({ page_size: 50 }).then((r: any) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const passes: any[] = data?.results ?? [];

  const todayApproved = passes.filter((p: any) => p.status === "active").length;
  const pending       = passes.filter((p: any) => p.status === "pending").length;

  const mut = useMutation({
    mutationFn: (d: any) => residentService.createVisitor(d),
    onSuccess: () => {
      toast.success("Guest pass created");
      setOpen(false);
      setForm({ full_name: "", mobile: "", visit_type: "guest", visit_date: "", visit_time: "", pass_validity: "4h", vehicle_number: "", notes_for_guard: "" });
      qc.invalidateQueries({ queryKey: ["visitor-passes"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail ?? "Failed to create pass");
    },
  });

  const submit = () => {
    if (!form.full_name.trim() || !form.visit_date || !form.visit_time) {
      toast.error("Name, visit date and time are required");
      return;
    }
    mut.mutate({
      full_name: form.full_name,
      mobile: form.mobile || undefined,
      visit_type: form.visit_type,
      visit_date: form.visit_date,
      visit_time: form.visit_time,
      pass_validity: form.pass_validity,
      vehicle_number: form.vehicle_number || undefined,
      notes_for_guard: form.notes_for_guard || undefined,
    });
  };

  return (
    <div>
      <PageHeader
        title="Visitor Passes"
        description="Create and manage guest passes for your visitors."
        actions={
          <Button className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Pass
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Active Passes", value: todayApproved, icon: QrCode,  color: "text-success",   bg: "bg-success/10" },
            { label: "Pending",       value: pending,       icon: Clock,   color: "text-warning-foreground", bg: "bg-warning/10" },
            { label: "Total Passes",  value: passes.length, icon: Users,   color: "text-foreground", bg: "bg-muted/30" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">My Guest Passes</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {data?.count ?? passes.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && passes.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No visitor passes yet.</p>
          )}

          {passes.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Visitor</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Type</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Visit Date</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Valid Until</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {passes.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">
                      {p.full_name}
                      {p.mobile && <div className="text-xs text-muted-foreground">{p.mobile}</div>}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell capitalize text-muted-foreground">
                      {p.visit_type_display || p.visit_type}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                      {p.visit_date ? new Date(p.visit_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                      {p.valid_until ? new Date(p.valid_until).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Guest Pass</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Visitor Name *</Label>
                <Input
                  placeholder="Full name"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mobile</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={form.mobile}
                  onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Visit Type</Label>
                <Select value={form.visit_type} onValueChange={v => setForm(f => ({ ...f, visit_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="cab">Cab</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Visit Date *</Label>
                <Input
                  type="date"
                  value={form.visit_date}
                  onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Visit Time *</Label>
                <Input
                  type="time"
                  value={form.visit_time}
                  onChange={e => setForm(f => ({ ...f, visit_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pass Validity</Label>
                <Select value={form.pass_validity} onValueChange={v => setForm(f => ({ ...f, pass_validity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="8h">8 Hours</SelectItem>
                    <SelectItem value="24h">24 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vehicle Number</Label>
                <Input
                  placeholder="MH 01 AB 1234"
                  value={form.vehicle_number}
                  onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notes for Guard</Label>
                <Input
                  placeholder="e.g. Will arrive at Gate 2"
                  value={form.notes_for_guard}
                  onChange={e => setForm(f => ({ ...f, notes_for_guard: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={mut.isPending}>
              {mut.isPending ? "Creating…" : "Create Pass"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/complaints")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", category: "", priority: "medium", description: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["resident-complaints", search],
    queryFn: () =>
      residentService.getComplaints({ search: search || undefined, page_size: 50 }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const complaints: any[] = data?.results ?? [];

  const mut = useMutation({
    mutationFn: (d: any) => residentService.createComplaint(d),
    onSuccess: () => {
      toast.success("Complaint raised successfully");
      setOpen(false);
      setForm({ title: "", category: "", priority: "medium", description: "" });
      qc.invalidateQueries({ queryKey: ["resident-complaints"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail ?? "Failed to raise complaint");
    },
  });

  const submit = () => {
    if (!form.title.trim() || !form.category || !form.description.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    mut.mutate({ title: form.title, category: form.category, priority: form.priority, description: form.description });
  };

  return (
    <div>
      <PageHeader
        title="Complaints"
        description="Raise and track your complaints."
        actions={
          <Button className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Complaint
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search complaints…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">My Complaints</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {data?.count ?? complaints.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && complaints.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No complaints yet.</p>
          )}

          {complaints.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">ID</th>
                  <th className="px-5 py-2.5 text-left font-medium">Issue</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Category</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Raised</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.complaint_number}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{c.title}</td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground capitalize">
                      {c.category_display || c.category}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{c.raised_display}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise New Complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Complaint Title *</Label>
              <Input
                placeholder="e.g. Water leakage in bathroom"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="housekeeping">Housekeeping</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="lift">Lift</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description *</Label>
              <Textarea
                rows={4}
                placeholder="Describe the issue in detail…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={mut.isPending}>
              {mut.isPending ? "Submitting…" : "Submit Complaint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

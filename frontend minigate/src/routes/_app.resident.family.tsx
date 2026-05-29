import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Users, MoreHorizontal } from "lucide-react";
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

export const Route = createFileRoute("/_app/resident/family")({
  component: Page,
});

const RELATIONS = [
  { value: "spouse",   label: "Spouse" },
  { value: "child",    label: "Child" },
  { value: "parent",   label: "Parent" },
  { value: "sibling",  label: "Sibling" },
  { value: "other",    label: "Other" },
];

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", relation: "spouse", phone: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["family-members"],
    queryFn: () => residentService.getFamilyMembers().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const members: any[] = data?.results ?? data ?? [];

  const createMut = useMutation({
    mutationFn: (d: any) => residentService.createFamilyMember(d),
    onSuccess: () => {
      toast.success("Family member added");
      setOpen(false);
      setForm({ name: "", relation: "spouse", phone: "" });
      qc.invalidateQueries({ queryKey: ["family-members"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? "Failed to add member"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => residentService.deleteFamilyMember(id),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["family-members"] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name required"); return; }
    createMut.mutate({ name: form.name, relation: form.relation, phone: form.phone || undefined });
  };

  return (
    <>
      <PageHeader
        title="Family Members"
        description="Register family members living in your flat."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 w-fit">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-primary">{members.length}</div>
            <div className="text-xs text-muted-foreground">Family Members</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && members.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No family members added yet.</p>
          )}
          {members.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Name</th>
                  <th className="px-5 py-2.5 text-left font-medium">Relation</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Phone</th>
                  <th className="w-10 px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">{m.name}</td>
                    <td className="px-5 py-3 text-muted-foreground capitalize">
                      {m.relation_display || m.relation}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">{m.phone || "—"}</td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-md p-1.5 hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { if (confirm(`Remove ${m.name}?`)) deleteMut.mutate(m.id); }}
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
          <DialogHeader><DialogTitle>Add Family Member</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Relation</Label>
                <Select value={form.relation} onValueChange={v => setForm(f => ({ ...f, relation: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELATIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Adding…" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

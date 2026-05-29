import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// @ts-ignore
import { supportService } from "@/services/support.service.js";

export const Route = createFileRoute("/_app/support/escalations")({
  component: Page,
});

const STATUS_COLORS: Record<string, string> = {
  open:     "bg-sky-50 text-sky-700 border-sky-200",
  reviewed: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function NewEscalationModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ticket: "", escalated_to_role: "society-admin", reason: "" });

  const create = useMutation({
    mutationFn: () => supportService.createEscalation(form),
    onSuccess: () => {
      toast.success("Escalation raised");
      qc.invalidateQueries({ queryKey: ["support-escalations"] });
      onClose();
    },
    onError: () => toast.error("Failed to raise escalation"),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Raise Escalation</DialogTitle></DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Ticket ID *</label>
          <Input placeholder="Enter ticket database ID" value={form.ticket}
            onChange={e => setForm(p => ({ ...p, ticket: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Escalate To</label>
          <Select value={form.escalated_to_role} onValueChange={v => setForm(p => ({ ...p, escalated_to_role: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="society-admin">Society Admin</SelectItem>
              <SelectItem value="super-admin">Super Admin / Platform Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Reason *</label>
          <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
            rows={3} placeholder="Why is this being escalated?"
            value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending || !form.ticket || !form.reason}>
            {create.isPending ? "Submitting…" : "Raise Escalation"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function Page() {
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["support-escalations", statusFilter],
    queryFn: () => supportService.getEscalations({ status: statusFilter || undefined }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const items: any[] = data?.results ?? [];

  return (
    <>
      <PageHeader
        title="Escalations"
        description="Escalated tickets requiring admin attention"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Raise Escalation
          </Button>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">Escalations</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">{data?.count ?? items.length}</span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading escalations…</p>}
          {!isLoading && items.length === 0 && (
            <div className="py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No escalations found.</p>
            </div>
          )}

          <div className="divide-y divide-border">
            {items.map((item: any) => (
              <div key={item.id} className="px-5 py-4 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-destructive/5 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{item.ticket_subject}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{item.ticket_ref}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_COLORS[item.status] ?? ""}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Escalated to: <span className="capitalize font-medium">{item.escalated_to_role.replace("-", " ")}</span>
                    {item.escalated_by_name && ` · by ${item.escalated_by_name}`}
                  </div>
                  {item.reason && (
                    <div className="mt-1.5 rounded-lg bg-muted/30 px-3 py-1.5 text-xs text-foreground/80 line-clamp-2">
                      {item.reason}
                    </div>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                    {item.reviewed_by_name && ` · Reviewed by ${item.reviewed_by_name}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        {showModal && <NewEscalationModal onClose={() => setShowModal(false)} />}
      </Dialog>
    </>
  );
}

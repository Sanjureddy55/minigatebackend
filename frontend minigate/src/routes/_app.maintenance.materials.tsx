import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Package } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// @ts-ignore
import { maintenanceService } from "@/services/maintenance.service.js";

export const Route = createFileRoute("/_app/maintenance/materials")({
  component: Page,
});

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-sky-50 text-sky-700 border-sky-200",
  approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
  issued:    "bg-violet-50 text-violet-700 border-violet-200",
};

function RequestModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    item_name: "", quantity: "", unit: "", purpose: "", notes: "",
  });

  const create = useMutation({
    mutationFn: () => maintenanceService.createMaterial(form),
    onSuccess: () => {
      toast.success("Materials request submitted");
      qc.invalidateQueries({ queryKey: ["maintenance-materials"] });
      onClose();
    },
    onError: () => toast.error("Failed to submit request"),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Request Materials</DialogTitle></DialogHeader>
      <div className="space-y-3 pt-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Item Name *</label>
          <Input placeholder="e.g. PVC Pipe, Electrical Wire" value={form.item_name} onChange={set("item_name")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Quantity *</label>
            <Input type="number" placeholder="e.g. 10" value={form.quantity} onChange={set("quantity")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Unit</label>
            <Input placeholder="e.g. meters, pcs" value={form.unit} onChange={set("unit")} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Purpose</label>
          <Input placeholder="Which task is this for?" value={form.purpose} onChange={set("purpose")} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Notes</label>
          <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
            rows={2} placeholder="Any additional details…" value={form.notes} onChange={set("notes")} />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending || !form.item_name}>
            {create.isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function Page() {
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-materials"],
    queryFn: () => maintenanceService.getMaterials().then((r: any) => r.data),
    staleTime: 30_000,
  });

  const items: any[] = data?.results ?? [];

  return (
    <>
      <PageHeader
        title="Materials Request"
        description="Request supplies and track approval status"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> New Request
          </Button>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">My Requests</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">{items.length}</span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading requests…</p>}
          {!isLoading && items.length === 0 && (
            <div className="py-12 text-center">
              <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No materials requested yet.</p>
              <button onClick={() => setShowModal(true)} className="mt-2 text-sm font-semibold text-primary hover:underline">
                Submit first request →
              </button>
            </div>
          )}

          <div className="divide-y divide-border">
            {items.map((item: any) => (
              <div key={item.id} className="px-5 py-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{item.item_name}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_COLORS[item.status] ?? ""}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Qty: {item.quantity} {item.unit && `${item.unit}`}
                    {item.purpose && ` · ${item.purpose}`}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-muted-foreground mt-0.5">{item.notes}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                    {item.approved_by_name && ` · Approved by ${item.approved_by_name}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        {showModal && <RequestModal onClose={() => setShowModal(false)} />}
      </Dialog>
    </>
  );
}

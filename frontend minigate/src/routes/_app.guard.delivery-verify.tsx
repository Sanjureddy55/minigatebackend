import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, PackagePlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// @ts-ignore
import { guardService } from "@/services/guard.service.js";

export const Route = createFileRoute("/_app/guard/delivery-verify")({
  component: Page,
});

const VENDORS = [
  { value: "amazon",     label: "Amazon" },
  { value: "flipkart",   label: "Flipkart" },
  { value: "swiggy",     label: "Swiggy" },
  { value: "zomato",     label: "Zomato" },
  { value: "bigbasket",  label: "BigBasket" },
  { value: "blinkit",    label: "Blinkit" },
  { value: "zepto",      label: "Zepto" },
  { value: "meesho",     label: "Meesho" },
  { value: "myntra",     label: "Myntra" },
  { value: "dunzo",      label: "Dunzo" },
  { value: "dtdc",       label: "DTDC Courier" },
  { value: "bluedart",   label: "Blue Dart" },
  { value: "delhivery",  label: "Delhivery" },
  { value: "india_post", label: "India Post" },
  { value: "other",      label: "Other" },
];

const DELIVERY_TYPES = [
  { value: "package",  label: "Package / Parcel" },
  { value: "food",     label: "Food / Restaurant" },
  { value: "courier",  label: "Courier / Express" },
  { value: "grocery",  label: "Grocery" },
  { value: "medicine", label: "Medicine / Pharmacy" },
  { value: "flowers",  label: "Flowers / Gifts" },
  { value: "other",    label: "Other" },
];

const EMPTY_FORM = {
  agent_name: "", agent_mobile: "", vendor: "other",
  tracking_id: "", delivery_type: "package",
  flat_number_raw: "", recipient_name: "",
  package_desc: "", notes: "",
};

function Page() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const today = new Date().toISOString().split("T")[0];

  const { data: listData, isLoading } = useQuery({
    queryKey: ["deliveries-today"],
    queryFn: () =>
      guardService.getDeliveries({ date: today, page_size: 30 })
        .then((r: any) => r.data.results ?? []),
    refetchInterval: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => guardService.createDelivery(data),
    onSuccess: () => {
      toast.success(`Delivery from ${form.agent_name} logged`);
      setForm({ ...EMPTY_FORM });
      qc.invalidateQueries({ queryKey: ["deliveries-today"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? "Failed to log delivery"),
  });

  const approve = useMutation({
    mutationFn: (id: number) => guardService.approveDelivery(id),
    onSuccess: () => { toast.success("Delivery approved"); qc.invalidateQueries({ queryKey: ["deliveries-today"] }); },
    onError: () => toast.error("Approval failed"),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const deliveries: any[] = listData ?? [];
  const pending = deliveries.filter((d) => d.status === "pending").length;

  return (
    <>
      <PageHeader
        title="Delivery Verify"
        description="Log incoming deliveries and manage approvals"
        actions={
          pending > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-bold text-warning-foreground">
              {pending} pending
            </span>
          ) : undefined
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_400px]">
        {/* ── Log New Delivery ──────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Log New Delivery</h2>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Vendor / App</Label>
                <Select value={form.vendor} onValueChange={(v) => setForm((f) => ({ ...f, vendor: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDORS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Type</Label>
                <Select value={form.delivery_type} onValueChange={(v) => setForm((f) => ({ ...f, delivery_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_TYPES.map((dt) => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent_name">Agent / Rider Name *</Label>
                <Input id="agent_name" value={form.agent_name} onChange={set("agent_name")} placeholder="Delivery person's name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent_mobile">Agent Mobile</Label>
                <Input id="agent_mobile" value={form.agent_mobile} onChange={set("agent_mobile")} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tracking_id">Tracking ID / Order ID</Label>
                <Input id="tracking_id" value={form.tracking_id} onChange={set("tracking_id")} placeholder="e.g. AMZN-9876543" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="flat_number_raw">Delivering To (Flat) *</Label>
                <Input id="flat_number_raw" value={form.flat_number_raw} onChange={set("flat_number_raw")} placeholder="e.g. A-402" required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="recipient_name">Recipient Name</Label>
                <Input id="recipient_name" value={form.recipient_name} onChange={set("recipient_name")} placeholder="Resident who should receive it" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="package_desc">Package Description</Label>
              <Textarea id="package_desc" value={form.package_desc} onChange={set("package_desc")} placeholder="Brief description (optional)" rows={2} />
            </div>

            <Button type="submit" className="w-full gap-1.5" disabled={create.isPending}>
              <PackagePlus className="h-4 w-4" />
              {create.isPending ? "Logging…" : "Log Delivery"}
            </Button>
          </form>
        </div>

        {/* ── Today's Deliveries ────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">Today's Deliveries</span>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {deliveries.length}
            </span>
          </div>

          {isLoading && <p className="p-5 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && deliveries.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No deliveries today yet.</p>
          )}

          <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
            {deliveries.map((d: any) => {
              const dest = d.flat_number || d.flat_number_raw || "—";
              const arrived = new Date(d.arrived_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={d.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="h-9 w-9 rounded-xl bg-warning/10 text-warning-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {(d.vendor_display || d.vendor || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{d.agent_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {d.vendor_display || d.vendor} · {dest}
                      {d.recipient_name ? ` · ${d.recipient_name}` : ""}
                    </div>
                    {d.tracking_id && (
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{d.tracking_id}</div>
                    )}
                    {d.status === "pending" && (
                      <button
                        onClick={() => approve.mutate(d.id)}
                        disabled={approve.isPending}
                        className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success hover:bg-success/20 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold text-foreground">{arrived}</span>
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

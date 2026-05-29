import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Send, Upload, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
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
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/maintenance-expenses")({
  component: Page,
});

const CATEGORIES = [
  { value: "security",      label: "Security Salary" },
  { value: "housekeeping",  label: "Housekeeping" },
  { value: "lift",          label: "Lift Maintenance" },
  { value: "water",         label: "Water Tanker" },
  { value: "electricity",   label: "Electricity" },
  { value: "gardening",     label: "Gardening" },
  { value: "repairs",       label: "Repairs" },
  { value: "insurance",     label: "Insurance" },
  { value: "administrative",label: "Administrative" },
  { value: "other",         label: "Other" },
];

const PAYMENT_MODES = [
  { value: "upi",           label: "UPI" },
  { value: "cash",          label: "Cash" },
  { value: "cheque",        label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "online",        label: "Online" },
];

function fmt(v: number | string) {
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function Page() {
  const qc = useQueryClient();
  const societyId = useSelector((s: any) => s.auth?.legacyUser?.society_id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "other",
    amount: "",
    vendor_name: "",
    payment_mode: "upi",
    invoice_number: "",
    building_area: "",
    expense_date: new Date().toISOString().slice(0, 10),
    is_published: false,
    notes: "",
  });

  const resetForm = () => {
    setForm({
      title: "", category: "other", amount: "", vendor_name: "",
      payment_mode: "upi", invoice_number: "", building_area: "",
      expense_date: new Date().toISOString().slice(0, 10),
      is_published: false, notes: "",
    });
    setProofFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", societyId],
    queryFn: () => societyService.getExpenses({ society: societyId }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const expenses: any[] = data?.results ?? data ?? [];

  const createMut = useMutation({
    mutationFn: (payload: any) => societyService.createExpense(payload),
    onSuccess: () => {
      toast.success("Expense recorded");
      setOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err: any) => {
      const d = err.response?.data;
      const msg = d?.detail ?? (typeof d === "object" ? Object.values(d).flat().join(" ") : null) ?? "Failed to save";
      toast.error(msg);
    },
  });

  const publishMut = useMutation({
    mutationFn: (id: number) => societyService.updateExpense(id, { is_published: true }),
    onSuccess: () => { toast.success("Published to residents"); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: () => toast.error("Failed to publish"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) {
      toast.error("Title and amount are required");
      return;
    }

    if (proofFile) {
      const fd = new FormData();
      fd.append("society", String(societyId));
      fd.append("title", form.title.trim());
      fd.append("category", form.category);
      fd.append("amount", String(form.amount));
      fd.append("vendor_name", form.vendor_name);
      fd.append("payment_mode", form.payment_mode);
      fd.append("expense_date", form.expense_date);
      fd.append("is_published", form.is_published ? "true" : "false");
      if (form.invoice_number) fd.append("invoice_number", form.invoice_number);
      if (form.building_area) fd.append("building_area", form.building_area);
      if (form.notes) fd.append("notes", form.notes);
      fd.append("proof_file", proofFile);
      createMut.mutate(fd);
    } else {
      createMut.mutate({
        society: societyId,
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        vendor_name: form.vendor_name,
        payment_mode: form.payment_mode,
        invoice_number: form.invoice_number || undefined,
        building_area: form.building_area || undefined,
        expense_date: form.expense_date,
        is_published: form.is_published,
        notes: form.notes || undefined,
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Maintenance Expenses"
        description="Add, publish, and manage society maintenance expenses."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        }
      />

      <div className="p-4 md:p-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5">
            <p className="font-semibold text-sm text-foreground">Expense Records</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Society Admin can add expenses, upload proof, and publish them to residents.
            </p>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && expenses.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No expenses recorded yet.</p>
          )}

          {expenses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-5 py-3 text-left font-bold">Expense</th>
                    <th className="px-5 py-3 text-left font-bold">Category</th>
                    <th className="px-5 py-3 text-left font-bold">Amount</th>
                    <th className="px-5 py-3 text-left font-bold hidden sm:table-cell">Vendor</th>
                    <th className="px-5 py-3 text-left font-bold hidden md:table-cell">Proof</th>
                    <th className="px-5 py-3 text-left font-bold hidden md:table-cell">Visibility</th>
                    <th className="px-5 py-3 text-left font-bold">Status</th>
                    <th className="px-5 py-3 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((ex: any) => {
                    const proofUrl = ex.proof_file_url || ex.proof_url;
                    return (
                      <tr key={ex.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-5 py-3.5 font-medium text-foreground">{ex.title}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{ex.category_display || ex.category}</td>
                        <td className="px-5 py-3.5 text-foreground">{fmt(ex.amount)}</td>
                        <td className="px-5 py-3.5 hidden sm:table-cell text-muted-foreground">{ex.vendor_name || "—"}</td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          {proofUrl ? (
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-xs hover:underline flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              {ex.proof_file ? "View file" : proofUrl.split("/").pop()?.slice(0, 20)}
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                          {ex.visibility_display || (ex.is_published ? "Visible" : "Hidden")}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            ex.is_published
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {ex.status_display || (ex.is_published ? "Published" : "Draft")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {proofUrl && (
                            <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs mr-1.5">
                                <ExternalLink className="h-3 w-3" /> Proof
                              </Button>
                            </a>
                          )}
                          {!ex.is_published && (
                            <Button size="sm" className="h-7 gap-1.5 text-xs"
                              onClick={() => publishMut.mutate(ex.id)}>
                              <Send className="h-3 w-3" /> Publish
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Maintenance Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Row 1 */}
              <div className="space-y-1.5">
                <Label className="text-xs">Expense Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Lift Maintenance"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expense Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 2 */}
              <div className="space-y-1.5">
                <Label className="text-xs">Expense Amount (₹) *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="12000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vendor / Paid To</Label>
                <Input
                  value={form.vendor_name}
                  onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
                  placeholder="e.g. Elevate Services"
                />
              </div>

              {/* Row 3 */}
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Date</Label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Mode</Label>
                <Select value={form.payment_mode} onValueChange={v => setForm(f => ({ ...f, payment_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 4 */}
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice Number</Label>
                <Input
                  value={form.invoice_number}
                  onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                  placeholder="e.g. INV-1024"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Building / Common Area</Label>
                <Input
                  value={form.building_area}
                  onChange={e => setForm(f => ({ ...f, building_area: e.target.value }))}
                  placeholder="e.g. Tower A / Common Area"
                />
              </div>

              {/* Proof Upload */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Proof Upload (PDF, Image)</Label>
                <div
                  className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {proofFile ? proofFile.name : "Click to upload invoice / receipt"}
                  </span>
                  {proofFile && (
                    <button
                      type="button"
                      className="ml-auto text-xs text-destructive hover:underline"
                      onClick={e => { e.stopPropagation(); setProofFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Visibility & Status */}
              <div className="space-y-1.5">
                <Label className="text-xs">Visibility to Residents</Label>
                <Select
                  value={form.is_published ? "visible" : "hidden"}
                  onValueChange={v => setForm(f => ({ ...f, is_published: v === "visible" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visible">Visible (Published)</SelectItem>
                    <SelectItem value="hidden">Hidden (Draft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <div className="flex items-center h-10 rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                  {form.is_published ? "Published" : "Draft"}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Enter expense details…"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Saving…" : "Add Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Play, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// @ts-ignore
import { accountantService } from "@/services/accountant.service.js";

export const Route = createFileRoute("/_app/accounting/generate")({
  component: Page,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function Page() {
  const qc = useQueryClient();
  const now = new Date();
  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    amount: "",
    due_day: 10,
    description: "Monthly Maintenance",
  });
  const [result, setResult] = useState<any>(null);

  const mut = useMutation({
    mutationFn: (data: any) => accountantService.generateDues(data),
    onSuccess: (r: any) => {
      const res = r.data;
      setResult(res);
      toast.success(`Generated ${res.created ?? "bills"} dues for ${MONTHS[form.month - 1]} ${form.year}`);
      qc.invalidateQueries({ queryKey: ["pending-dues"] });
      qc.invalidateQueries({ queryKey: ["pending-dues-summary"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail ?? "Failed to generate bills");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    mut.mutate({
      year: form.year,
      month: form.month,
      amount: parseFloat(form.amount),
      due_day: form.due_day,
      description: form.description,
    });
  };

  return (
    <>
      <PageHeader
        title="Generate Bills"
        description="Run a billing cycle to generate dues for all active flats."
      />

      <div className="space-y-6 p-4 sm:p-6 max-w-lg">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-foreground">Billing Cycle</span>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Month *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={form.month}
                  onChange={e => setForm(f => ({ ...f, month: +e.target.value }))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Year *</Label>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: +e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (₹) *</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="12500"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Due Day (1-28)</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.due_day}
                  onChange={e => setForm(f => ({ ...f, due_day: +e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Monthly Maintenance"
              />
            </div>

            <Button type="submit" className="gap-1.5 w-full" disabled={mut.isPending}>
              <Play className="h-4 w-4" />
              {mut.isPending ? "Generating…" : "Run Billing Cycle"}
            </Button>
          </form>

          {result && (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success font-medium">
              {result.message || `Created ${result.created ?? 0} dues, skipped ${result.skipped ?? 0} existing.`}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

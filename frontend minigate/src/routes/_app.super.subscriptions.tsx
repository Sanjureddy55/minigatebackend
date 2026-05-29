import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, DollarSign, Activity, Users, TrendingDown, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { platformService } from "@/services/platform.service.js";

export const Route = createFileRoute("/_app/super/subscriptions")({
  component: Page,
});

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);

  const { data: statsData } = useQuery({
    queryKey: ["plan-stats"],
    queryFn: () =>
      platformService.getPlans({ stats: true })
        .then((_: any) => platformService.getPlans({ page_size: 1 }))
        .then((r: any) => r.data),
    staleTime: 60_000,
  });

  const { data: plansData, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => platformService.getPlans({ page_size: 50 }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const plans: any[] = plansData?.results ?? [];

  const activePlans = plans.filter((p: any) => p.status === "active").length;
  const trialPlans  = plans.filter((p: any) => p.is_trial).length;
  const totalTenants = plans.reduce((s: number, p: any) => s + (p.tenants ?? 0), 0);

  const stats = [
    { label: "Active Plans",   value: activePlans,   icon: Activity,     color: "text-success",      bg: "bg-success/10" },
    { label: "Trial / Free",   value: trialPlans,    icon: Users,        color: "text-sky-600",      bg: "bg-sky-500/10" },
    { label: "Total Tenants",  value: totalTenants,  icon: TrendingDown, color: "text-foreground",   bg: "bg-muted/30" },
    { label: "Total Plans",    value: plans.length,  icon: DollarSign,   color: "text-primary",      bg: "bg-primary/10" },
  ];

  const deleteMut = useMutation({
    mutationFn: (id: number) => platformService.deletePlan(id),
    onSuccess: () => {
      toast.success("Plan deleted");
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? "Failed to delete"),
  });

  return (
    <>
      <PageHeader
        title="Subscription Plans"
        description="Manage pricing tiers and per-tenant subscriptions."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setEditPlan(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New Plan
          </Button>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
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
            <span className="font-semibold text-sm text-foreground">All Plans</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {plans.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && plans.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No plans yet.{" "}
              <button onClick={() => setOpen(true)} className="text-primary underline">Create one</button>.
            </p>
          )}

          {plans.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Plan</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Slug</th>
                    <th className="px-5 py-2.5 text-left font-medium">Price</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Max Flats</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Tenants</th>
                    <th className="px-5 py-2.5 text-left font-medium">Status</th>
                    <th className="w-10 px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p: any) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          {p.name}
                          {p.is_popular && (
                            <span className="rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                              Popular
                            </span>
                          )}
                          {p.is_trial && (
                            <span className="rounded-full bg-sky-500/10 border border-sky-300/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-600">
                              Trial
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{p.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell font-mono text-xs text-muted-foreground">{p.slug}</td>
                      <td className="px-5 py-3 font-semibold">{p.price_display}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{p.max_flats ?? "—"}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{p.tenants ?? 0}</td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-md p-1.5 hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditPlan(p); setOpen(true); }}>Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if ((p.tenants ?? 0) > 0) {
                                  toast.error("Cannot delete — societies are using this plan");
                                  return;
                                }
                                if (confirm(`Delete plan "${p.name}"?`)) deleteMut.mutate(p.id);
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <PlanDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditPlan(null); }}
        plan={editPlan}
        onSaved={() => qc.invalidateQueries({ queryKey: ["plans"] })}
      />
    </>
  );
}

function PlanDialog({
  open,
  onOpenChange,
  plan,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: any;
  onSaved?: () => void;
}) {
  const isEdit = !!plan;
  const [form, setForm] = useState({
    name: plan?.name ?? "",
    slug: plan?.slug ?? "",
    description: plan?.description ?? "",
    monthly_price: plan?.monthly_price ?? "0",
    annual_price: plan?.annual_price ?? "0",
    max_flats: plan?.max_flats ?? "",
    max_users: plan?.max_users ?? "",
    is_popular: plan?.is_popular ?? false,
    is_trial: plan?.is_trial ?? false,
    is_custom_pricing: plan?.is_custom_pricing ?? false,
    status: plan?.status ?? "active",
    sort_order: plan?.sort_order ?? 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setName = (name: string) => {
    setForm(f => ({ ...f, name, slug: isEdit ? f.slug : slugify(name) }));
  };

  const mut = useMutation({
    mutationFn: (data: any) =>
      isEdit ? platformService.updatePlan(plan.id, data) : platformService.createPlan(data),
    onSuccess: () => {
      toast.success(isEdit ? "Plan updated" : "Plan created");
      onSaved?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const fieldErrors: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]) => {
          fieldErrors[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(fieldErrors);
        toast.error("Please fix the errors");
      } else {
        toast.error("Failed to save plan");
      }
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Plan name required";
    if (!form.slug.trim()) next.slug = "Slug required";
    setErrors(next);
    if (Object.keys(next).length) return;

    mut.mutate({
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description,
      monthly_price: form.is_custom_pricing ? "0" : form.monthly_price,
      annual_price: form.is_custom_pricing ? "0" : form.annual_price,
      max_flats: form.max_flats ? Number(form.max_flats) : null,
      max_users: form.max_users ? Number(form.max_users) : null,
      is_popular: form.is_popular,
      is_trial: form.is_trial,
      is_custom_pricing: form.is_custom_pricing,
      status: form.status,
      sort_order: Number(form.sort_order),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Plan" : "New Subscription Plan"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update plan details." : "Create a pricing tier for societies."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Plan name *</Label>
              <Input
                value={form.name}
                onChange={e => setName(e.target.value)}
                placeholder="Pro Max"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Slug *</Label>
              <Input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="pro-max"
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Everything you need for a large society"
              />
            </div>

            {!form.is_custom_pricing && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly price (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.monthly_price}
                    onChange={e => setForm(f => ({ ...f, monthly_price: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Annual price (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.annual_price}
                    onChange={e => setForm(f => ({ ...f, annual_price: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Max flats</Label>
              <Input
                type="number"
                min={0}
                value={form.max_flats}
                onChange={e => setForm(f => ({ ...f, max_flats: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Max users</Label>
              <Input
                type="number"
                min={0}
                value={form.max_users}
                onChange={e => setForm(f => ({ ...f, max_users: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Sort order</Label>
              <Input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_popular}
                onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-foreground">Popular</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_trial}
                onChange={e => setForm(f => ({ ...f, is_trial: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-foreground">Trial / Free</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_custom_pricing}
                onChange={e => setForm(f => ({ ...f, is_custom_pricing: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-foreground">Custom pricing</span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

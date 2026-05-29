import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Download, Search, MoreHorizontal, Building2, Users, Ban, Activity } from "lucide-react";
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

export const Route = createFileRoute("/_app/super/societies/")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["societies", q, statusFilter],
    queryFn: () =>
      platformService.getSocieties({
        search: q || undefined,
        status: statusFilter || undefined,
        page_size: 50,
      }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const societies: any[] = data?.results ?? [];
  const total = data?.count ?? 0;

  const active    = societies.filter((s: any) => s.status === "active").length;
  const suspended = societies.filter((s: any) => s.status === "suspended").length;
  const inactive  = societies.filter((s: any) => s.status === "inactive").length;

  const stats = [
    { label: "Total",     value: total,     icon: Building2, color: "text-foreground",   bg: "bg-muted/30" },
    { label: "Active",    value: active,    icon: Activity,  color: "text-success",       bg: "bg-success/10" },
    { label: "Suspended", value: suspended, icon: Ban,       color: "text-destructive",   bg: "bg-destructive/10" },
    { label: "Inactive",  value: inactive,  icon: Users,     color: "text-muted-foreground", bg: "bg-muted/30" },
  ];

  const suspendMut = useMutation({
    mutationFn: (id: string) => platformService.updateSociety(id, { status: "suspended" }),
    onSuccess: () => {
      toast.success("Society suspended");
      qc.invalidateQueries({ queryKey: ["societies"] });
    },
    onError: () => toast.error("Failed to suspend society"),
  });

  return (
    <>
      <PageHeader
        title="Society Management"
        description="Onboard, suspend or update tenants on the platform."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Export started")}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add Society
            </Button>
          </>
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

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search society or city..."
                className="pl-8 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Society</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">City</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Flats</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Plan</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="w-10 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</td>
                  </tr>
                )}
                {!isLoading && societies.map((s: any) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <div>{s.name}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">
                        {s.city_name} · {s.total_flats} flats · {s.plan_display}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{s.city_name || "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{s.total_flats}</td>
                    <td className="px-4 py-3 hidden md:table-cell capitalize">{s.plan_display || s.plan}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-md p-1.5 hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.info(`Viewing ${s.name}`)}>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info(`Edit ${s.name} — coming soon`)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={s.status === "suspended" || suspendMut.isPending}
                            onClick={() => {
                              if (confirm(`Suspend ${s.name}? This will restrict access for all residents.`))
                                suspendMut.mutate(s.id);
                            }}
                          >
                            Suspend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {!isLoading && societies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No societies found.{" "}
                      <button onClick={() => setOpen(true)} className="text-primary underline">Add one</button>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddSocietyDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["societies"] })}
      />
    </>
  );
}

function AddSocietyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    city: "",
    total_flats: 100,
    plan: "free",
    status: "active",
    admin_email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: citiesData } = useQuery({
    queryKey: ["cities"],
    queryFn: () => platformService.getCities().then((r: any) => r.data?.results ?? r.data),
    staleTime: 300_000,
    enabled: open,
  });
  const cities: any[] = citiesData ?? [];

  const mut = useMutation({
    mutationFn: (data: any) => platformService.createSociety(data),
    onSuccess: () => {
      toast.success(`${form.name} created`);
      onCreated?.();
      onOpenChange(false);
      setForm({ name: "", city: "", total_flats: 100, plan: "free", status: "active", admin_email: "" });
      setErrors({});
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
        toast.error("Failed to create society");
      }
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Society name required";
    if (!form.city) next.city = "City required";
    if (!form.total_flats || form.total_flats < 1) next.total_flats = "At least 1 flat";
    if (!form.admin_email.trim()) next.admin_email = "Admin email required";
    else if (!/^\S+@\S+\.\S+$/.test(form.admin_email)) next.admin_email = "Invalid email";
    setErrors(next);
    if (Object.keys(next).length) return;

    mut.mutate({
      name: form.name.trim(),
      city: Number(form.city),
      total_flats: form.total_flats,
      plan: form.plan,
      status: form.status,
      admin_email: form.admin_email.trim().toLowerCase(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Society</DialogTitle>
          <DialogDescription>Provision a new tenant on the platform.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Society name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Greenwood Heights"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">City *</Label>
              <Select value={form.city} onValueChange={v => setForm(f => ({ ...f, city: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={cities.length === 0 ? "Loading cities…" : "Select city"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}{c.state ? `, ${c.state}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Total flats *</Label>
              <Input
                type="number"
                min={1}
                value={form.total_flats}
                onChange={e => setForm(f => ({ ...f, total_flats: +e.target.value }))}
              />
              {errors.total_flats && <p className="text-xs text-destructive">{errors.total_flats}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Plan</Label>
              <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Society admin email *</Label>
              <Input
                value={form.admin_email}
                onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))}
                placeholder="admin@society.com"
                type="email"
              />
              {errors.admin_email && <p className="text-xs text-destructive">{errors.admin_email}</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Creating…" : "Create Society"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

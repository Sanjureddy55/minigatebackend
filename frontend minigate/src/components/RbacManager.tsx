import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Plus, UserPlus, Trash2, Check, X, Shield } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

const DISPLAY_MODULES = [
  "Residents", "Visitors", "Approvals", "Billing",
  "Security Alerts", "Settings", "Audit Logs", "Reports",
];

function hasModule(role: any, module: string): boolean {
  const perms: any[] = role.module_permissions ?? [];
  return perms.some(
    (p: any) =>
      (p.module_display ?? p.module ?? "").toLowerCase() === module.toLowerCase() &&
      p.can_view,
  );
}

export function RbacManager({ title, description }: { title: string; description?: string }) {
  const qc = useQueryClient();
  const societyId = useSelector((s: any) => s.auth?.legacyUser?.society_id);
  const [open, setOpen] = useState(false);

  const { data: dashData } = useQuery({
    queryKey: ["role-dashboard", societyId],
    queryFn: () =>
      societyService.getRoleDashboard({ society: societyId }).then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["roles", societyId],
    queryFn: () =>
      societyService.getRoles({ page_size: 50 }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const roles: any[] = rolesData?.results ?? rolesData ?? [];

  // Build role cards from dashboard data (includes all roles, even protected)
  const byRole: any[] = dashData?.by_role ?? [];

  // KPI cards: merge dashboard by_role with roles list
  const kpiRoles = byRole.length > 0 ? byRole : roles.map((r: any) => ({
    role__name: r.name,
    role__id: r.id,
    user_count: r.user_count ?? 0,
  }));

  const deleteMut = useMutation({
    mutationFn: (id: number) => societyService.deleteRole(id),
    onSuccess: () => {
      toast.success("Role deleted");
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["role-dashboard"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? "Cannot delete role"),
  });

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Create Role
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-5">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {/* Role KPI cards */}
        {kpiRoles.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpiRoles.map((r: any) => {
              const roleName = r.role__name ?? r.name;
              const count = r.user_count ?? 0;
              const roleDetail = roles.find((rl: any) => rl.name === roleName);
              const permCount = roleDetail?.module_permissions?.length ?? 0;
              return (
                <div key={r.role__id ?? r.id ?? roleName} className="rounded-xl border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground truncate">{roleName}</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">{count.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{permCount} permissions</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Permission matrix */}
        {roles.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Permission matrix</h3>
              <span className="text-xs text-muted-foreground hidden sm:inline">Click any cell to toggle</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium sticky left-0 bg-muted/30">Module</th>
                  {roles.map((r: any) => (
                    <th key={r.id} className="px-4 py-2.5 text-center font-medium whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <span>{r.name}</span>
                        {!r.system_role && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete role "${r.name}"? This cannot be undone.`)) {
                                deleteMut.mutate(r.id);
                              }
                            }}
                            className="text-muted-foreground/50 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        {r.system_role && <Shield className="h-3 w-3 text-muted-foreground/40" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DISPLAY_MODULES.map(mod => (
                  <tr key={mod} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card">{mod}</td>
                    {roles.map((r: any) => {
                      const on = hasModule(r, mod);
                      return (
                        <td key={r.id} className="px-4 py-3 text-center">
                          {on
                            ? <Check className="h-4 w-4 text-success inline-block" />
                            : <X className="h-4 w-4 text-muted-foreground/30 inline-block" />
                          }
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && roles.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No roles found. Create one to get started.</p>
          </div>
        )}
      </div>

      <CreateUserDialog
        open={open}
        onOpenChange={setOpen}
        roles={roles}
        societyId={societyId}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["roles"] });
          qc.invalidateQueries({ queryKey: ["role-dashboard"] });
        }}
      />
    </>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  roles,
  societyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: any[];
  societyId: any;
  onCreated?: () => void;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mobile: "",
    status: "active",
    description: "",
    role_type: "operational",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setSelectedRoleId(roles[0]?.id ? String(roles[0].id) : "");
    setForm({ full_name: "", email: "", mobile: "", status: "active", description: "", role_type: "operational" });
    setErrors({});
  };

  const assignMut = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: any }) =>
      societyService.assignUser(roleId, data),
    onSuccess: (res: any) => {
      const pwd = res.data?.data?.password ?? "123456";
      const name = form.full_name;
      toast.success(`${name} created`, {
        description: `Login: ${form.email} · Password: ${pwd}`,
        duration: 8000,
      });
      onCreated?.();
      onOpenChange(false);
      reset();
    },
    onError: (err: any) => {
      const d = err.response?.data;
      if (d && typeof d === "object") {
        const fieldErrors: Record<string, string> = {};
        Object.entries(d).forEach(([k, v]) => {
          fieldErrors[k] = Array.isArray(v) ? (v as string[])[0] : String(v);
        });
        setErrors(fieldErrors);
        toast.error("Please fix the errors above");
      } else {
        toast.error(d?.detail ?? "Failed to create user");
      }
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!selectedRoleId) next.role = "Select a role";
    if (!form.full_name.trim()) next.full_name = "Full name required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Valid email required";
    if (!form.mobile.trim()) next.mobile = "Mobile required";
    setErrors(next);
    if (Object.keys(next).length) return;

    assignMut.mutate({
      roleId: selectedRoleId,
      data: {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim(),
        status: form.status,
        description: form.description.trim() || undefined,
        society: societyId,
      },
    });
  };

  // Available roles from the list (non-protected)
  const assignableRoles = roles.filter((r: any) => !r.system_role);

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Create Role Assignment
          </DialogTitle>
          <DialogDescription>
            Assign a platform role with full account details and module permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Role *</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Role type</Label>
              <Select value={form.role_type} onValueChange={v => setForm(f => ({ ...f, role_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Full name *</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar"
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email address *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@society.io"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Mobile number *</Label>
              <Input
                value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                placeholder="+91 90000 00000"
              />
              {errors.mobile && <p className="text-xs text-destructive">{errors.mobile}</p>}
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Notes about this role's responsibilities"
            />
          </div>

          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            A welcome email with login credentials (password: 123456) will be sent to the user's email.
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={assignMut.isPending}>
              {assignMut.isPending ? "Creating…" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

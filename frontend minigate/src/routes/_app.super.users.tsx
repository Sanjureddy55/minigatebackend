import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, UserCheck, UserX, Clock, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
// @ts-ignore
import { platformService } from "@/services/platform.service.js";

export const Route = createFileRoute("/_app/super/users")({
  component: Page,
});

// ── Invite User Modal ─────────────────────────────────────────────────────────

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: "", email: "", mobile: "",
    role_id: "", society_id: "", flat_number: "", password: "",
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles-list"],
    queryFn: () => platformService.getRoles().then((r: any) => r.data),
    staleTime: 300_000,
  });

  const { data: societiesData } = useQuery({
    queryKey: ["societies-list"],
    queryFn: () => platformService.getSocieties({ page_size: 100 }).then((r: any) => r.data),
    staleTime: 300_000,
  });

  const roles:     any[] = Array.isArray(rolesData)      ? rolesData      : rolesData?.results      ?? [];
  const societies: any[] = Array.isArray(societiesData)  ? societiesData  : societiesData?.results  ?? [];

  const invite = useMutation({
    mutationFn: () =>
      platformService.inviteUser({
        ...form,
        role_id:    form.role_id    ? parseInt(form.role_id)    : undefined,
        society_id: form.society_id ? parseInt(form.society_id) : undefined,
      }),
    onSuccess: (res: any) => {
      const pwd = res?.data?.generated_password;
      toast.success(pwd ? `User created. Temp password: ${pwd}` : "User created successfully.");
      qc.invalidateQueries({ queryKey: ["global-users"] });
      qc.invalidateQueries({ queryKey: ["user-stats"] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.email?.[0] || "Failed to invite user";
      toast.error(msg);
    },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Invite User</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Full Name *</label>
            <Input placeholder="e.g. Ravi Kumar" value={form.full_name} onChange={set("full_name")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email *</label>
            <Input type="email" placeholder="user@email.com" value={form.email} onChange={set("email")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Mobile *</label>
            <Input placeholder="10-digit mobile" value={form.mobile} onChange={set("mobile")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Role</label>
            <Select value={form.role_id} onValueChange={v => setForm(p => ({ ...p, role_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r: any) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Society</label>
            <Select value={form.society_id} onValueChange={v => setForm(p => ({ ...p, society_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select society" /></SelectTrigger>
              <SelectContent>
                {societies.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Flat Number</label>
            <Input placeholder="e.g. A-101 (optional)" value={form.flat_number} onChange={set("flat_number")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <Input type="text" placeholder="Leave blank to auto-generate" value={form.password} onChange={set("password")} />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => invite.mutate()} disabled={invite.isPending || !form.full_name || !form.email || !form.mobile}>
            {invite.isPending ? "Creating…" : "Create User"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Page() {
  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState("");
  const [showInvite, setShowInvite]   = useState(false);

  const { data: statsData } = useQuery({
    queryKey: ["user-stats"],
    queryFn: () => platformService.getUserStats().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["global-users", search, roleFilter],
    queryFn: () =>
      platformService.getGlobalUsers({
        search:    search     || undefined,
        role_type: roleFilter || undefined,
        page_size: 50,
      }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const users: any[] = usersData?.results ?? [];
  const stats = statsData ?? { total_users: 0, active: 0, suspended: 0, pending: 0 };

  const kpis = [
    { label: "Total Users", value: stats.total_users, icon: Users,     color: "text-foreground",         bg: "bg-muted/30" },
    { label: "Active",       value: stats.active,     icon: UserCheck, color: "text-success",            bg: "bg-success/10" },
    { label: "Suspended",    value: stats.suspended,  icon: UserX,     color: "text-destructive",        bg: "bg-destructive/10" },
    { label: "Pending",      value: stats.pending,    icon: Clock,     color: "text-warning-foreground", bg: "bg-warning/10" },
  ];

  return (
    <>
      <PageHeader
        title="Global Users"
        description="Search and manage every user account on the platform."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4" /> Invite User
          </Button>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
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

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by name, email, mobile…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Roles</SelectItem>
              <SelectItem value="super-admin">Super Admin</SelectItem>
              <SelectItem value="society-admin">Society Admin</SelectItem>
              <SelectItem value="resident">Resident</SelectItem>
              <SelectItem value="security-guard">Security Guard</SelectItem>
              <SelectItem value="accountant">Accountant</SelectItem>
              <SelectItem value="maintenance-staff">Maintenance Staff</SelectItem>
              <SelectItem value="support-staff">Support Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">All Users</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {usersData?.count ?? users.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && users.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No users found.</p>
          )}

          {users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">Name</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Role</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Society</th>
                    <th className="px-5 py-2.5 text-left font-medium hidden md:table-cell">Mobile</th>
                    <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">
                        <div>{u.full_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs font-semibold capitalize">
                          {u.role_name || u.role_type || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                        {u.society_name || "—"}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                        {u.mobile || "—"}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
      </Dialog>
    </>
  );
}

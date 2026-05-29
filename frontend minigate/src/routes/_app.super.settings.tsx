import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { platformService } from "@/services/platform.service.js";

export const Route = createFileRoute("/_app/super/settings")({
  component: Page,
});

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => platformService.getSystemSettings().then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const [form, setForm] = useState({
    support_email: "",
    maintenance_mode: false,
    max_login_attempts: 5,
    default_plan: "free",
  });

  useEffect(() => {
    if (data) {
      setForm({
        support_email: data.support_email ?? "",
        maintenance_mode: data.maintenance_mode ?? false,
        max_login_attempts: data.max_login_attempts ?? 5,
        default_plan: data.default_plan ?? "free",
      });
    }
  }, [data]);

  const updateMut = useMutation({
    mutationFn: (d: any) => platformService.updateSystemSettings(d),
    onSuccess: () => toast.success("Settings updated"),
    onError: (err: any) => toast.error(err.response?.data?.detail ?? "Failed to update"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate(form);
  };

  const readonlyFields = [
    { label: "Platform Name", value: data?.platform_name },
    { label: "OTP Expiry (minutes)", value: data?.otp_expiry_minutes },
    { label: "Hardcoded OTP", value: data?.hardcoded_otp ? "Yes (dev mode)" : "No" },
  ];

  return (
    <>
      <PageHeader
        title="System Settings"
        description="Platform-wide configuration."
      />

      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {data && (
          <>
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4" /> Read-only Configuration
              </h3>
              <div className="space-y-2">
                {readonlyFields.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{String(value ?? "—")}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground">Editable Settings</h3>

              <div className="space-y-1.5">
                <Label className="text-xs">Support Email</Label>
                <Input
                  type="email"
                  value={form.support_email}
                  onChange={e => setForm(f => ({ ...f, support_email: e.target.value }))}
                  placeholder="support@minigate.dev"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Login Attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.max_login_attempts}
                    onChange={e => setForm(f => ({ ...f, max_login_attempts: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default Plan</Label>
                  <Select value={form.default_plan} onValueChange={v => setForm(f => ({ ...f, default_plan: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="maintenance-mode"
                  checked={form.maintenance_mode}
                  onChange={e => setForm(f => ({ ...f, maintenance_mode: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="maintenance-mode" className="text-sm cursor-pointer">
                  Maintenance Mode
                  <span className="ml-1 text-xs text-muted-foreground">(disables access for non-admins)</span>
                </Label>
              </div>

              <Button type="submit" className="gap-1.5" disabled={updateMut.isPending}>
                <Save className="h-4 w-4" />
                {updateMut.isPending ? "Saving…" : "Save Settings"}
              </Button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

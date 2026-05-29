import { createFileRoute } from "@tanstack/react-router";
import { useSelector } from "react-redux";
import { User, Mail, Phone, Shield } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_app/resident/profile")({
  component: Page,
});

function Page() {
  const user = useSelector((s: any) => s.auth?.legacyUser ?? s.auth?.user);

  const fields = [
    { icon: User, label: "Full Name", value: user?.full_name || user?.name || "—" },
    { icon: Mail, label: "Email", value: user?.email || "—" },
    { icon: Phone, label: "Mobile", value: user?.mobile || user?.phone || "—" },
    { icon: Shield, label: "Role", value: user?.role_name || user?.role || "Resident" },
  ];

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account information."
      />

      <div className="p-4 md:p-6 max-w-lg space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-lg text-foreground">
                {user?.full_name || user?.name || "Resident"}
              </div>
              <div className="text-sm text-muted-foreground">{user?.email || "—"}</div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {fields.map(({ icon: Icon, label, value }) => (
              <div key={label} className="py-3 flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-medium text-foreground">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          To update your profile details, please contact your society admin.
        </p>
      </div>
    </>
  );
}

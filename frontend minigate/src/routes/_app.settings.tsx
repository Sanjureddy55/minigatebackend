import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const user = useAuth();
  return (
    <>
      <PageHeader title="Settings" description="Manage your account, society and preferences" />
      <div className="p-6">
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="society">Society</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-4 max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" defaultValue={user?.name ?? ""} />
              <Field label="Email" defaultValue={user?.email ?? ""} />
              <Field label="Phone" defaultValue={user?.phone ?? ""} />
              <Field label="Role" defaultValue={user?.role ?? ""} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline">Cancel</Button><Button>Save changes</Button>
            </div>
          </TabsContent>
          <TabsContent value="society" className="mt-4 max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Society name" defaultValue="Greenwood Heights" />
              <Field label="City" defaultValue="Bengaluru" />
              <Field label="Total flats" defaultValue="348" />
              <Field label="Buildings" defaultValue="6" />
            </div>
          </TabsContent>
          <TabsContent value="notifications" className="mt-4 max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4">
            {["Visitor approvals","Security alerts","Approval requests","Weekly digest"].map(l => (
              <div key={l} className="flex items-center justify-between py-1">
                <div className="text-sm">{l}</div><Switch defaultChecked />
              </div>
            ))}
          </TabsContent>
          <TabsContent value="security" className="mt-4 max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="text-sm text-muted-foreground">Two-factor authentication, session management and audit log download.</div>
            <Button variant="outline">Enable 2FA</Button>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Input defaultValue={defaultValue} /></div>;
}

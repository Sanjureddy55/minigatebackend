import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, MapPin, Car, Users, PawPrint, FileText, Shield } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { residents } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/residents/$id")({
  component: ResidentDetail,
});

function ResidentDetail() {
  const { id } = useParams({ from: "/_app/residents/$id" });
  const r = residents.find(x => x.id === id);

  if (!r) {
    return (
      <div className="p-6">
        <p className="text-sm">Resident not found.</p>
        <Link to="/residents" className="text-primary text-sm hover:underline">← Back to residents</Link>
      </div>
    );
  }

  const family = Array.from({ length: r.family }).map((_, i) => ({
    name: `Family Member ${i+1}`, relation: ["Spouse","Son","Daughter","Parent"][i % 4], age: 20 + i*5,
  }));
  const vehicles = Array.from({ length: r.vehicles }).map((_, i) => ({
    plate: `KA-0${i+1}-AB-${1000 + i*111}`, type: i === 0 ? "4-Wheeler" : "2-Wheeler", model: ["Honda City","Activa","Royal Enfield"][i % 3],
  }));

  return (
    <>
      <PageHeader
        title={r.name}
        description={`${r.building} · Flat ${r.flat} · Joined ${r.joinedAt}`}
        actions={
          <>
            <Link to="/residents"><Button variant="outline" size="sm" className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
            <Button variant="outline" size="sm">Send Message</Button>
            <Button size="sm">Edit Profile</Button>
          </>
        }
      />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground text-lg font-semibold">
              {r.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
            </div>
            <div>
              <h3 className="font-semibold">{r.name}</h3>
              <div className="flex gap-1 mt-1">
                <StatusBadge status={r.type} />
                <StatusBadge status={r.status} />
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <Row icon={Phone} label={r.phone} />
            <Row icon={Mail} label={r.email} />
            <Row icon={MapPin} label={`${r.building}, Flat ${r.flat}, Greenwood Heights`} />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
            <Stat label="Family" value={r.family} />
            <Stat label="Vehicles" value={r.vehicles} />
            <Stat label="Pets" value={Math.floor(Math.random() * 2)} />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <Tabs defaultValue="family">
            <TabsList className="m-3">
              <TabsTrigger value="family"><Users className="h-4 w-4 mr-1.5" />Family</TabsTrigger>
              <TabsTrigger value="vehicles"><Car className="h-4 w-4 mr-1.5" />Vehicles</TabsTrigger>
              <TabsTrigger value="pets"><PawPrint className="h-4 w-4 mr-1.5" />Pets</TabsTrigger>
              <TabsTrigger value="docs"><FileText className="h-4 w-4 mr-1.5" />Documents</TabsTrigger>
              <TabsTrigger value="activity"><Shield className="h-4 w-4 mr-1.5" />Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="family" className="px-5 pb-5">
              {family.length === 0 ? <Empty msg="No family members added." /> : (
                <div className="divide-y divide-border">
                  {family.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">{f.name[0]}</div>
                        <div>
                          <div className="text-sm font-medium">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{f.relation} · {f.age} years</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">Edit</Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="vehicles" className="px-5 pb-5">
              {vehicles.length === 0 ? <Empty msg="No vehicles registered." /> : (
                <div className="divide-y divide-border">
                  {vehicles.map((v, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-foreground"><Car className="h-4 w-4" /></div>
                        <div>
                          <div className="text-sm font-medium font-mono">{v.plate}</div>
                          <div className="text-xs text-muted-foreground">{v.type} · {v.model}</div>
                        </div>
                      </div>
                      <StatusBadge status="approved" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="pets" className="px-5 pb-5"><Empty msg="No pets registered." /></TabsContent>
            <TabsContent value="docs" className="px-5 pb-5"><Empty msg="No documents uploaded." /></TabsContent>
            <TabsContent value="activity" className="px-5 pb-5">
              <ol className="space-y-3 text-sm">
                {[
                  { t: "2 hours ago", e: "Added new vehicle KA-05-XY-1234" },
                  { t: "Yesterday", e: "Approved visitor: Aarti Singh" },
                  { t: "3 days ago", e: "Maintenance paid - ₹12,500" },
                  { t: "Last week", e: "Updated emergency contact" },
                ].map((a,i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1">
                      <div>{a.e}</div>
                      <div className="text-xs text-muted-foreground">{a.t}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

function Row({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate text-foreground">{label}</span>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
function Empty({ msg }: { msg: string }) {
  return <div className="py-12 text-center text-sm text-muted-foreground">{msg}</div>;
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Building, MapPin, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/home")({
  component: Page,
});

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-flats"],
    queryFn: () => residentService.getMyFlats().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const flats: any[] = data?.results ?? data ?? [];
  const primary = flats.find((f: any) => f.is_primary) ?? flats[0];

  return (
    <>
      <PageHeader
        title="My Home"
        description="Your flat details and household profile."
      />

      <div className="p-4 md:p-6 space-y-4 max-w-2xl">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && flats.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No flat linked to your account yet. Please contact your society admin.
          </div>
        )}

        {primary && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground text-lg">
                  Flat {primary.flat_number}
                  {primary.is_primary && (
                    <span className="ml-2 text-xs text-success font-normal">(Primary)</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{primary.building_name}</div>
              </div>
              <div className="ml-auto">
                <StatusBadge status={primary.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/30 border border-border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Building className="h-3.5 w-3.5" /> Building
                </div>
                <div className="font-medium text-foreground text-sm">{primary.building_name || "—"}</div>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5" /> Society
                </div>
                <div className="font-medium text-foreground text-sm">{primary.society_name || "—"}</div>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5" /> City
                </div>
                <div className="font-medium text-foreground text-sm">{primary.city || "—"}</div>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Status
                </div>
                <div className="font-medium text-foreground text-sm capitalize">{primary.status_display || primary.status}</div>
              </div>
            </div>
          </div>
        )}

        {flats.length > 1 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">All Linked Flats</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Flat</th>
                  <th className="px-5 py-2.5 text-left font-medium">Building</th>
                  <th className="px-5 py-2.5 text-left font-medium hidden sm:table-cell">Society</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {flats.map((f: any) => (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">
                      {f.flat_number}
                      {f.is_primary && <span className="ml-1.5 text-[10px] text-success font-normal">Primary</span>}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{f.building_name}</td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">{f.society_name}</td>
                    <td className="px-5 py-3"><StatusBadge status={f.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && flats.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              To update flat details or request changes, please contact your society admin.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

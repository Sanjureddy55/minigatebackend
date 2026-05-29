import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Phone, Users, Building2, MessageSquare, Heart, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
// @ts-ignore
import { guardService } from "@/services/guard.service.js";

export const Route = createFileRoute("/_app/guard/contact")({
  component: Page,
});

// ── Avatar colors ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500",
  "bg-amber-500",  "bg-rose-500", "bg-indigo-500",
  "bg-teal-500",   "bg-orange-500",
];

function avatarColor(name: string) {
  const code = (name || "").charCodeAt(0) ?? 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function initials(name: string) {
  return (name || "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Resident card ─────────────────────────────────────────────────────────────

function ResidentCard({ resident, flat }: { resident: any; flat: any }) {
  const isOwner = resident.resident_type === "owner" || resident.is_primary;
  const color   = avatarColor(resident.full_name);

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      {/* Avatar */}
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${color}`}>
        {initials(resident.full_name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">{resident.full_name}</span>
          {isOwner ? (
            <span className="rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary flex-shrink-0">
              Owner
            </span>
          ) : (
            <span className="rounded-full bg-sky-500/10 border border-sky-400/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-sky-600 flex-shrink-0">
              Tenant
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {flat.flat_display || flat.flat_number}
          {flat.building_name && ` · ${flat.building_name}`}
        </div>
        {resident.mobile && (
          <div className="text-xs text-muted-foreground">{resident.mobile}</div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 flex-shrink-0">
        {resident.mobile && (
          <a
            href={`tel:${resident.mobile}`}
            title={`Call ${resident.full_name}`}
            className="h-8 w-8 rounded-full border border-success/30 bg-success/10 flex items-center justify-center hover:bg-success/20 transition-colors"
          >
            <Phone className="h-3.5 w-3.5 text-success" />
          </a>
        )}
        {resident.mobile && (
          <a
            href={`sms:${resident.mobile}`}
            title={`Message ${resident.full_name}`}
            className="h-8 w-8 rounded-full border border-sky-300/40 bg-sky-500/10 flex items-center justify-center hover:bg-sky-500/20 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 text-sky-600" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Page() {
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "owner" | "tenant">("all");

  const { data: statsData } = useQuery({
    queryKey: ["contact-stats"],
    queryFn: () => guardService.getContactStats().then((r: any) => r.data.data ?? r.data),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", search],
    queryFn: () =>
      guardService.getContacts({ search: search || undefined })
        .then((r: any) => r.data),
    staleTime: 60_000,
  });

  const allFlats: any[] = data?.results ?? [];
  const stats = statsData ?? { total_flats: 0, total_residents: 0, owners: 0, tenants: 0, family_members: 0 };

  // Flatten residents for per-resident card layout
  const allResidents: { resident: any; flat: any }[] = [];
  const buildings: string[] = [];
  for (const flat of allFlats) {
    if (flat.building_name && !buildings.includes(flat.building_name)) {
      buildings.push(flat.building_name);
    }
    for (const r of (flat.residents ?? [])) {
      allResidents.push({ resident: r, flat });
    }
  }

  const filtered = allResidents.filter(({ resident, flat }) => {
    if (buildingFilter !== "all" && flat.building_name !== buildingFilter) return false;
    if (typeFilter === "owner" && !(resident.resident_type === "owner" || resident.is_primary)) return false;
    if (typeFilter === "tenant" && (resident.resident_type === "owner" || resident.is_primary)) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Contact Resident"
        description="Quick-dial directory for all residents in this society"
      />

      <div className="space-y-6 p-6">
        {/* KPI stats — 4 cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground">{stats.total_residents}</div>
              <div className="text-xs text-muted-foreground">Total Residents</div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground">{stats.owners ?? 0}</div>
              <div className="text-xs text-muted-foreground">Owners</div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
              <UserX className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground">{stats.tenants ?? 0}</div>
              <div className="text-xs text-muted-foreground">Tenants</div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <Heart className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground">{stats.family_members}</div>
              <div className="text-xs text-muted-foreground">Family Members</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by flat, building, resident name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter pills: building + type */}
        <div className="flex gap-2 flex-wrap">
          {/* Type filter */}
          {(["all", "owner", "tenant"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors capitalize ${
                typeFilter === t
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All Types" : t === "owner" ? "Owners" : "Tenants"}
            </button>
          ))}

          {/* Building filter */}
          {buildings.length > 0 && (
            <>
              <span className="text-muted-foreground text-xs self-center px-1">|</span>
              <button
                onClick={() => setBuildingFilter("all")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  buildingFilter === "all"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                All Buildings
              </button>
              {buildings.map((b) => (
                <button
                  key={b}
                  onClick={() => setBuildingFilter(b)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    buildingFilter === b
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {b}
                </button>
              ))}
            </>
          )}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading directory…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">No residents found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
          </div>
        )}

        {/* Per-resident card grid */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ resident, flat }) => (
            <ResidentCard key={`${flat.flat_id}-${resident.resident_id}`} resident={resident} flat={flat} />
          ))}
        </div>
      </div>
    </>
  );
}

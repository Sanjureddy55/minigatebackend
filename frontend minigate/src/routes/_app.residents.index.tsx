import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Search, Users, ChevronLeft, ChevronRight, SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/residents/")({
  component: ResidentsPage,
});

const PAGE_SIZE = 15;

function ResidentsPage() {
  const societyId = useSelector((s: any) => s.auth?.legacyUser?.society_id);
  const [q, setQ]          = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage]    = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["residents", societyId, q, status, page],
    queryFn: () => societyService.getResidents({
      society: societyId,
      search: q || undefined,
      status: status !== "all" ? status : undefined,
      page,
      page_size: PAGE_SIZE,
    }).then((r: any) => r.data),
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
  });

  const residents: any[] = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-full">
      <PageHeader
        title="Residents"
        description={`${total} registered in society`}
      />

      <div className="p-4 md:p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total Residents", val: total, color: "text-foreground" },
            { label: "Showing", val: residents.length, color: "text-primary" },
            { label: "Pages", val: totalPages, color: "text-muted-foreground" },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4">
              <p className={cn("text-2xl font-extrabold", k.color)}>{k.val}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2.5 border-b border-border p-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1); }}
                placeholder="Search by name, flat or email…"
                className="w-full rounded-xl border border-border bg-muted/30 pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-all"
              />
            </div>

            <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-[140px] rounded-xl border-border bg-muted/30 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <button className="hidden sm:flex items-center gap-1.5 h-9 rounded-xl border border-border bg-muted/30 px-3 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </button>
          </div>

          {/* Table */}
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && residents.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No residents match your filters</p>
              {(q || status !== "all") && (
                <button onClick={() => { setQ(""); setStatus("all"); setPage(1); }}
                  className="mt-2 text-xs text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {residents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Resident", "Flat", "Role", "Mobile", "Society", "Status", "Joined"].map(h => (
                      <th key={h} className={cn(
                        "px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
                        (h === "Mobile" || h === "Society") && "hidden md:table-cell",
                        h === "Joined" && "hidden xl:table-cell",
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {residents.map((r: any) => {
                    const initials = (r.full_name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{r.full_name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-foreground">{r.flat_number || "—"}</td>
                        <td className="px-5 py-4 text-muted-foreground capitalize">{r.role_name || "Resident"}</td>
                        <td className="px-5 py-4 hidden md:table-cell text-muted-foreground">{r.mobile || "—"}</td>
                        <td className="px-5 py-4 hidden md:table-cell text-muted-foreground">{r.society_name || "—"}</td>
                        <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                        <td className="px-5 py-4 hidden xl:table-cell text-xs text-muted-foreground">
                          {r.joined_at ? new Date(r.joined_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {Math.min((page-1)*PAGE_SIZE+1, total)}–{Math.min(page*PAGE_SIZE, total)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{total}</span>
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p-1))}
                disabled={page === 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.min(Math.max(page - 2 + i, 1), Math.max(totalPages - 4, 1)) + Math.max(i - Math.min(page - 1, 2), 0);
                return p;
              }).filter((v, i, a) => a.indexOf(v) === i && v >= 1 && v <= totalPages).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={cn(
                    "h-8 min-w-[2rem] rounded-lg border px-2 text-xs font-semibold transition-all",
                    page === p
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}>
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                disabled={page === totalPages}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Star, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
// @ts-ignore
import { supportService } from "@/services/support.service.js";

export const Route = createFileRoute("/_app/support/history")({
  component: Page,
});

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">No rating</span>;
  return (
    <span className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < rating ? "fill-amber-400" : "fill-transparent stroke-muted-foreground/40"}`} />
      ))}
    </span>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  lift:         "bg-violet-50 text-violet-700 border-violet-200",
  utilities:    "bg-sky-50 text-sky-700 border-sky-200",
  internet:     "bg-blue-50 text-blue-700 border-blue-200",
  dispute:      "bg-red-50 text-red-700 border-red-200",
  parking:      "bg-amber-50 text-amber-700 border-amber-200",
  housekeeping: "bg-emerald-50 text-emerald-700 border-emerald-200",
  electrical:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  plumbing:     "bg-cyan-50 text-cyan-700 border-cyan-200",
  app_issue:    "bg-pink-50 text-pink-700 border-pink-200",
  general:      "bg-muted/40 text-muted-foreground border-border",
};

function Page() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["support-history", dateFrom, dateTo],
    queryFn: () => supportService.getServiceHistory({
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
    }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const stats   = data?.stats   ?? {};
  const tickets = data?.results ?? [];

  return (
    <>
      <PageHeader title="Service History" description="Resolved tickets with feedback and ratings" />

      <div className="space-y-6 p-4 sm:p-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-600">{stats.tickets_resolved ?? 0}</div>
              <div className="text-xs text-muted-foreground">Tickets Resolved</div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-amber-500">{stats.avg_rating ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Avg Rating</div>
            </div>
          </div>
        </div>

        {/* Date filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">From</span>
            <input type="date" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">To</span>
            <input type="date" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs text-primary font-semibold hover:underline">Clear</button>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">Resolved Tickets</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">{tickets.length}</span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading history…</p>}
          {!isLoading && tickets.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No resolved tickets in this range.</p>
          )}

          <div className="divide-y divide-border">
            {tickets.map((t: any) => (
              <div key={t.id} className="px-5 py-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{t.subject}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{t.ticket_id}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${CATEGORY_COLORS[t.category] ?? ""}`}>
                      {t.category_display}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.resident_name} · {t.flat_number}
                  </div>
                  {t.resolution_notes && (
                    <div className="mt-1.5 rounded-lg bg-muted/30 px-3 py-1.5 text-xs text-foreground/80">
                      {t.resolution_notes}
                    </div>
                  )}
                  {t.feedback && (
                    <div className="mt-1 text-xs text-muted-foreground italic">"{t.feedback}"</div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <StarRating rating={t.rating} />
                    {t.time_taken && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {t.time_taken}
                      </span>
                    )}
                    {t.resolved_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.resolved_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

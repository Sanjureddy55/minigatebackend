import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Star, Clock, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
// @ts-ignore
import { maintenanceService } from "@/services/maintenance.service.js";

export const Route = createFileRoute("/_app/maintenance/history")({
  component: Page,
});

const CATEGORY_EMOJI: Record<string, string> = {
  plumbing: "🔧", electrical: "⚡", civil: "🏗️", hvac: "❄️",
  landscaping: "🌿", equipment: "⚙️", mechanical: "🔩",
  pest_ctrl: "🐛", general: "📋", other: "📌",
};

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

function Page() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-history", dateFrom, dateTo],
    queryFn: () => maintenanceService.getWorkHistory({
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
    }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const stats  = data?.stats  ?? {};
  const tasks  = data?.results ?? [];

  return (
    <>
      <PageHeader
        title="Work History"
        description="Your completed task record with ratings"
      />

      <div className="space-y-6 p-4 sm:p-6">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-600">{stats.tasks_closed ?? 0}</div>
              <div className="text-xs text-muted-foreground">Tasks Closed</div>
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
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
              <Clock className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-sky-600">{stats.hours_logged ?? 0}</div>
              <div className="text-xs text-muted-foreground">Hours Logged</div>
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
              className="text-xs text-primary font-semibold hover:underline">
              Clear
            </button>
          )}
        </div>

        {/* Task list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">Completed Tasks</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">{tasks.length}</span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading history…</p>}
          {!isLoading && tasks.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No completed tasks in this range.</p>
          )}

          <div className="divide-y divide-border">
            {tasks.map((task: any) => (
              <div key={task.id} className="px-5 py-4 flex items-start gap-3">
                <div className="text-xl shrink-0 mt-0.5">{CATEGORY_EMOJI[task.category] ?? "📋"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{task.title}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{task.task_id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{task.location}</div>
                  {task.resolution_notes && (
                    <div className="mt-1.5 rounded-lg bg-muted/30 px-3 py-1.5 text-xs text-foreground/80">
                      {task.resolution_notes}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <StarRating rating={task.rating} />
                    {task.hours_logged && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {task.hours_logged}h
                      </span>
                    )}
                    {task.completed_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.completed_at).toLocaleDateString()}
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

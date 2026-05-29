import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
// @ts-ignore
import { maintenanceService } from "@/services/maintenance.service.js";

export const Route = createFileRoute("/_app/maintenance/schedule")({
  component: Page,
});

const STATUS_COLORS: Record<string, string> = {
  scheduled:   "bg-sky-50 text-sky-700 border-sky-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:   "bg-muted/40 text-muted-foreground border-border",
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function Page() {
  const [date, setDate] = useState(todayString());

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-schedule", date],
    queryFn: () => maintenanceService.getSchedule({ date }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const items: any[] = data?.results ?? [];

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  }

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Daily maintenance schedule and task calendar"
      />

      <div className="space-y-4 p-4 sm:p-6">
        {/* Date Navigator */}
        <div className="flex items-center gap-3">
          <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 text-center">
            <div className="font-semibold text-foreground">{displayDate}</div>
          </div>
          <button onClick={() => shiftDate(1)} className="p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <input type="date" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={() => setDate(todayString())} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors">
            Today
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Scheduled Tasks
            </span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">{items.length}</span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading schedule…</p>}

          {!isLoading && items.length === 0 && (
            <div className="py-12 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tasks scheduled for this day.</p>
            </div>
          )}

          <div className="divide-y divide-border">
            {items.map((item: any) => (
              <div key={item.id} className="px-5 py-4 flex items-start gap-4">
                <div className="text-right shrink-0 w-16">
                  {item.scheduled_time && (
                    <div className="text-sm font-bold text-foreground">
                      {new Date("2000-01-01T" + item.scheduled_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">{item.estimated_duration ?? ""}</div>
                </div>
                <div className="w-px bg-border self-stretch shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {item.task_title ?? item.title ?? "Scheduled Task"}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_COLORS[item.status] ?? ""}`}>
                      {item.status?.replace("_", " ")}
                    </span>
                  </div>
                  {item.location && (
                    <div className="text-xs text-muted-foreground mt-0.5">{item.location}</div>
                  )}
                  {item.notes && (
                    <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

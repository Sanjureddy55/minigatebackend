import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ClipboardList, Wrench, CheckCircle2, RefreshCw,
  ArrowRight, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
// @ts-ignore
import { maintenanceService } from "@/services/maintenance.service.js";

export const Route = createFileRoute("/_app/maintenance/dashboard")({
  component: Page,
});

const PRIORITY_COLOR: Record<string, string> = {
  high:   "text-destructive bg-destructive/10 border-destructive/20",
  medium: "text-warning-foreground bg-warning/10 border-warning/20",
  low:    "text-muted-foreground bg-muted/30 border-border",
};

const CATEGORY_ICON: Record<string, string> = {
  plumbing: "🔧", electrical: "⚡", civil: "🏗️", hvac: "❄️",
  landscaping: "🌿", equipment: "⚙️", mechanical: "🔩",
  pest_ctrl: "🐛", general: "📋", other: "📌",
};

function KpiCard({ icon: Icon, value, label, color, bg }: {
  icon: React.ElementType; value: number; label: string; color: string; bg: string;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className={`text-3xl font-extrabold tracking-tight ${color}`}>{value ?? 0}</div>
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </motion.div>
  );
}

function TaskRow({ task, onStart }: { task: any; onStart: (id: number) => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
      <div className="w-8 h-8 flex items-center justify-center text-lg shrink-0">
        {CATEGORY_ICON[task.category] ?? "📋"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{task.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{task.location} · {task.time_ago}</div>
      </div>
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${PRIORITY_COLOR[task.priority] ?? ""}`}>
        {task.priority}
      </span>
      {task.status === "open" ? (
        <button
          onClick={() => onStart(task.id)}
          className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <PlayCircle className="h-3 w-3" /> Start
        </button>
      ) : (
        <StatusBadge status={task.status} />
      )}
    </div>
  );
}

function Page() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-dashboard"],
    queryFn: () => maintenanceService.getDashboard().then((r: any) => r.data.data),
    refetchInterval: 60_000,
  });

  const startMutation = useMutation({
    mutationFn: (id: number) => maintenanceService.startTask(id),
    onSuccess: () => {
      toast.success("Task started");
      qc.invalidateQueries({ queryKey: ["maintenance-dashboard"] });
    },
    onError: () => toast.error("Failed to start task"),
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Loading dashboard…</div>;
  }

  const d = data ?? {};
  const stats = d.stats ?? {};

  return (
    <>
      <PageHeader
        title="Maintenance Dashboard"
        description="Your task queue and work overview"
        badge="Live"
        actions={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => qc.invalidateQueries({ queryKey: ["maintenance-dashboard"] })}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-3 gap-4">
          <KpiCard icon={ClipboardList} value={stats.open}           label="Open Tasks"      color="text-sky-600"    bg="bg-sky-50" />
          <KpiCard icon={Wrench}        value={stats.in_progress}    label="In Progress"     color="text-amber-600"  bg="bg-amber-50" />
          <KpiCard icon={CheckCircle2}  value={stats.done_this_week} label="Done This Week"  color="text-emerald-600" bg="bg-emerald-50" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Task Queue */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">My Task Queue</span>
              <a href="/maintenance/tasks" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </a>
            </div>
            <div className="divide-y divide-border">
              {(d.my_task_queue ?? []).length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">No active tasks. Great work!</p>
              )}
              {(d.my_task_queue ?? []).map((task: any) => (
                <TaskRow key={task.id} task={task} onStart={(id) => startMutation.mutate(id)} />
              ))}
            </div>
          </div>

          {/* Recently Completed */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">Recently Completed</span>
              <a href="/maintenance/history" className="text-xs font-semibold text-primary hover:underline">History →</a>
            </div>
            <div className="divide-y divide-border">
              {(d.recently_completed ?? []).length === 0 && (
                <p className="px-5 py-6 text-sm text-muted-foreground">No completed tasks yet.</p>
              )}
              {(d.recently_completed ?? []).map((task: any) => (
                <div key={task.id} className="px-5 py-3 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{task.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{task.location}</div>
                    {task.hours_logged && (
                      <div className="text-xs text-muted-foreground">{task.hours_logged}h logged</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

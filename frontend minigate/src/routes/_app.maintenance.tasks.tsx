import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PlayCircle, CheckCircle2, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
// @ts-ignore
import { maintenanceService } from "@/services/maintenance.service.js";

export const Route = createFileRoute("/_app/maintenance/tasks")({
  component: Page,
});

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning-foreground border-warning/20",
  low:    "bg-muted/40 text-muted-foreground border-border",
};

const CATEGORY_EMOJI: Record<string, string> = {
  plumbing: "🔧", electrical: "⚡", civil: "🏗️", hvac: "❄️",
  landscaping: "🌿", equipment: "⚙️", mechanical: "🔩",
  pest_ctrl: "🐛", general: "📋", other: "📌",
};

function CompleteModal({ task, onClose }: { task: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [hours, setHours] = useState("");

  const complete = useMutation({
    mutationFn: () => maintenanceService.completeTask(task.id, { resolution_notes: notes, hours_logged: hours || undefined }),
    onSuccess: () => {
      toast.success("Task marked as done");
      qc.invalidateQueries({ queryKey: ["maintenance-tasks"] });
      onClose();
    },
    onError: () => toast.error("Failed to complete task"),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Complete Task</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div>
          <div className="text-sm font-semibold text-foreground mb-1">{task.title}</div>
          <div className="text-xs text-muted-foreground">{task.location}</div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Resolution Notes</label>
          <textarea
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
            rows={3}
            placeholder="What was done to resolve this task?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Hours Logged</label>
          <Input type="number" placeholder="e.g. 2.5" value={hours} onChange={e => setHours(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => complete.mutate()} disabled={complete.isPending}>
            {complete.isPending ? "Saving…" : "Mark Done"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function Page() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [completeTarget, setCompleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-tasks", search, statusFilter, priorityFilter],
    queryFn: () => maintenanceService.getTasks({
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const startMutation = useMutation({
    mutationFn: (id: number) => maintenanceService.startTask(id),
    onSuccess: () => {
      toast.success("Task started — good luck!");
      qc.invalidateQueries({ queryKey: ["maintenance-tasks"] });
    },
    onError: () => toast.error("Failed to start task"),
  });

  const tasks: any[] = data?.results ?? [];

  return (
    <>
      <PageHeader
        title="Task Queue"
        description="All tasks assigned to you"
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="font-semibold text-sm text-foreground">Tasks</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {data?.count ?? tasks.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading tasks…</p>}
          {!isLoading && tasks.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No tasks found.</p>
          )}

          <div className="divide-y divide-border">
            {tasks.map((task: any) => (
              <div key={task.id} className="px-5 py-4 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                <div className="text-xl shrink-0 mt-0.5">{CATEGORY_EMOJI[task.category] ?? "📋"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{task.title}</span>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize truncate font-mono text-muted-foreground">
                      {task.task_id}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{task.location}</div>
                  {task.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                      {task.priority}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{task.category_display}</span>
                    <span className="text-[11px] text-muted-foreground">{task.time_ago}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={task.status} />
                  {task.status === "open" && (
                    <button
                      onClick={() => startMutation.mutate(task.id)}
                      className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                    >
                      <PlayCircle className="h-3 w-3" /> Start
                    </button>
                  )}
                  {task.status === "in_progress" && (
                    <button
                      onClick={() => setCompleteTarget(task)}
                      className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!completeTarget} onOpenChange={() => setCompleteTarget(null)}>
        {completeTarget && <CompleteModal task={completeTarget} onClose={() => setCompleteTarget(null)} />}
      </Dialog>
    </>
  );
}

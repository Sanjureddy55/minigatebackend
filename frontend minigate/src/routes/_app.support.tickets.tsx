import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, CheckCircle2, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// @ts-ignore
import { supportService } from "@/services/support.service.js";

export const Route = createFileRoute("/_app/support/tickets")({
  component: Page,
});

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning-foreground border-warning/20",
  low:    "bg-muted/40 text-muted-foreground border-border",
};

function ResolveModal({ ticket, onClose }: { ticket: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [timeTaken, setTimeTaken] = useState("");

  const resolve = useMutation({
    mutationFn: () => supportService.resolveTicket(ticket.id, { resolution_notes: notes, time_taken: timeTaken }),
    onSuccess: () => {
      toast.success("Ticket resolved");
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      onClose();
    },
    onError: () => toast.error("Failed to resolve ticket"),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Resolve Ticket</DialogTitle></DialogHeader>
      <div className="space-y-4 pt-2">
        <div>
          <div className="text-sm font-semibold text-foreground mb-1">{ticket.subject}</div>
          <div className="text-xs text-muted-foreground">{ticket.resident_name} · {ticket.flat_number}</div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Resolution Notes</label>
          <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
            rows={3} placeholder="What was done to resolve this ticket?"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Time Taken</label>
          <Input placeholder="e.g. 2 hours, 30 minutes" value={timeTaken} onChange={e => setTimeTaken(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => resolve.mutate()} disabled={resolve.isPending}>
            {resolve.isPending ? "Saving…" : "Mark Resolved"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function Page() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [priorityFilter, setPriority] = useState("");
  const [resolveTarget, setResolveTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["support-tickets", search, statusFilter, priorityFilter],
    queryFn: () => supportService.getTickets({
      search:   search         || undefined,
      status:   statusFilter   || undefined,
      priority: priorityFilter || undefined,
    }).then((r: any) => r.data),
    staleTime: 30_000,
  });

  const pickup = useMutation({
    mutationFn: (id: number) => supportService.pickupTicket(id),
    onSuccess: () => {
      toast.success("Ticket picked up");
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: () => toast.error("Failed to pick up ticket"),
  });

  const tickets: any[] = data?.results ?? [];

  return (
    <>
      <PageHeader title="Assigned Tickets" description="Support tickets assigned to you" />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriority}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Priority" /></SelectTrigger>
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
            <span className="font-semibold text-sm text-foreground">Tickets</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {data?.count ?? tickets.length}
            </span>
          </div>

          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading tickets…</p>}
          {!isLoading && tickets.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No tickets found.</p>
          )}

          <div className="divide-y divide-border">
            {tickets.map((t: any) => (
              <div key={t.id} className="px-5 py-4 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{t.subject}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{t.ticket_id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.resident_name} · {t.flat_number}
                    {t.resident_phone && ` · ${t.resident_phone}`}
                  </div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${PRIORITY_COLORS[t.priority] ?? ""}`}>
                      {t.priority}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{t.category_display}</span>
                    <span className="text-[11px] text-muted-foreground">{t.time_ago}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={t.status} />
                  {t.status === "open" && (
                    <button onClick={() => pickup.mutate(t.id)}
                      className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors">
                      <ArrowDownCircle className="h-3 w-3" /> Pick Up
                    </button>
                  )}
                  {t.status === "in_progress" && (
                    <button onClick={() => setResolveTarget(t)}
                      className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                      <CheckCircle2 className="h-3 w-3" /> Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!resolveTarget} onOpenChange={() => setResolveTarget(null)}>
        {resolveTarget && <ResolveModal ticket={resolveTarget} onClose={() => setResolveTarget(null)} />}
      </Dialog>
    </>
  );
}

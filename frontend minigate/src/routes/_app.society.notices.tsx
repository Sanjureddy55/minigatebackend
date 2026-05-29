import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Plus, Megaphone, HandCoins, Wrench, Calendar, Trash2, Users, Send,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { societyService } from "@/services/society.service.js";

export const Route = createFileRoute("/_app/society/notices")({
  component: Page,
});

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string }> = {
  event:       { icon: Calendar,   color: "text-blue-600",   bg: "bg-blue-100"   },
  fundraiser:  { icon: HandCoins,  color: "text-emerald-600",bg: "bg-emerald-100"},
  notice:      { icon: Megaphone,  color: "text-amber-600",  bg: "bg-amber-100"  },
  maintenance: { icon: Wrench,     color: "text-rose-600",   bg: "bg-rose-100"   },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} days ago`;
}

function Page() {
  const qc = useQueryClient();
  const societyId = useSelector((s: any) => s.auth?.legacyUser?.society_id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "notice", audience: "all",
    event_date: "", contribution_per_flat: "", target_amount: "",
  });

  const { data: dash } = useQuery({
    queryKey: ["notice-dashboard", societyId],
    queryFn: () => societyService.getNoticeDashboard({ society: societyId }).then((r: any) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["notices", societyId],
    queryFn: () => societyService.getNotices({ society: societyId }).then((r: any) => r.data),
    staleTime: 60_000,
  });

  const notices: any[] = data?.results ?? data ?? [];

  const createMut = useMutation({
    mutationFn: (d: any) => societyService.createNotice(d),
    onSuccess: () => {
      toast.success("Notification sent to residents");
      setOpen(false);
      setForm({ title: "", description: "", category: "notice", audience: "all", event_date: "", contribution_per_flat: "", target_amount: "" });
      qc.invalidateQueries({ queryKey: ["notices"] });
      qc.invalidateQueries({ queryKey: ["notice-dashboard"] });
    },
    onError: (err: any) => {
      const d = err.response?.data;
      const msg = d?.detail ?? (typeof d === "object" ? Object.values(d).flat().join(" ") : null) ?? "Failed to publish";
      toast.error(msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => societyService.deleteNotice(id),
    onSuccess: () => {
      toast.success("Notice removed");
      qc.invalidateQueries({ queryKey: ["notices"] });
      qc.invalidateQueries({ queryKey: ["notice-dashboard"] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    if (form.category === "fundraiser" && !form.contribution_per_flat && !form.target_amount) {
      toast.error("Fundraisers need a contribution amount or target amount");
      return;
    }
    createMut.mutate({
      society: societyId,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      audience: form.audience,
      event_date: form.event_date || undefined,
      contribution_per_flat: form.contribution_per_flat ? Number(form.contribution_per_flat) : undefined,
      target_amount: form.target_amount ? Number(form.target_amount) : undefined,
      status: "active",
    });
  };

  const kpis = [
    { label: "Active Notices",     value: dash?.active_notices    ?? notices.filter((n: any) => n.status === "active").length },
    { label: "Live Fundraisers",   value: dash?.live_fundraisers  ?? notices.filter((n: any) => n.category === "fundraiser").length },
    { label: "Upcoming Events",    value: dash?.upcoming_events   ?? 0 },
    { label: "Unread by Residents",value: dash?.total_unread      ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title="Notice Board & Events"
        description="Broadcast events, fundraisers, and announcements to residents."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Notification
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">+0%</span>
              </div>
              <div className="text-2xl font-extrabold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">VS LAST MONTH</div>
            </div>
          ))}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && notices.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notices yet. Create one to inform residents.</p>
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New Notification
            </Button>
          </div>
        )}

        {/* Notice list */}
        <div className="space-y-3">
          {notices.map((n: any) => {
            const meta = CATEGORY_META[n.category] ?? CATEGORY_META.notice;
            const Icon = meta.icon;
            const progressPct = n.target_amount && n.raised_amount
              ? Math.min(100, (parseFloat(n.raised_amount) / parseFloat(n.target_amount)) * 100)
              : 0;
            return (
              <div key={n.id} className="rounded-xl border border-border bg-card p-4 md:p-5">
                <div className="flex items-start gap-4">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{n.title}</h3>
                      <Badge variant="secondary" className="capitalize text-[10px] px-2">
                        {n.category_display || n.category}
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-[10px] px-2">
                        <Users className="h-3 w-3" />
                        {n.audience_display || n.audience}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{n.description}</p>

                    <div className="mt-1.5 text-xs text-muted-foreground">
                      {n.event_date && <span>{n.event_date} · </span>}
                      posted {timeAgo(n.created_at)}
                      {n.created_by_name && <span> by {n.created_by_name}</span>}
                    </div>

                    {/* Fundraiser progress */}
                    {n.category === "fundraiser" && n.target_amount && (
                      <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                        {n.contribution_per_flat && (
                          <p className="text-xs font-semibold text-primary">
                            Resident contribution: ₹{Number(n.contribution_per_flat).toLocaleString("en-IN")} per flat
                          </p>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-foreground">
                            ₹{Number(n.raised_amount || 0).toLocaleString("en-IN")} raised
                          </span>
                          <span className="text-muted-foreground">
                            of ₹{Number(n.target_amount).toLocaleString("en-IN")}
                            {n.read_count ? ` · ${n.read_count} contributors` : ""}
                          </span>
                        </div>
                        <Progress value={progressPct} className="h-2" />
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost" size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => { if (confirm("Remove this notice?")) deleteMut.mutate(n.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send notification to residents</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notice">Notice</SelectItem>
                  <SelectItem value="event">Event (e.g. Vinayaka Chavithi)</SelectItem>
                  <SelectItem value="fundraiser">Fundraiser</SelectItem>
                  <SelectItem value="maintenance">Maintenance Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Vinayaka Chavithi celebrations"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Share details, venue, time, and contribution info…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Audience</Label>
                <Select value={form.audience} onValueChange={v => setForm(f => ({ ...f, audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Residents</SelectItem>
                    <SelectItem value="owners">Owners Only</SelectItem>
                    <SelectItem value="tower">Specific Tower</SelectItem>
                    <SelectItem value="custom">Custom Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.category === "fundraiser" || form.category === "event") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Contribution Amount Per Flat (₹)</Label>
                  <Input
                    type="number"
                    value={form.contribution_per_flat}
                    onChange={e => setForm(f => ({ ...f, contribution_per_flat: e.target.value }))}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Fund Amount (₹)</Label>
                  <Input
                    type="number"
                    value={form.target_amount}
                    onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                    placeholder="50000"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="gap-1.5" disabled={createMut.isPending}>
                <Send className="h-4 w-4" />
                {createMut.isPending ? "Sending…" : "Send to residents"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

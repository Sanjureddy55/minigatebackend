import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Calendar, HandCoins, Megaphone, Wrench, CheckCheck, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/notices")({
  component: Page,
});

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string }> = {
  event:       { icon: Calendar,   color: "text-blue-600",    bg: "bg-blue-100"    },
  fundraiser:  { icon: HandCoins,  color: "text-emerald-600", bg: "bg-emerald-100" },
  notice:      { icon: Megaphone,  color: "text-amber-600",   bg: "bg-amber-100"   },
  maintenance: { icon: Wrench,     color: "text-rose-600",    bg: "bg-rose-100"    },
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
  const user = useSelector((s: any) => s.auth?.legacyUser ?? s.auth?.user);
  const residentId = user?.id;

  const [contributeNotice, setContributeNotice] = useState<any>(null);
  const [contribForm, setContribForm] = useState({ amount: "", payment_method: "upi" });

  const { data, isLoading } = useQuery({
    queryKey: ["resident-notices"],
    queryFn: () => residentService.getNotices().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const notices: any[] = data?.results ?? data ?? [];
  const unreadNotices = notices.filter((n: any) => !n.is_read);

  const markReadMut = useMutation({
    mutationFn: (id: number) => residentService.markNoticeRead(id, residentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resident-notices"] }),
  });

  const markAllRead = async () => {
    if (unreadNotices.length === 0) { toast.info("All notices already read"); return; }
    for (const n of unreadNotices) {
      await residentService.markNoticeRead(n.id, residentId).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: ["resident-notices"] });
    toast.success("All notices marked as read");
  };

  const contributeMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      residentService.contributeToFundraiser(id, data),
    onSuccess: () => {
      toast.success("Contribution recorded!");
      setContributeNotice(null);
      setContribForm({ amount: "", payment_method: "upi" });
      qc.invalidateQueries({ queryKey: ["resident-notices"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? "Contribution failed"),
  });

  const submitContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribForm.amount || Number(contribForm.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    contributeMut.mutate({
      id: contributeNotice.id,
      data: {
        resident: residentId,
        amount: Number(contribForm.amount),
        payment_method: contribForm.payment_method,
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Notices & Events"
        description="Society announcements, events, and fundraisers from your admin."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && notices.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No notices yet.
          </div>
        )}

        {notices.map((n: any) => {
          const meta = CATEGORY_META[n.category] ?? CATEGORY_META.notice;
          const Icon = meta.icon;
          const progressPct = n.fundraiser_progress_pct ?? 0;

          return (
            <div key={n.id}
              className={`rounded-xl border p-4 md:p-5 transition-colors ${!n.is_read ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
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
                    {!n.is_read && (
                      <Badge className="text-[10px] px-2 bg-primary text-primary-foreground">New</Badge>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{n.description}</p>

                  <div className="mt-1.5 text-xs text-muted-foreground">
                    {n.event_date && <span>{n.event_date} · </span>}
                    {timeAgo(n.created_at)}
                    {n.audience_display && <span> · {n.audience_display}</span>}
                  </div>

                  {/* Fundraiser progress */}
                  {n.category === "fundraiser" && n.target_amount && (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          ₹{Number(n.raised_amount || 0).toLocaleString("en-IN")} raised
                        </span>
                        <span className="text-muted-foreground">
                          of ₹{Number(n.target_amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {n.read_count ? `${n.read_count} residents contributed` : "Be the first to contribute"}
                        </span>
                        <Button
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => {
                            setContributeNotice(n);
                            setContribForm({
                              amount: n.contribution_per_flat ? String(n.contribution_per_flat) : "",
                              payment_method: "upi",
                            });
                          }}
                        >
                          <IndianRupee className="h-3 w-3" /> Contribute
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Mark as read */}
                  {!n.is_read && (
                    <button
                      className="mt-2 text-xs text-primary hover:underline"
                      onClick={() => markReadMut.mutate(n.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contribute dialog */}
      <Dialog open={!!contributeNotice} onOpenChange={() => setContributeNotice(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Contribute to Fundraiser</DialogTitle>
          </DialogHeader>
          {contributeNotice && (
            <form onSubmit={submitContribution} className="space-y-3">
              <p className="text-sm text-muted-foreground">{contributeNotice.title}</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (₹) *</Label>
                <Input
                  type="number"
                  value={contribForm.amount}
                  onChange={e => setContribForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={contributeNotice.contribution_per_flat ? String(contributeNotice.contribution_per_flat) : "500"}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Method</Label>
                <Select value={contribForm.payment_method} onValueChange={v => setContribForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setContributeNotice(null)}>Cancel</Button>
                <Button type="submit" className="gap-1.5" disabled={contributeMut.isPending}>
                  <IndianRupee className="h-4 w-4" />
                  {contributeMut.isPending ? "Processing…" : "Contribute"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

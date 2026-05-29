import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, XCircle, Clock, FileText, ArrowRight, Download, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { approvals as initial } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/approvals")({
  component: ApprovalsPage,
});

const TABS = ["all", "pending", "in_review", "approved", "rejected"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  all: "All", pending: "Pending", in_review: "In Review", approved: "Approved", rejected: "Rejected",
};

const PRIORITY_STYLE: Record<string, string> = {
  high:   "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/40",
  medium: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40",
  low:    "bg-muted/50 text-foreground/80 border border-border",
};

const STATUS_STYLE: Record<string, string> = {
  approved:  "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800/40",
  rejected:  "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/40",
  pending:   "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40",
  in_review: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40",
};

function ApprovalsPage() {
  const [list, setList] = useState(initial);
  const [tab, setTab]   = useState<Tab>("all");
  const [active, setActive] = useState<typeof initial[number] | null>(null);

  const filtered = list.filter(a => tab === "all" || a.status === tab);
  const total    = list.length;
  const pending  = list.filter(a => a.status === "pending" || a.status === "in_review").length;
  const approved = list.filter(a => a.status === "approved").length;
  const rejected = list.filter(a => a.status === "rejected").length;

  const decide = (id: string, status: "approved" | "rejected") => {
    setList(l => l.map(a => a.id === id ? { ...a, status, progress: 100 } : a));
    setActive(null);
    toast.success(`Request ${status}`);
  };

  return (
    <div className="min-h-full bg-muted/20">
      <PageHeader
        title="Approval Workflow"
        description="Track and manage multi-stage approval processes"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border bg-background shadow-sm hover:border-primary/40 hover:text-primary">
            <Download className="h-3.5 w-3.5" /> Export Audit Log
          </Button>
        }
      />

      <div className="p-6 space-y-5 lg:p-8">

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatTile icon={FileText}    label="Total"          value={total}    iconBg="bg-slate-100 dark:bg-slate-800"  iconColor="text-slate-600 dark:text-slate-300" />
          <StatTile icon={Clock}       label="Pending Review" value={pending}  iconBg="bg-amber-50 dark:bg-amber-900/25"   iconColor="text-amber-600 dark:text-amber-400" valueColor="text-amber-700 dark:text-amber-400" />
          <StatTile icon={CheckCircle2} label="Approved"      value={approved} iconBg="bg-teal-50 dark:bg-teal-900/25"    iconColor="text-teal-600 dark:text-teal-400"  valueColor="text-teal-700 dark:text-teal-400" />
          <StatTile icon={XCircle}     label="Rejected"       value={rejected} iconBg="bg-rose-50 dark:bg-rose-900/25"    iconColor="text-rose-500 dark:text-rose-400"  valueColor="text-rose-600 dark:text-rose-400" />
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-background p-1 w-fit shadow-sm">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                tab === t
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {TAB_LABELS[t]}
              {t !== "all" && (
                <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  tab === t ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {list.filter(a => a.status === t || (t === "in_review" && a.status === "in_review")).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Request #","Title","Category","Requester","Priority","Stage","Progress","Status","Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setActive(a)}
                    className="border-b border-border/50 last:border-0 hover:bg-primary/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">{a.id}</td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">{a.title}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground/80 capitalize">{a.category}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-foreground">{a.requester}</div>
                      <div className="text-xs text-muted-foreground">{a.flat}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize", PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.low)}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">{a.stage}</td>
                    <td className="px-4 py-3.5 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${a.progress}%`,
                              background: a.status === "approved" ? "#0D9488" : a.status === "rejected" ? "#E11D48" : "#F59E0B",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium w-7 shrink-0">{a.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize", STATUS_STYLE[a.status] ?? STATUS_STYLE.pending)}>
                        {a.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground/80 shadow-sm hover:border-primary/40 hover:text-primary transition-all group-hover:border-primary/30">
                        Review <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No approvals in this category</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-background border-l border-border">
          {active && (
            <>
              <SheetHeader className="border-b border-border/60 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS_STYLE[active.status])}>
                    {active.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{active.id}</span>
                </div>
                <SheetTitle className="text-xl font-bold text-foreground">{active.title}</SheetTitle>
                <p className="text-xs text-muted-foreground">Created {active.createdAt}</p>
              </SheetHeader>

              <div className="px-1 pt-5 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Requester", value: active.requester },
                    { label: "Flat / Unit", value: active.flat },
                    { label: "Category", value: active.category },
                    { label: "Priority", value: active.priority },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-border/60 bg-muted/50 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
                      <div className="mt-1 text-sm font-semibold text-foreground capitalize">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="rounded-xl border border-border/60 bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Overall Progress</span>
                    <span className="text-sm font-bold text-primary">{active.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${active.progress}%`,
                        background: "linear-gradient(90deg, #0D9488, #06B6D4)",
                      }}
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Approval Timeline</div>
                  <ol className="space-y-0">
                    {[
                      { stage: "Submitted",     done: true,                          by: active.requester,      at: active.createdAt },
                      { stage: "Initial Review", done: active.progress > 33,         by: "Society Coordinator", at: active.progress > 33 ? "Today" : "Pending" },
                      { stage: "Society Admin",  done: active.progress > 66,         by: "Priya Sharma",        at: active.progress > 66 ? "Today" : "Pending" },
                      { stage: "Final Approval", done: active.status === "approved", by: "Super Admin",         at: active.status === "approved" ? "Today" : "Pending" },
                    ].map((s, i, arr) => (
                      <li key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "h-7 w-7 rounded-full grid place-items-center text-xs font-bold shrink-0",
                            s.done ? "bg-teal-500 text-white" : "bg-muted text-muted-foreground border border-border"
                          )}>
                            {s.done ? "✓" : i + 1}
                          </div>
                          {i < arr.length - 1 && (
                            <div className={cn("w-0.5 h-8 my-1", s.done ? "bg-teal-300 dark:bg-teal-700" : "bg-muted")} />
                          )}
                        </div>
                        <div className="pb-4 pt-1">
                          <div className={cn("text-sm font-semibold", s.done ? "text-foreground" : "text-muted-foreground")}>{s.stage}</div>
                          <div className="text-xs text-muted-foreground">{s.by} &middot; {s.at}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="text-xs font-semibold text-foreground/80 mb-1.5">Notes</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Verification documents uploaded. Background check passed. Ready for final review.
                  </p>
                </div>
              </div>

              {(active.status === "pending" || active.status === "in_review") && (
                <SheetFooter className="border-t border-border/60 pt-4 flex-row justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => decide(active.id, "rejected")}
                    className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/40 dark:text-rose-400 dark:hover:bg-rose-900/20"
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => decide(active.id, "approved")}
                    className="rounded-xl btn-teal text-white border-0"
                  >
                    Approve
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatTile({
  icon: Icon, label, value, iconBg, iconColor, valueColor = "text-foreground",
}: {
  icon: React.ElementType; label: string; value: number;
  iconBg: string; iconColor: string; valueColor?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      <div className={cn("text-3xl font-extrabold tracking-tight", valueColor)}>{value}</div>
      <div className="text-sm text-muted-foreground font-medium mt-1">{label}</div>
    </motion.div>
  );
}

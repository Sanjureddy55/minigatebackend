import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Search, Plus, QrCode, Camera, Loader2, ArrowRight,
  UserCheck, Clock, AlertCircle, CheckCircle2, XCircle,
  ChevronDown, Filter, RefreshCw, Wifi,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { visitors as initialVisitors, type Visitor } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/visitors")({
  component: VisitorsPage,
});

/* ── fake real-time gate events ─────────────────────────── */
const RT_NAMES  = ["Rahul Verma","Amazon Delivery","Swiggy Order","Priya Nair","Rohan Singh","Electrician","Zomato","Guest - Ananya"];
const RT_FLATS  = ["Tower A-402","Block B-201","Tower C-305","Block D-110","Tower A-709","Block F-812"];
const RT_TYPES: Visitor["type"][] = ["guest","delivery","cab","service"];

/* ── tab config ─────────────────────────────────────────── */
const TABS = [
  { key:"all",        label:"All Visitors",   icon: null },
  { key:"pending",    label:"Pending",        icon: AlertCircle },
  { key:"checked_in", label:"Inside",         icon: UserCheck },
  { key:"checked_out",label:"Exited",         icon: CheckCircle2 },
  { key:"rejected",   label:"Rejected",       icon: XCircle },
] as const;

/* ── visitor type colours ────────────────────────────────── */
const typeGrad: Record<string, string> = {
  guest:    "from-teal-500/20 to-teal-600/10 text-teal-600 border-teal-500/25",
  delivery: "from-sky-500/20 to-sky-600/10 text-sky-600 border-sky-500/25",
  cab:      "from-amber-500/20 to-amber-600/10 text-amber-600 border-amber-500/25",
  service:  "from-violet-500/20 to-violet-600/10 text-violet-600 border-violet-500/25",
};

function VisitorsPage() {
  const [list, setList]         = useState(initialVisitors);
  const [tab, setTab]           = useState<string>("all");
  const [q, setQ]               = useState("");
  const [open, setOpen]         = useState(false);
  const [submitting, setSub]    = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [pulse, setPulse]       = useState(false);
  const [form, setForm]         = useState({
    name:"", phone:"", purpose:"", flat:"", type:"guest",
  });

  /* ── real-time simulation ───────────────────────────────── */
  useEffect(() => {
    const interval = setInterval(() => {
      const name = RT_NAMES[Math.floor(Math.random() * RT_NAMES.length)];
      const flat  = RT_FLATS[Math.floor(Math.random() * RT_FLATS.length)];
      const type  = RT_TYPES[Math.floor(Math.random() * RT_TYPES.length)];
      const now   = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

      const newVisitor: Visitor = {
        id:       `VIS-${Date.now()}`,
        name,
        purpose:  type === "delivery" ? "Package delivery" : type === "cab" ? "Cab pickup" : "Personal visit",
        host:     "Resident",
        flat,
        phone:    `+91 9${String(Math.floor(Math.random()*899999999+100000000))}`,
        type,
        checkIn:  timeStr,
        status:   "pending",
      };

      setList(prev => [newVisitor, ...prev]);
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);

      toast(`Gate alert: ${name}`, {
        description: `Requesting entry → ${flat} · ${timeStr}`,
        icon: <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />,
        duration: 5000,
      });

      setLiveCount(c => c + 1);
    }, 18000); // new event every 18 s

    return () => clearInterval(interval);
  }, []);

  /* ── filter ──────────────────────────────────────────────── */
  const filtered = list.filter(v =>
    (tab === "all" || v.status === tab) &&
    (q === "" ||
      v.name.toLowerCase().includes(q.toLowerCase()) ||
      v.flat.toLowerCase().includes(q.toLowerCase()) ||
      v.purpose.toLowerCase().includes(q.toLowerCase()))
  );

  /* ── actions ─────────────────────────────────────────────── */
  const updateStatus = (id: string, status: Visitor["status"]) => {
    setList(l => l.map(v => v.id === id ? { ...v, status } : v));
    const labels: Record<string, string> = {
      checked_in: "Approved & checked in",
      checked_out:"Checked out",
      rejected:   "Entry rejected",
    };
    toast.success(labels[status] ?? `Marked ${status}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.flat) { toast.error("Fill required fields"); return; }
    setSub(true);
    const now = new Date();
    setTimeout(() => {
      setList(prev => [{
        id:`VIS-${Date.now()}`, name:form.name, phone:form.phone,
        purpose: form.purpose || "Personal visit", host:"Resident", flat:form.flat,
        type: form.type as Visitor["type"],
        checkIn:`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`,
        status:"pending",
      }, ...prev]);
      setSub(false); setOpen(false);
      setForm({ name:"", phone:"", purpose:"", flat:"", type:"guest" });
      toast.success("Visitor registered", { description:"Awaiting resident approval" });
    }, 700);
  };

  /* ── stats ───────────────────────────────────────────────── */
  const stats = {
    inside:  list.filter(v => v.status === "checked_in").length,
    pending: list.filter(v => v.status === "pending").length,
    total:   list.length,
    rejected:list.filter(v => v.status === "rejected").length,
  };

  return (
    <div className="min-h-full bg-muted/20">
      <PageHeader
        title="Visitors & Gate Operations"
        description="Live entry/exit logs, approvals and QR verification"
        badge="Live"
        actions={
          <>
            <Button variant="outline" size="sm"
              className="gap-1.5 rounded-xl border-border/70 bg-white/5 hover:bg-white/10 text-xs h-9">
              <QrCode className="h-3.5 w-3.5" /> Scan QR
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="gap-1.5 rounded-xl h-9 text-xs font-bold"
                  style={{ background:"linear-gradient(135deg,#0D9488,#06B6D4)", boxShadow:"0 4px 14px #0D948840" }}>
                  <Plus className="h-3.5 w-3.5" /> New Visitor
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md bg-background border-l border-border">
                <SheetHeader>
                  <SheetTitle className="text-lg font-bold">Register Visitor</SheetTitle>
                </SheetHeader>
                <form onSubmit={submit} className="px-4 pt-4 space-y-4">
                  <FormField label="Full name *">
                    <Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                      placeholder="e.g. Rahul Kumar"
                      className="rounded-xl border-border bg-muted/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/20" />
                  </FormField>
                  <FormField label="Mobile number *">
                    <Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
                      placeholder="+91 9876543210"
                      className="rounded-xl border-border bg-muted/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/20" />
                  </FormField>
                  <FormField label="Visit type">
                    <Select value={form.type} onValueChange={v=>setForm({...form,type:v})}>
                      <SelectTrigger className="rounded-xl border-border bg-muted/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guest">Guest</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="cab">Cab / Taxi</SelectItem>
                        <SelectItem value="service">Service Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Visiting flat *">
                    <Input value={form.flat} onChange={e=>setForm({...form,flat:e.target.value})}
                      placeholder="Tower A - 402"
                      className="rounded-xl border-border bg-muted/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/20" />
                  </FormField>
                  <FormField label="Purpose">
                    <Input value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}
                      placeholder="Personal visit, package, etc."
                      className="rounded-xl border-gray-200 bg-gray-50 focus:border-primary/60 focus:ring-1 focus:ring-primary/20" />
                  </FormField>
                  <div className="flex items-center gap-2 rounded-xl bg-muted/30 border border-border p-3 text-xs text-muted-foreground">
                    <Camera className="h-4 w-4 text-primary shrink-0" />
                    Photo capture at gate will be prompted on approval.
                  </div>
                  <SheetFooter className="flex-row justify-end gap-2 px-0 pb-0">
                    <Button type="button" variant="outline" onClick={()=>setOpen(false)} className="rounded-xl">Cancel</Button>
                    <Button type="submit" disabled={submitting} className="rounded-xl min-w-[100px]"
                      style={{ background:"linear-gradient(135deg,#0D9488,#06B6D4)" }}>
                      {submitting
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><span>Register</span><ArrowRight className="ml-1.5 h-4 w-4" /></>}
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </>
        }
      />

      <div className="p-6 space-y-6 lg:p-8">

        {/* ── Live indicator + KPI strip ──────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Real-time indicator */}
          <div className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-300",
            pulse
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-border bg-background text-muted-foreground shadow-sm",
          )}>
            <span className={cn("h-2 w-2 rounded-full", pulse ? "bg-sky-400 animate-pulse" : "bg-teal-500 animate-pulse")} />
            <Wifi className="h-3.5 w-3.5" />
            <span>{pulse ? "New arrival detected!" : "Gate feed live"}</span>
            {liveCount > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                +{liveCount} new
              </span>
            )}
          </div>

          {/* KPI pills */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:"Inside",  val:stats.inside,  color:"text-teal-600",     bg:"bg-teal-500/10 border-teal-500/20" },
              { label:"Pending", val:stats.pending,  color:"text-amber-400",   bg:"bg-amber-500/10 border-amber-500/20" },
              { label:"Today",   val:stats.total,    color:"text-foreground",  bg:"bg-muted/40 border-border" },
              { label:"Rejected",val:stats.rejected, color:"text-red-400",     bg:"bg-red-500/10 border-red-500/20" },
            ].map(k => (
              <div key={k.label} className={cn("rounded-2xl border p-3 text-center", k.bg)}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={k.val}
                    initial={{ opacity:0, y:-6 }}
                    animate={{ opacity:1, y:0 }}
                    exit={{ opacity:0, y:6 }}
                    className={cn("text-2xl font-extrabold", k.color)}
                  >
                    {k.val}
                  </motion.div>
                </AnimatePresence>
                <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 uppercase tracking-wide">
                  {k.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab bar + Search ─────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                  tab === t.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                {t.label}
                {t.key === "pending" && stats.pending > 0 && (
                  <span className="rounded-full bg-amber-400 text-black text-[9px] font-black px-1 leading-none py-0.5">
                    {stats.pending}
                  </span>
                )}
                {t.key === "checked_in" && stats.inside > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search visitor, flat, purpose…"
              className="w-full rounded-xl border border-border bg-muted/30 pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-muted/50 transition-all"
            />
          </div>
        </div>

        {/* ── Premium table ─────────────────────────────────────── */}
        <div className="card-premium overflow-hidden">
          {/* Sticky table header */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {["Visitor","Type","Destination","Vehicle","Time","Status","Actions"].map(h => (
                    <th key={h} className={cn(
                      "px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70",
                      h === "Actions" && "text-right",
                      h === "Vehicle" && "hidden lg:table-cell",
                    )}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((v, idx) => (
                    <motion.tr
                      key={v.id}
                      initial={{ opacity:0, x:-12 }}
                      animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, x:12 }}
                      transition={{ duration:0.25, delay: idx < 5 ? idx * 0.04 : 0 }}
                      className="group border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      {/* Visitor */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-xs font-bold bg-gradient-to-br",
                            typeGrad[v.type] ?? typeGrad.guest,
                          )}>
                            {v.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                            {v.status === "checked_in" && (
                              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-teal-400 border-2 border-card" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{v.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{v.phone} · {v.purpose}</p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4">
                        <StatusBadge status={v.type} />
                      </td>

                      {/* Destination */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground/80 text-sm">{v.flat}</p>
                        <p className="text-[11px] text-muted-foreground">Host: {v.host}</p>
                      </td>

                      {/* Vehicle */}
                      <td className="px-5 py-4 hidden lg:table-cell font-mono text-xs text-muted-foreground">
                        {v.vehicle ?? <span className="text-muted-foreground/40">—</span>}
                      </td>

                      {/* Time */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="text-foreground/80 font-medium">{v.checkIn}</span>
                        </div>
                        {v.checkOut && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">Out: {v.checkOut}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={v.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.status === "pending" && (
                            <>
                              <button
                                onClick={() => updateStatus(v.id, "rejected")}
                                className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => updateStatus(v.id, "checked_in")}
                                className="rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all"
                                style={{ background:"linear-gradient(135deg,#0D9488,#06B6D4)", boxShadow:"0 2px 8px #0D948840" }}
                              >
                                Approve
                              </button>
                            </>
                          )}
                          {v.status === "checked_in" && (
                            <button
                              onClick={() => updateStatus(v.id, "checked_out")}
                              className="rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-muted/60 transition-all"
                            >
                              Check out
                            </button>
                          )}
                          {(v.status === "checked_out" || v.status === "rejected" || v.status === "approved") && (
                            <button className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
                              Details
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted/40 mx-auto">
                          <UserCheck className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No visitors match these filters</p>
                        <p className="text-xs text-muted-foreground/60">Try adjusting the tab or search query</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
              <span className="font-semibold text-foreground">{list.length}</span> visitors
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              Auto-updating live
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

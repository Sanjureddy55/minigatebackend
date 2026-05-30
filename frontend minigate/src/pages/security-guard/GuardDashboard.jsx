import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { LogIn, LogOut, ShieldAlert, DoorOpen, CheckCircle2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { guardService } from '@/services/guard.service.js'

function KpiCard({ icon: Icon, value, label, color, bg }) {
  return (
    <motion.div whileHover={{ y: -2 }}
      className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className={`text-3xl font-extrabold tracking-tight ${color}`}>{value}</div>
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </motion.div>
  )
}

function DirectionBadge({ direction }) {
  return direction === 'in' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-[11px] font-bold text-green-700">
      <LogIn className="h-3 w-3" /> IN
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
      <LogOut className="h-3 w-3" /> OUT
    </span>
  )
}

export default function GuardDashboard() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['guard-dashboard'],
    queryFn: () => guardService.getDashboard().then((r) => r.data.data ?? r.data),
    refetchInterval: 30_000,
  })

  const ack = useMutation({
    mutationFn: (id) => guardService.acknowledgeAlert(id),
    onSuccess: () => {
      toast.success('Alert acknowledged')
      qc.invalidateQueries({ queryKey: ['guard-dashboard'] })
    },
    onError: () => toast.error('Failed to acknowledge alert'),
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Loading dashboard…
      </div>
    )
  }

  const d = data ?? {}

  return (
    <>
      <PageHeader
        title="Guard Dashboard"
        description="Live gate status and operations overview"
        badge="Live"
        actions={
          <Button size="sm" variant="outline" className="gap-1.5"
            onClick={() => qc.invalidateQueries({ queryKey: ['guard-dashboard'] })}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard icon={LogIn}      value={d.in_today ?? 0}      label="In Today"       color="text-sky-600"    bg="bg-sky-50" />
          <KpiCard icon={LogOut}     value={d.out_today ?? 0}     label="Out Today"      color="text-sky-600"    bg="bg-sky-50" />
          <KpiCard icon={DoorOpen}   value={d.at_gate ?? 0}       label="At Gate Now"    color="text-violet-600" bg="bg-violet-50" />
          <KpiCard icon={ShieldAlert} value={d.active_alerts ?? 0} label="Active Alerts" color="text-rose-600"   bg="bg-rose-50" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Live Entry / Exit */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">Live Entry / Exit</span>
              <a href="/guard/logs" className="text-xs font-semibold text-primary">View all →</a>
            </div>
            <div className="divide-y divide-border">
              {(d.live_entries ?? []).length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">No entries today.</p>
              )}
              {(d.live_entries ?? []).map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <DirectionBadge direction={e.direction} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{e.visitor_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{e.flat_number} · {e.gate}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-foreground">{e.time}</div>
                    <div className="text-[11px] font-bold text-muted-foreground mt-0.5">{e.entry_type_display}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {/* Gate Status */}
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3.5">
                <span className="font-semibold text-sm text-foreground">Gate Status</span>
              </div>
              <div className="divide-y divide-border">
                {(d.gate_status ?? []).length === 0 && (
                  <p className="px-5 py-6 text-sm text-muted-foreground">No gates configured.</p>
                )}
                {(d.gate_status ?? []).map((g) => (
                  <div key={g.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{g.name}</div>
                      {g.guard_name && <div className="text-xs text-muted-foreground mt-0.5">{g.guard_name}</div>}
                    </div>
                    <StatusBadge status={g.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Active Alerts */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <span className="font-semibold text-sm text-foreground">Active Alerts</span>
                <a href="/guard/alerts" className="text-xs font-semibold text-primary">View all →</a>
              </div>
              <div className="divide-y divide-border">
                {(d.active_alerts_list ?? []).length === 0 && (
                  <p className="px-5 py-6 text-sm text-muted-foreground">No active alerts.</p>
                )}
                {(d.active_alerts_list ?? []).map((a) => (
                  <div key={a.id} className="flex gap-3 px-5 py-3">
                    <div className={`w-1 rounded-full flex-shrink-0 min-h-[40px] ${a.status === 'active' ? 'bg-red-500' : 'bg-amber-400'}`} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground leading-snug">{a.description}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{a.time_ago}</div>
                      {a.status === 'active' ? (
                        <button onClick={() => ack.mutate(a.id)}
                          className="mt-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
                          ⊙ Acknowledge
                        </button>
                      ) : (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { UserCheck, Users, TimerOff, Search, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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

function VisitorCard({ row, onCheckIn, loading }) {
  const words = (row.visitor_name || '').trim().split(' ')
  const initials = (words[0]?.[0] ?? '') + (words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '')
  const canCheckIn = row.status === 'approved'

  const statusBg =
    row.status === 'inside'   ? 'border-green-300/30 bg-green-100/30' :
    row.status === 'approved' ? 'border-amber-300/30 bg-amber-100/30' :
                                'border-red-300/30 bg-red-100/30'
  const statusText =
    row.status === 'inside'   ? 'text-green-700'  :
    row.status === 'approved' ? 'text-amber-700'  : 'text-red-700'
  const statusLabel =
    row.status === 'inside'   ? 'INSIDE'   :
    row.status === 'approved' ? 'WAITING'  : 'EXPIRED'

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
          {initials.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate text-sm">{row.visitor_name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{row.mobile}</div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBg} ${statusText}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          ['Flat',    row.flat_display || '—'],
          ['Type',    row.visit_type_display],
          ...(row.valid_till     ? [['Valid Till', row.valid_till]]     : []),
          ...(row.host_name      ? [['Host',       row.host_name]]      : []),
          ...(row.vehicle_number ? [['Vehicle',    row.vehicle_number]] : []),
        ].map(([k, v]) => (
          <div key={k} className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="font-semibold text-foreground">{v}</div>
          </div>
        ))}
      </div>

      {row.notes_for_guard && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs italic text-muted-foreground">
          {row.notes_for_guard}
        </div>
      )}

      {canCheckIn && (
        <Button size="sm" className="w-full gap-1.5" onClick={onCheckIn} disabled={loading}>
          <UserCheck className="h-4 w-4" /> Check In Now
        </Button>
      )}
    </div>
  )
}

export default function ApprovedVisitors() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [visitType, setVisitType] = useState('')

  const { data: kpiData } = useQuery({
    queryKey: ['approved-stats'],
    queryFn: () => guardService.getApprovedStats().then((r) => r.data.data ?? r.data),
    refetchInterval: 30_000,
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['approved-visitors', search, visitType],
    queryFn: () =>
      guardService.getApprovedVisitors({
        search: search || undefined,
        visit_type: visitType || undefined,
      }).then((r) => r.data.results ?? []),
    refetchInterval: 30_000,
  })

  const checkIn = useMutation({
    mutationFn: ({ source, id }) => guardService.checkInApproved(source, id),
    onSuccess: (res) => {
      toast.success(res.data.message ?? 'Visitor checked in')
      qc.invalidateQueries({ queryKey: ['approved-visitors'] })
      qc.invalidateQueries({ queryKey: ['approved-stats'] })
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Check-in failed'),
  })

  const rows = listData ?? []
  const kpi = kpiData ?? { waiting_at_gate: 0, already_inside: 0, pass_expired: 0 }

  return (
    <>
      <PageHeader
        title="Approved Visitors"
        description="Pre-approved and real-time approved visitors"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/api/security-guard/approved-visitors/export/" target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard icon={Users}     value={kpi.waiting_at_gate} label="Waiting at Gate" color="text-amber-700"  bg="bg-amber-100/30" />
          <KpiCard icon={UserCheck} value={kpi.already_inside}  label="Already Inside"  color="text-green-700" bg="bg-green-100/30" />
          <KpiCard icon={TimerOff}  value={kpi.pass_expired}    label="Pass Expired"    color="text-red-700"   bg="bg-red-100/30" />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, mobile, flat…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={visitType} onValueChange={setVisitType}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="cab">Cab</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No approved visitors found.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <VisitorCard
              key={`${row.source}-${row.id}`}
              row={row}
              onCheckIn={() => checkIn.mutate({ source: row.source, id: row.id })}
              loading={checkIn.isPending}
            />
          ))}
        </div>
      </div>
    </>
  )
}

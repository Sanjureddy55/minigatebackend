import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Camera, AlertTriangle, DoorOpen, DoorClosed, Shield,
  Activity, CheckCircle, Info, Wifi,
} from 'lucide-react'
import { toast } from 'sonner'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

// ── helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['bg-teal-500','bg-violet-500','bg-orange-500','bg-pink-500','bg-blue-500','bg-emerald-500','bg-rose-400','bg-amber-500']
function avatarColor(s=''){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))&0xffff;return AVATAR_COLORS[h%AVATAR_COLORS.length]}
function initials(n=''){return n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?'}
function fmtTime(ts){if(!ts)return'—';return new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false})}

const VISITOR_STATUS_CLS = {
  pending:  'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-teal-50 text-teal-600',
  inside:   'bg-teal-50 text-teal-700',
  exited:   'bg-gray-100 text-gray-500',
  rejected: 'bg-red-50 text-red-500',
}
const VISITOR_STATUS_LABEL = {
  pending: 'Pending', approved: 'Approved', inside: 'Checked In', exited: 'Checked Out', rejected: 'Rejected',
}

const ALERT_BORDER = {
  active:       'border-l-red-500',
  acknowledged: 'border-l-amber-400',
  resolved:     'border-l-gray-300',
}
const ALERT_ICON_CLS = {
  unauthorized_vehicle: 'text-red-500',
  intrusion:            'text-red-600',
  fire:                 'text-orange-500',
  medical:              'text-rose-500',
  suspicious_activity:  'text-amber-500',
  other:                'text-gray-500',
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SecurityOperations() {
  const qc = useQueryClient()

  // Dashboard — all KPIs + live log + alerts
  const { data: dashRaw, isLoading } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: () => societyService.getSecurityDashboard().then(r => r.data?.data ?? r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
  const dash      = dashRaw ?? {}
  const alerts    = dash.active_alert_list ?? []
  const liveLog   = dashRaw?.live_entry_log ?? []

  // Guard Roster — today
  const { data: rosterRaw } = useQuery({
    queryKey: ['guard-roster'],
    queryFn: () => societyService.getGuardRoster().then(r => r.data?.results ?? r.data?.data ?? []),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  const roster = Array.isArray(rosterRaw) ? rosterRaw : []

  const invalidateDash = () => {
    qc.invalidateQueries({ queryKey: ['security-dashboard'] })
    qc.invalidateQueries({ queryKey: ['guard-roster'] })
  }

  const acknowledgeMut = useMutation({
    mutationFn: (id) => societyService.acknowledgeAlert(id),
    onSuccess: () => { toast.success('Alert acknowledged'); invalidateDash() },
    onError: e => toast.error(getErrorMessage(e)),
  })
  const resolveMut = useMutation({
    mutationFn: (id) => societyService.resolveAlert(id),
    onSuccess: () => { toast.success('Alert resolved'); invalidateDash() },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const KPI = [
    {
      label: 'Open Gates',
      value: isLoading ? '—' : `${dash.open_gates ?? 0} / ${dash.total_gates ?? 0}`,
      icon: DoorOpen,
      iconBg: 'bg-blue-50', iconColor: 'text-blue-600', color: 'text-blue-600',
    },
    {
      label: 'Guards on Duty',
      value: isLoading ? '—' : `${dash.guards_on_duty ?? 0} / ${dash.total_guards ?? 0}`,
      icon: Shield,
      iconBg: 'bg-teal-50', iconColor: 'text-teal-600', color: 'text-teal-600',
    },
    {
      label: 'Active Alerts',
      value: isLoading ? '—' : dash.active_alerts ?? 0,
      icon: AlertTriangle,
      iconBg: 'bg-red-50', iconColor: 'text-red-500', color: 'text-red-500',
    },
    {
      label: 'Events Today',
      value: isLoading ? '—' : dash.events_today ?? 0,
      icon: Activity,
      iconBg: 'bg-violet-50', iconColor: 'text-violet-600', color: 'text-foreground',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live gate operations, alerts and emergency workflows</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>toast.info('CCTV Live — coming soon')}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Camera className="h-4 w-4"/> CCTV Live
          </button>
          <button onClick={()=>toast.error('Emergency raised! Notifying all guards…')}
            className="flex items-center gap-2 rounded-xl bg-red-500 text-white px-4 py-2 text-sm font-semibold hover:bg-red-600 transition-colors">
            <AlertTriangle className="h-4 w-4"/> Raise Emergency
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI.map(({ label, value, icon: Icon, iconBg, iconColor, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`}/>
            </div>
            <div>
              <div className={`text-2xl font-extrabold leading-tight ${color}`}>{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main 2-col layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* Live Entry / Exit Log */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Live entry / exit log</h3>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"/>
              </span>
              Live
            </span>
          </div>

          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({length:5}).map((_,i)=>(
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-muted shrink-0"/>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 rounded bg-muted"/>
                    <div className="h-2.5 w-24 rounded bg-muted"/>
                  </div>
                  <div className="h-6 w-16 rounded bg-muted"/>
                </div>
              ))
            ) : liveLog.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">No live activity</div>
            ) : liveLog.map((v, i) => {
              const name   = v.full_name || 'Visitor'
              const status = (v.status || '').toLowerCase()
              const dest   = [v.flat_number, v.building_name].filter(Boolean).join(' / ')
              const gate   = v.gate_name || v.gate || 'Gate 1'
              const purpose= v.purpose || v.visit_type_display || v.visit_type || ''
              return (
                <div key={v.id ?? i} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(name)}`}>
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground text-sm">{name}</span>
                      {dest && <span className="text-xs text-muted-foreground">to {dest}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[purpose, gate].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {v.checked_in_at && (
                      <span className="text-xs text-muted-foreground">{fmtTime(v.checked_in_at)}</span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${VISITOR_STATUS_CLS[status] || 'bg-muted text-muted-foreground'}`}>
                      {VISITOR_STATUS_LABEL[status] || v.status_display || status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Active Alerts */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Active alerts</h3>
            </div>
            <div className="divide-y divide-border">
              {alerts.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No active alerts</div>
              ) : alerts.map((alert) => {
                const alertStatus = (alert.status || 'active').toLowerCase()
                const iconCls = ALERT_ICON_CLS[alert.alert_type] || 'text-gray-500'
                const borderCls = ALERT_BORDER[alertStatus] || 'border-l-gray-300'
                const isActive = alertStatus === 'active'
                const isAcked  = alertStatus === 'acknowledged'
                return (
                  <div key={alert.id} className={`px-4 py-4 border-l-4 ${borderCls}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${iconCls}`}/>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-sm leading-snug">
                          {alert.alert_type_display || alert.alert_type}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[alert.gate, alert.time_ago].filter(Boolean).join(' · ')}
                        </div>
                        {alert.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.description}</div>
                        )}
                      </div>
                    </div>
                    {(isActive || isAcked) && (
                      <div className="flex gap-2 mt-2">
                        {isActive && (
                          <button
                            onClick={() => acknowledgeMut.mutate(alert.id)}
                            disabled={acknowledgeMut.isPending}
                            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60">
                            <CheckCircle className="h-3 w-3"/> Acknowledge
                          </button>
                        )}
                        {isAcked && (
                          <button
                            onClick={() => resolveMut.mutate(alert.id)}
                            disabled={resolveMut.isPending}
                            className="flex items-center gap-1 rounded-lg border border-teal-300 text-teal-700 px-2.5 py-1 text-xs font-medium hover:bg-teal-50 transition-colors disabled:opacity-60">
                            <CheckCircle className="h-3 w-3"/> Resolve
                          </button>
                        )}
                        <button
                          onClick={() => toast.info(`Alert #${alert.id}: ${alert.description}`)}
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors">
                          <Info className="h-3 w-3"/> Details
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Guard Roster */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Guard roster</h3>
            </div>
            <div className="divide-y divide-border">
              {roster.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No roster for today</div>
              ) : roster.map((shift, i) => {
                const name     = shift.guard_name || shift.full_name || `Guard ${shift.guard}`
                const onDuty   = shift.on_duty ?? shift.status === 'active'
                const gate     = shift.gate_assigned || '—'
                const shiftTime = shift.shift_time || `${shift.start_time?.slice(0,5) ?? ''} - ${shift.end_time?.slice(0,5) ?? ''}`
                return (
                  <div key={shift.id ?? i} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(name)}`}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground leading-tight">{name}</div>
                      <div className="text-xs text-muted-foreground">{gate} · {shiftTime}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${onDuty ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                      {shift.duty_label || (onDuty ? 'On Duty' : 'Off Duty')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

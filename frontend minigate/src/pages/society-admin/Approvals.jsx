import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Clock, CheckCircle2, XCircle, Download,
  ChevronRight, X, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

// ── helpers ───────────────────────────────────────────────────────────────────
const PRIORITY_CLS = {
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  high:   'bg-red-50 text-red-600 border border-red-200',
  urgent: 'bg-red-100 text-red-700 font-bold',
}
const STATUS_CLS = {
  pending:   'bg-amber-50 text-amber-700',
  approved:  'bg-teal-50 text-teal-700',
  rejected:  'bg-red-50 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
  in_review: 'bg-blue-50 text-blue-700',
}
const PROGRESS_COLOR = (pct) => {
  if (pct >= 80) return 'bg-teal-500'
  if (pct >= 50) return 'bg-amber-400'
  if (pct >= 20) return 'bg-red-400'
  return 'bg-red-500'
}

// ── Review / Detail Modal ─────────────────────────────────────────────────────
function ReviewModal({ approval, onClose }) {
  const qc = useQueryClient()
  const [notes, setNotes]   = useState('')
  const [reason, setReason] = useState('')
  const [mode, setMode]     = useState(null) // 'approve' | 'reject'

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['society-approvals'] })
    qc.invalidateQueries({ queryKey: ['approval-kpi'] })
    onClose()
  }

  const approveMut = useMutation({
    mutationFn: () => societyService.approveApproval(approval.id, { reviewer_notes: notes, progress: 100 }),
    onSuccess: () => { toast.success('Approval approved'); invalidate() },
    onError: e => toast.error(getErrorMessage(e)),
  })
  const rejectMut = useMutation({
    mutationFn: () => societyService.rejectApproval(approval.id, reason),
    onSuccess: () => { toast.success('Approval rejected'); invalidate() },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const pct     = approval.progress ?? 0
  const status  = (approval.status || '').toLowerCase()
  const isDone  = status === 'approved' || status === 'rejected' || status === 'cancelled'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{approval.approval_number}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLS[status] || 'bg-muted text-muted-foreground'}`}>
                {approval.status_display || approval.status}
              </span>
            </div>
            <h3 className="font-bold text-foreground text-lg">{approval.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {approval.category_display} · {approval.stage_display}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted">
            <X className="h-3.5 w-3.5"/>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Details */}
          <div className="rounded-xl bg-muted/30 p-4 space-y-2 text-sm">
            {approval.description && <p className="text-muted-foreground">{approval.description}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Requester: </span><strong>{approval.requester_name}</strong></div>
              <div><span className="text-muted-foreground">Priority: </span>
                <span className={`rounded px-1.5 py-0.5 font-semibold capitalize ${PRIORITY_CLS[(approval.priority||'').toLowerCase()]}`}>
                  {approval.priority_display || approval.priority}
                </span>
              </div>
              {approval.reviewer_name && <div><span className="text-muted-foreground">Reviewer: </span><strong>{approval.reviewer_name}</strong></div>}
              {approval.reviewer_notes && <div className="col-span-2"><span className="text-muted-foreground">Notes: </span>{approval.reviewer_notes}</div>}
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progress</span><span>{pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all ${PROGRESS_COLOR(pct)}`} style={{ width: `${pct}%` }}/>
            </div>
          </div>

          {/* Action area — only if pending */}
          {!isDone && !mode && (
            <div className="flex gap-2 pt-1">
              <button onClick={()=>setMode('reject')}
                className="flex-1 rounded-xl border border-destructive/40 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors">
                Reject
              </button>
              <button onClick={()=>setMode('approve')}
                className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold">
                Approve
              </button>
            </div>
          )}

          {mode === 'approve' && (
            <div className="space-y-3">
              <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                placeholder="Reviewer notes (optional)…" rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"/>
              <div className="flex gap-2">
                <button onClick={()=>setMode(null)} className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted">Back</button>
                <button onClick={()=>approveMut.mutate()} disabled={approveMut.isPending}
                  className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
                  {approveMut.isPending ? 'Approving…' : 'Confirm Approve'}
                </button>
              </div>
            </div>
          )}

          {mode === 'reject' && (
            <div className="space-y-3">
              <textarea value={reason} onChange={e=>setReason(e.target.value)}
                placeholder="Reason for rejection (required)…" rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"/>
              <div className="flex gap-2">
                <button onClick={()=>setMode(null)} className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted">Back</button>
                <button
                  onClick={()=>{ if(!reason.trim()){toast.error('Reason required');return} rejectMut.mutate() }}
                  disabled={rejectMut.isPending}
                  className="flex-1 rounded-xl bg-destructive text-white py-2 text-sm font-semibold hover:bg-destructive/90 disabled:opacity-60">
                  {rejectMut.isPending ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          )}

          {isDone && (
            <p className="text-center text-sm text-muted-foreground py-2">
              This approval has been <strong>{status}</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'in_review', label: 'In Review' },
  { key: 'approved',  label: 'Approved' },
  { key: 'rejected',  label: 'Rejected' },
]

export default function SocietyApprovals() {
  const [tab, setTab]           = useState('all')
  const [selected, setSelected] = useState(null)

  // KPI cards
  const { data: kpiRaw } = useQuery({
    queryKey: ['approval-kpi'],
    queryFn: () => societyService.getApprovalKpi().then(r => r.data?.data ?? r.data),
    staleTime: 30_000,
  })
  const kpi = kpiRaw ?? {}

  // List — fetch all, filter client-side
  const { data, isLoading } = useQuery({
    queryKey: ['society-approvals'],
    queryFn: () => societyService.getApprovals({ page_size: 100, ordering: '-created_at' }).then(r => r.data),
    staleTime: 30_000,
  })

  const all = data?.results ?? []
  const rows = tab === 'all' ? all : all.filter(a => (a.status || '').toLowerCase() === tab)

  // Tab counts from KPI
  const tabCounts = {
    all:       kpi.total         ?? all.length,
    pending:   kpi.pending_review ?? 0,
    in_review: kpi.in_review      ?? 0,
    approved:  kpi.approved       ?? 0,
    rejected:  kpi.rejected       ?? 0,
  }

  const KPI_CARDS = [
    { label: 'Total',          value: kpi.total          ?? 0, icon: FileText,     iconBg: 'bg-gray-100',    iconColor: 'text-gray-600',    color: 'text-foreground' },
    { label: 'Pending Review', value: kpi.pending_review ?? 0, icon: Clock,        iconBg: 'bg-amber-50',    iconColor: 'text-amber-500',   color: 'text-amber-600' },
    { label: 'Approved',       value: kpi.approved       ?? 0, icon: CheckCircle2, iconBg: 'bg-teal-50',     iconColor: 'text-teal-500',    color: 'text-teal-600' },
    { label: 'Rejected',       value: kpi.rejected       ?? 0, icon: XCircle,      iconBg: 'bg-red-50',      iconColor: 'text-red-500',     color: 'text-red-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approval Workflow</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="text-teal-500 font-medium">Track</span> and manage multi-stage approval processes
          </p>
        </div>
        <button onClick={()=>toast.info('Export started')}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
          <Download className="h-4 w-4"/> Export Audit Log
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI_CARDS.map(({ label, value, icon: Icon, iconBg, iconColor, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`}/>
            </div>
            <div>
              <div className={`text-3xl font-extrabold leading-tight ${color}`}>{isLoading ? '—' : value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-border pb-0 overflow-x-auto">
          {TABS.map(({ key, label }) => {
            const count = tabCounts[key]
            return (
              <button key={key} onClick={()=>setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  tab===key ? 'border-teal-500 text-teal-600' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab===key ? 'bg-teal-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Request #</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Requester</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Priority</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Stage</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Progress</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({length:6}).map((_,i)=>(
                  <tr key={i} className="border-b border-border">
                    {Array.from({length:9}).map((_,j)=>(
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 w-16 rounded bg-muted animate-pulse"/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2"/>
                    <p className="text-sm text-muted-foreground">No approvals found</p>
                  </td>
                </tr>
              ) : rows.map((a) => {
                const status   = (a.status || '').toLowerCase()
                const priority = (a.priority || '').toLowerCase()
                const pct      = a.progress ?? 0
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    {/* Request # */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">{a.approval_number}</span>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground leading-tight max-w-[160px]">{a.title}</div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground capitalize">{a.category_display || a.category}</span>
                    </td>

                    {/* Requester */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-sm font-medium text-foreground">{a.requester_name || '—'}</div>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PRIORITY_CLS[priority] || 'bg-muted text-muted-foreground'}`}>
                        {a.priority_display || a.priority}
                      </span>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{a.stage_display || a.stage}</span>
                    </td>

                    {/* Progress bar */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${PROGRESS_COLOR(pct)}`} style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="text-[10px] text-muted-foreground w-7 shrink-0">{pct}%</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[status] || 'bg-muted text-muted-foreground'}`}>
                        {a.status_display || a.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <button onClick={()=>setSelected(a)}
                        className="flex items-center gap-0.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors">
                        Review <ChevronRight className="h-3 w-3"/>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {rows.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">Showing <strong>{rows.length}</strong> of <strong>{all.length}</strong> approvals</p>
          </div>
        )}
      </div>

      {selected && <ReviewModal approval={selected} onClose={()=>setSelected(null)}/>}
    </div>
  )
}

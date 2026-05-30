import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { UserPlus, Search, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { guardService } from '@/services/guard.service.js'

// ── Visit type config ─────────────────────────────────────────────────────────
const TYPE_CFG = {
  guest:    { label: 'Guest',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  delivery: { label: 'Delivery', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  service:  { label: 'Service',  cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  cab:      { label: 'Cab',      cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  staff:    { label: 'Staff',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  other:    { label: 'Other',    cls: 'bg-slate-50 text-slate-600 border-slate-200' },
}

// Status tab config — matches API status values
const TABS = [
  { key: 'all',      label: 'All Visitors', dot: null },
  { key: 'pending',  label: 'Pending',       dot: 'bg-amber-400' },
  { key: 'inside',   label: 'Inside',        dot: 'bg-teal-500' },
  { key: 'exited',   label: 'Exited',        dot: null },
  { key: 'rejected', label: 'Rejected',      dot: null },
]

// Avatar colors
const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-orange-500',
]
function avatarColor(name = '') {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}
function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

// ── Register Visitor Modal ────────────────────────────────────────────────────
const VISIT_TYPES = [
  { value: 'guest',    label: 'Guest' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'service',  label: 'Service' },
  { value: 'cab',      label: 'Cab / Taxi' },
  { value: 'staff',    label: 'Staff' },
  { value: 'other',    label: 'Other' },
]

const EMPTY = {
  full_name: '', mobile: '', visit_type: 'guest',
  host_name: '', purpose: '', vehicle_number: '',
}

function RegisterModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY })
  const [errors, setErrors] = useState({})

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const mutation = useMutation({
    mutationFn: (data) => guardService.registerVisitor(data),
    onSuccess: () => {
      toast.success(`${form.full_name} registered at gate`)
      onSaved()
      onClose()
    },
    onError: (err) => {
      const d = err?.response?.data
      if (d && typeof d === 'object') {
        const e = {}
        Object.entries(d).forEach(([k, v]) => { e[k] = Array.isArray(v) ? v[0] : String(v) })
        setErrors(e)
        toast.error(Object.values(e)[0] ?? 'Registration failed')
      } else {
        toast.error(err?.response?.data?.message ?? 'Registration failed')
      }
    },
  })

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.full_name.trim()) next.full_name = 'Full name is required'
    if (!form.mobile.trim())    next.mobile    = 'Mobile is required'
    setErrors(next)
    if (Object.keys(next).length) return
    mutation.mutate(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">

        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base">Register Visitor</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Guard-verified entry — approved immediately</p>
          </div>
          <button onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Full Name *</label>
              <input
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                placeholder="Visitor's full name"
                autoFocus
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-muted-foreground/50"
              />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Mobile *</label>
              <input
                value={form.mobile}
                onChange={e => set('mobile', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-muted-foreground/50"
              />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Visitor Type</label>
              <select
                value={form.visit_type}
                onChange={e => set('visit_type', e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none"
              >
                {VISIT_TYPES.map(vt => (
                  <option key={vt.value} value={vt.value}>{vt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Visiting Flat / Host</label>
              <input
                value={form.host_name}
                onChange={e => set('host_name', e.target.value)}
                placeholder="e.g. A-402 or Ravi Kumar"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Vehicle No.</label>
              <input
                value={form.vehicle_number}
                onChange={e => set('vehicle_number', e.target.value)}
                placeholder="MH 12 AB 1234"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Purpose</label>
              <input
                value={form.purpose}
                onChange={e => set('purpose', e.target.value)}
                placeholder="Reason for visit (optional)"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2.5 text-sm font-semibold disabled:opacity-60 transition-colors">
              {mutation.isPending ? 'Registering…' : 'Register Visitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ visitor, onClose, onSaved }) {
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: () => guardService.rejectVisitor(visitor.id),
    onSuccess: () => { toast.success('Visitor rejected'); onSaved(); onClose() },
    onError:   ()  => toast.error('Rejection failed'),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Reject Visitor</h3>
        <p className="text-sm text-muted-foreground">
          Reject <strong>{visitor.full_name || visitor.visitor_name}</strong>?
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for rejection (optional)"
          rows={2}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
        />
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-semibold disabled:opacity-60">
            {mutation.isPending ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VisitorEntry() {
  const qc = useQueryClient()
  const [tab,      setTab]      = useState('all')
  const [search,   setSearch]   = useState('')
  const [showAdd,  setShowAdd]  = useState(false)
  const [rejectV,  setRejectV]  = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gate-log', tab, search],
    queryFn: () =>
      guardService.getGateLog({
        status:    tab !== 'all' ? tab : undefined,
        search:    search || undefined,
        page_size: 50,
      }).then(r => r.data),
    refetchInterval: 30_000,
  })

  const rows = data?.results ?? []

  const approveMut = useMutation({
    mutationFn: (id) => guardService.approveVisitor(id),
    onSuccess: () => { toast.success('Visitor approved'); invalidate() },
    onError:   ()  => toast.error('Approval failed'),
  })
  const checkInMut = useMutation({
    mutationFn: (id) => guardService.checkInVisitor(id),
    onSuccess: () => { toast.success('Visitor checked in'); invalidate() },
    onError:   ()  => toast.error('Check-in failed'),
  })
  const checkOutMut = useMutation({
    mutationFn: (id) => guardService.checkOutVisitor(id),
    onSuccess: () => { toast.success('Visitor checked out'); invalidate() },
    onError:   ()  => toast.error('Check-out failed'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['gate-log'] })

  // Tab counts from data (rough from current filter)
  const allCount = data?.count ?? 0

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visitor Entry</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gate check-in log and visitor management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-xl border border-border bg-background p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            <UserPlus className="h-4 w-4" /> Register Visitor
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Live indicator + Search ── */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
          {/* Gate feed live */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
            </span>
            Gate feed live
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value) }}
              placeholder="Search by name or mobile…"
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="px-6 border-b border-border">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.key
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.dot && (
                  <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                )}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Visitor</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Destination</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Time</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        Loading visitors…
                      </td>
                    </tr>
                  )}

                  {!isLoading && rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <p className="text-sm font-medium text-foreground">No visitors found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tab !== 'all'
                            ? `No ${tab} visitors right now.`
                            : 'No visitors logged today yet.'
                          }
                        </p>
                      </td>
                    </tr>
                  )}

                  {rows.map(row => {
                    const name    = row.full_name || row.visitor_name || '—'
                    const typeKey = (row.visit_type || '').toLowerCase()
                    const typeCfg = TYPE_CFG[typeKey] ?? TYPE_CFG.other
                    const status  = (row.status || '').toLowerCase()

                    // Destination = flat_display + host_name
                    const dest = [row.flat_display, row.host_name]
                      .filter(Boolean)
                      .join(' / ') || '—'

                    // Time display
                    const inTime = row.checked_in_at
                      ? new Date(row.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : row.created_at
                        ? new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '—'

                    return (
                      <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        {/* Visitor */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(name)}`}>
                              {initials(name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-sm leading-tight">{name}</p>
                              {row.mobile && (
                                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{row.mobile}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeCfg.cls}`}>
                            {row.visit_type_display || typeCfg.label}
                          </span>
                        </td>

                        {/* Destination */}
                        <td className="px-4 py-3.5 hidden sm:table-cell text-muted-foreground text-xs">
                          {dest}
                        </td>

                        {/* Time */}
                        <td className="px-4 py-3.5 hidden md:table-cell text-xs text-muted-foreground font-mono">
                          {inTime}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusDot status={status} display={row.status_display} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {status === 'pending' && (
                              <>
                                <ActionBtn
                                  label="Approve"
                                  cls="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                  onClick={() => approveMut.mutate(row.id)}
                                  loading={approveMut.isPending}
                                />
                                <ActionBtn
                                  label="Reject"
                                  cls="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                  onClick={() => setRejectV(row)}
                                />
                              </>
                            )}
                            {status === 'approved' && (
                              <>
                                <ActionBtn
                                  label="Check In"
                                  cls="border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                                  onClick={() => checkInMut.mutate(row.id)}
                                  loading={checkInMut.isPending}
                                />
                                <ActionBtn
                                  label="Reject"
                                  cls="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                  onClick={() => setRejectV(row)}
                                />
                              </>
                            )}
                            {status === 'inside' && (
                              <ActionBtn
                                label="Check Out"
                                cls="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                onClick={() => checkOutMut.mutate(row.id)}
                                loading={checkOutMut.isPending}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            {rows.length > 0 && (
              <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                Showing <strong className="text-foreground">{rows.length}</strong>
                {allCount > rows.length && <> of <strong className="text-foreground">{allCount}</strong></>} visitors
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <RegisterModal
          onClose={() => setShowAdd(false)}
          onSaved={invalidate}
        />
      )}
      {rejectV && (
        <RejectModal
          visitor={rejectV}
          onClose={() => setRejectV(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusDot({ status, display }) {
  const cfg = {
    pending:  { dot: 'bg-amber-400', text: 'text-amber-700' },
    approved: { dot: 'bg-blue-400',  text: 'text-blue-700' },
    inside:   { dot: 'bg-teal-500',  text: 'text-teal-700' },
    exited:   { dot: 'bg-slate-400', text: 'text-slate-600' },
    rejected: { dot: 'bg-red-400',   text: 'text-red-600' },
  }[status] ?? { dot: 'bg-slate-400', text: 'text-slate-600' }

  return (
    <span className={`flex items-center gap-1.5 text-xs font-semibold capitalize ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {display || status}
    </span>
  )
}

function ActionBtn({ label, cls, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${cls}`}
    >
      {loading ? '…' : label}
    </button>
  )
}

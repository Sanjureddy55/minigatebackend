import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download, Plus, Search, X, ChevronLeft, ChevronRight,
  Filter, Wallet, TrendingUp, AlertCircle, Users, AlertTriangle,
  CheckCircle2, Clock, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

// ── Indian currency format ────────────────────────────────────────────────────
function inr(amount) {
  if (amount == null) return '—'
  const n = Number(amount)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// ── Short lakhs format for KPI cards: 3840000 → ₹38.4L ─────────────────────
function inrShort(amount) {
  if (amount == null) return '—'
  const n = Number(amount)
  if (isNaN(n)) return '—'
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n}`
}

// ── Format due date: "2026-05-05" → "05 May" ─────────────────────────────────
function fmtDue(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

// ── Status badge config ───────────────────────────────────────────────────────
// API status: paid → "Approved" | pending → "Pending" | overdue → "Rejected"
const STATUS_CFG = {
  paid:    { cls: 'bg-green-50 text-green-700 border-green-200', label: 'Approved', icon: CheckCircle2 },
  pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending',  icon: Clock },
  overdue: { cls: 'bg-red-50   text-red-600   border-red-200',   label: 'Rejected', icon: XCircle },
}

function StatusBadge({ status, display }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {display || cfg.label}
    </span>
  )
}

// ── Generate Dues Modal ───────────────────────────────────────────────────────
function GenerateModal({ onClose }) {
  const qc = useQueryClient()
  const now = new Date()
  const [form, setForm] = useState({
    month:       `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    amount:      '',
    due_date:    '',
    description: '',
  })
  const [errors, setErrors] = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mut = useMutation({
    mutationFn: (data) => societyService.generateDues(data),
    onSuccess: (res) => {
      const d = res.data
      toast.success(d.message || `${d.generated} dues generated`)
      if (d.skipped > 0) toast.info(`${d.skipped} flats already had dues — skipped`)
      qc.invalidateQueries({ queryKey: ['payments-overview'] })
      onClose()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || getErrorMessage(err)
      toast.error(msg)
    },
  })

  function submit(e) {
    e.preventDefault()
    const er = {}
    if (!form.month)              er.month    = 'Month is required'
    if (!form.amount || Number(form.amount) <= 0) er.amount = 'Valid amount required'
    if (!form.due_date)           er.due_date = 'Due date is required'
    setErrors(er)
    if (Object.keys(er).length) return
    mut.mutate({
      month:       form.month,
      amount:      Number(form.amount),
      due_date:    form.due_date,
      description: form.description.trim() || undefined,
    })
  }

  const ic = (hasErr) =>
    `w-full rounded-xl border ${hasErr ? 'border-red-400' : 'border-input'} bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30`
  const lc = 'text-xs font-medium text-muted-foreground block mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground text-base">Generate Dues</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Creates dues for all occupied flats in the society.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Month */}
          <div>
            <label className={lc}>Billing Month *</label>
            <input type="month" value={form.month} onChange={e => f('month', e.target.value)}
              className={ic(errors.month)} />
            {errors.month && <p className="text-xs text-red-500 mt-1">{errors.month}</p>}
          </div>

          {/* Amount + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Amount per Flat (₹) *</label>
              <input type="number" min="1" value={form.amount} onChange={e => f('amount', e.target.value)}
                placeholder="2500" className={ic(errors.amount)} />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className={lc}>Due Date *</label>
              <input type="date" value={form.due_date} onChange={e => f('due_date', e.target.value)}
                className={ic(errors.due_date)} />
              {errors.due_date && <p className="text-xs text-red-500 mt-1">{errors.due_date}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={lc}>Description (optional)</label>
            <input value={form.description} onChange={e => f('description', e.target.value)}
              placeholder="May 2026 Maintenance" className={ic(false)} />
          </div>

          {/* Info note */}
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="text-xs text-teal-700">
              Dues are generated only for occupied flats. Flats that already have a due for this month are skipped.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mut.isPending}
              className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {mut.isPending ? 'Generating…' : 'Generate Dues'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Update Status Modal ───────────────────────────────────────────────────────
function UpdateStatusModal({ due, onClose }) {
  const qc = useQueryClient()
  const [newStatus, setNewStatus] = useState(due.status)

  const mut = useMutation({
    mutationFn: (s) => societyService.updateDueStatus(due.due_id, { status: s }),
    onSuccess: (res) => {
      const lbl = STATUS_CFG[res.data?.data?.status]?.label || 'Updated'
      toast.success(`Due marked as ${lbl}`)
      qc.invalidateQueries({ queryKey: ['payments-overview'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const OPTIONS = [
    { value: 'paid',    label: 'Approved (Paid)',    cls: 'text-green-700 bg-green-50  border-green-200' },
    { value: 'pending', label: 'Pending',             cls: 'text-amber-700 bg-amber-50  border-amber-200' },
    { value: 'overdue', label: 'Rejected (Overdue)', cls: 'text-red-600   bg-red-50    border-red-200'   },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground text-base">Update Payment Status</h3>
          <button onClick={onClose} className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Due info */}
          <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Flat</span>
              <span className="font-mono font-semibold">{due.flat_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resident</span>
              <span className="font-medium">{due.resident || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-teal-600">{inr(due.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>{fmtDue(due.due_date)}</span>
            </div>
          </div>

          {/* Status selection */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Select new status</p>
            {OPTIONS.map(({ value, label, cls }) => (
              <button key={value} type="button"
                onClick={() => setNewStatus(value)}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-colors
                  ${newStatus === value ? cls + ' ring-2 ring-offset-1 ring-teal-400' : 'border-border hover:bg-muted'}`}
              >
                {label}
                {newStatus === value && <CheckCircle2 className="h-4 w-4" />}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={() => mut.mutate(newStatus)}
              disabled={mut.isPending || newStatus === due.status}
              className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {mut.isPending ? 'Saving…' : 'Update Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

export default function SocietyPayments() {
  const qc = useQueryClient()

  // Current month as default
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [month, setMonth]         = useState(defaultMonth)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedDue, setSelectedDue]   = useState(null)
  const [page, setPage]           = useState(1)

  // Fetch overview
  const { data: raw, isLoading } = useQuery({
    queryKey: ['payments-overview', month],
    queryFn:  () => societyService.getPaymentsOverview({ month }).then(r => r.data?.data ?? r.data),
    staleTime: 30_000,
  })

  const overview = raw ?? {}
  const allDues  = overview.dues ?? []

  // Client-side filter (API returns all dues for the month, no server-side pagination)
  const filtered = allDues.filter(d => {
    const matchSearch = !search || [d.flat_number, d.resident, d.building]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = !statusFilter || d.status === statusFilter
    return matchSearch && matchStatus
  })

  // Client-side pagination
  const total    = filtered.length
  const pages    = Math.ceil(total / PAGE_SIZE)
  const pageSlice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Month label e.g. "May 2026"
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const KPI = [
    {
      icon: TrendingUp, iconCls: 'text-teal-600 bg-teal-50',
      label: `Collected (${monthLabel.split(' ')[0]})`,
      value: inrShort(overview.collected_this_month),
    },
    {
      icon: Wallet, iconCls: 'text-amber-600 bg-amber-50',
      label: 'Outstanding',
      value: inrShort(overview.outstanding),
    },
    {
      icon: Users, iconCls: 'text-red-500 bg-red-50',
      label: 'Defaulters',
      value: overview.defaulters ?? '—',
    },
    {
      icon: AlertCircle, iconCls: 'text-blue-600 bg-blue-50',
      label: 'Avg Collection',
      value: overview.avg_collection_pct != null ? `${overview.avg_collection_pct}%` : '—',
    },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Maintenance collections and outstanding dues.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => setShowGenerate(true)}
            className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> Generate
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI.map(({ icon: Icon, iconCls, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card px-5 py-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconCls}`}>
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">

        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search payments overview..."
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {/* Month picker */}
          <input
            type="month"
            value={month}
            onChange={e => { setMonth(e.target.value); setPage(1) }}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilter(p => !p)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors
              ${showFilter ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-input bg-background hover:bg-muted'}`}
          >
            <Filter className="h-4 w-4" /> Filter
            {statusFilter && <span className="h-2 w-2 rounded-full bg-teal-500" />}
          </button>
        </div>

        {/* Filter row */}
        {showFilter && (
          <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-border bg-muted/20">
            {[
              { value: '',        label: 'All Statuses' },
              { value: 'paid',    label: 'Approved (Paid)' },
              { value: 'pending', label: 'Pending' },
              { value: 'overdue', label: 'Rejected (Overdue)' },
            ].map(({ value, label }) => (
              <button key={value} onClick={() => { setStatus(value); setPage(1) }}
                className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors
                  ${statusFilter === value ? 'bg-teal-500 text-white border-teal-500' : 'border-input bg-background hover:bg-muted'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground font-medium">
                <th className="px-4 py-3 text-left">FLAT</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">RESIDENT</th>
                <th className="px-4 py-3 text-left">AMOUNT</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">DUE DATE</th>
                <th className="px-4 py-3 text-left">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-3.5"><div className="h-3 w-14 rounded bg-muted animate-pulse" /></td>
                      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="h-3 w-28 rounded bg-muted animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-3 w-20 rounded bg-muted animate-pulse" /></td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3 w-16 rounded bg-muted animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-full bg-muted animate-pulse" /></td>
                    </tr>
                  ))
                : pageSlice.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <Wallet className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">
                          {allDues.length === 0
                            ? 'No dues generated for this month'
                            : 'No results match your filters'}
                        </p>
                        {allDues.length === 0 && (
                          <button onClick={() => setShowGenerate(true)}
                            className="mt-3 btn-teal rounded-xl px-4 py-2 text-xs font-semibold">
                            Generate Dues
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                  : pageSlice.map((d, i) => (
                    <tr key={d.due_id ?? i}
                      onClick={() => setSelectedDue(d)}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group">

                      {/* FLAT */}
                      <td className="px-4 py-3.5">
                        <p className="font-mono text-sm font-bold text-foreground">{d.flat_number || '—'}</p>
                        {d.building && <p className="text-xs text-muted-foreground mt-0.5">{d.building}</p>}
                      </td>

                      {/* RESIDENT */}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <p className="text-sm text-foreground">{d.resident || <span className="text-muted-foreground italic">No resident</span>}</p>
                      </td>

                      {/* AMOUNT */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-foreground">{inr(d.amount)}</p>
                      </td>

                      {/* DUE DATE */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-foreground">{fmtDue(d.due_date)}</p>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={d.status} display={d.status_display} />
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Showing <strong>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</strong> of <strong>{total}</strong>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`rounded-lg min-w-[32px] h-8 text-xs font-medium transition-colors
                    ${page === n ? 'bg-teal-500 text-white' : 'border border-border hover:bg-muted'}`}>
                  {n}
                </button>
              ))}
              {pages > 5 && <span className="text-xs px-1 text-muted-foreground">…</span>}
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
                className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} />}
      {selectedDue  && <UpdateStatusModal due={selectedDue} onClose={() => setSelectedDue(null)} />}
    </div>
  )
}

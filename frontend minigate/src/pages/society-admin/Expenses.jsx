import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download, Plus, Search, X, Filter, Receipt, ChevronLeft, ChevronRight,
  Eye, EyeOff, Trash2, Paperclip, ExternalLink, FileSpreadsheet,
  Building2, CreditCard, Hash, User, StickyNote, CalendarDays, AlertCircle,
  CheckCircle2, Edit2, MoreVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
function inr(amount) {
  if (amount == null) return '—'
  const n = Number(amount)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function cap(s = '') { return s.charAt(0).toUpperCase() + s.slice(1) }

const CATEGORIES = [
  { value: 'security',       label: 'Security Salary'  },
  { value: 'housekeeping',   label: 'Housekeeping'     },
  { value: 'lift',           label: 'Lift Maintenance' },
  { value: 'water',          label: 'Water Tanker'     },
  { value: 'electricity',    label: 'Electricity'      },
  { value: 'gardening',      label: 'Gardening'        },
  { value: 'repairs',        label: 'Repairs'          },
  { value: 'insurance',      label: 'Insurance'        },
  { value: 'administrative', label: 'Administrative'   },
  { value: 'other',          label: 'Other'            },
]
const PAYMENT_MODES = [
  { value: 'upi',           label: 'UPI'           },
  { value: 'cash',          label: 'Cash'          },
  { value: 'cheque',        label: 'Cheque'        },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online',        label: 'Online'        },
]

// ── Client-side Excel (CSV) export ────────────────────────────────────────────
function exportToExcel(expenses) {
  const headers = ['Title', 'Category', 'Amount', 'Vendor', 'Payment Mode', 'Invoice No.', 'Building/Area', 'Date', 'Status', 'Notes']
  const rows = expenses.map(e => [
    e.title,
    e.category_display || e.category,
    Number(e.amount),
    e.vendor_name || '',
    e.payment_mode_display || e.payment_mode || '',
    e.invoice_number || '',
    e.building_area || '',
    e.expense_date || '',
    e.is_published ? 'Published' : 'Draft',
    e.notes || '',
  ])
  const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })   // BOM for Excel
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `expenses_${new Date().toISOString().slice(0,10)}.csv` })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('Exported as CSV — open with Excel')
}

// ── Proof file link ───────────────────────────────────────────────────────────
function ProofLink({ url, fileUrl }) {
  const link = fileUrl || url
  if (!link) return <span className="text-xs text-muted-foreground">—</span>
  const name = link.split('/').pop()
  return (
    <a href={link} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline font-medium max-w-[160px] truncate">
      <Paperclip className="h-3 w-3 shrink-0" />{name}
      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
    </a>
  )
}

// ── Add / Edit Expense Modal ──────────────────────────────────────────────────
const EMPTY_FORM = {
  title: '', category: 'security', amount: '', vendor_name: '',
  payment_mode: 'upi', invoice_number: '', building_area: '',
  expense_date: new Date().toISOString().split('T')[0],
  notes: '', is_published: false,
  proof_url: '',
}

function ExpenseModal({ expense, onClose }) {
  const qc     = useQueryClient()
  const isEdit = !!expense
  const fileRef = useRef(null)

  const [form, setForm]   = useState(isEdit ? {
    title:          expense.title          || '',
    category:       expense.category       || 'security',
    amount:         String(expense.amount  || ''),
    vendor_name:    expense.vendor_name    || '',
    payment_mode:   expense.payment_mode   || 'upi',
    invoice_number: expense.invoice_number || '',
    building_area:  expense.building_area  || '',
    expense_date:   expense.expense_date   || new Date().toISOString().split('T')[0],
    notes:          expense.notes          || '',
    is_published:   expense.is_published   ?? false,
    proof_url:      expense.proof_url      || '',
  } : { ...EMPTY_FORM })
  const [file, setFile]     = useState(null)   // File object for upload
  const [errors, setErrors] = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Load buildings for the Building/Area dropdown
  const { data: buildingsData, isLoading: loadingBuildings } = useQuery({
    queryKey: ['expense-buildings'],
    queryFn:  () => societyService.getBuildings().then(r => r.data?.results ?? r.data ?? []),
    staleTime: 300_000,
  })
  const buildings = buildingsData ?? []

  const mut = useMutation({
    mutationFn: (formData) => isEdit
      ? societyService.updateExpense(expense.id, formData)
      : societyService.createExpense(formData),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Expense updated' : 'Expense recorded successfully')
      qc.invalidateQueries({ queryKey: ['society-expenses'] })
      qc.invalidateQueries({ queryKey: ['fund-dashboard'] })
      onClose()
    },
    onError: (err) => {
      const d = err.response?.data
      if (d && typeof d === 'object' && !d.detail) {
        const fe = {}
        Object.entries(d).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? v[0] : String(v) })
        setErrors(fe)
      }
      toast.error(err.response?.data?.detail || getErrorMessage(err))
    },
  })

  function validate() {
    const e = {}
    if (!form.title.trim())       e.title       = 'Required'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount'
    if (!form.expense_date)       e.expense_date = 'Required'
    return e
  }

  function submit(ev) {
    ev.preventDefault()
    const er = validate(); setErrors(er)
    if (Object.keys(er).length) return

    // Build FormData (supports file upload)
    const fd = new FormData()
    fd.append('title',          form.title.trim())
    fd.append('category',       form.category)
    fd.append('amount',         form.amount)
    fd.append('vendor_name',    form.vendor_name.trim())
    fd.append('payment_mode',   form.payment_mode)
    fd.append('invoice_number', form.invoice_number.trim())
    fd.append('building_area',  form.building_area.trim())
    fd.append('expense_date',   form.expense_date)
    fd.append('notes',          form.notes.trim())
    fd.append('is_published',   form.is_published ? 'true' : 'false')
    if (form.proof_url.trim()) fd.append('proof_url', form.proof_url.trim())
    if (file)                  fd.append('proof_file', file)

    mut.mutate(fd)
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg',
                     'application/vnd.ms-excel',
                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!allowed.includes(f.type)) {
      toast.error('Only PDF, image (JPG/PNG) or Excel files are allowed')
      return
    }
    if (f.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return }
    setFile(f)
  }

  const ic  = (hasErr) =>
    `w-full rounded-xl border ${hasErr ? 'border-red-400' : 'border-input'} bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30`
  const lc  = 'text-xs font-medium text-muted-foreground block mb-1.5'
  const Err = ({ k }) => errors[k] ? <p className="text-xs text-red-500 mt-1">{errors[k]}</p> : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-background border border-border shadow-2xl max-h-[94vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h3 className="font-bold text-foreground text-base">
              {isEdit ? 'Edit Expense' : 'Add New Expense'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Update expense details and proof documents.' : 'Record a new society maintenance expense.'}
            </p>
          </div>
          <button onClick={onClose}
            className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">

          {/* ── SECTION 1: Basic Info ── */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</p>
            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className={lc}>Expense Title *</label>
                <input value={form.title} onChange={e => f('title', e.target.value)}
                  placeholder="Security Staff Salary — May 2026"
                  className={ic(errors.title)} />
                <Err k="title" />
              </div>

              {/* Category + Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Category *</label>
                  <select value={form.category} onChange={e => f('category', e.target.value)} className={ic(false)}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lc}>Amount (₹) *</label>
                  <input type="number" min="1" step="0.01" value={form.amount}
                    onChange={e => f('amount', e.target.value)}
                    placeholder="85000" className={ic(errors.amount)} />
                  <Err k="amount" />
                </div>
              </div>

              {/* Expense Date */}
              <div>
                <label className={lc}>
                  <CalendarDays className="inline h-3 w-3 mr-1" />Expense Date *
                </label>
                <input type="date" value={form.expense_date}
                  onChange={e => f('expense_date', e.target.value)} className={ic(errors.expense_date)} />
                <Err k="expense_date" />
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── SECTION 2: Vendor & Payment ── */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Vendor & Payment</p>
            <div className="space-y-3">
              {/* Vendor Name */}
              <div>
                <label className={lc}>
                  <User className="inline h-3 w-3 mr-1" />Vendor / Contractor Name
                </label>
                <input value={form.vendor_name} onChange={e => f('vendor_name', e.target.value)}
                  placeholder="RK Security Agency" className={ic(false)} />
              </div>

              {/* Payment Mode + Invoice Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>
                    <CreditCard className="inline h-3 w-3 mr-1" />Payment Mode
                  </label>
                  <select value={form.payment_mode} onChange={e => f('payment_mode', e.target.value)} className={ic(false)}>
                    {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lc}>
                    <Hash className="inline h-3 w-3 mr-1" />Invoice / Bill No.
                  </label>
                  <input value={form.invoice_number} onChange={e => f('invoice_number', e.target.value)}
                    placeholder="INV-2026-001" className={ic(false)} />
                </div>
              </div>

              {/* Building / Area — loaded from /buildings/ API */}
              <div>
                <label className={lc}>
                  <Building2 className="inline h-3 w-3 mr-1" />Building / Area
                </label>
                <select
                  value={form.building_area}
                  onChange={e => f('building_area', e.target.value)}
                  disabled={loadingBuildings}
                  className={ic(false)}
                >
                  <option value="">
                    {loadingBuildings ? 'Loading buildings…' : 'Select building or area'}
                  </option>
                  <option value="All Buildings">All Buildings</option>
                  <option value="Common Area">Common Area</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── SECTION 3: Proof Documents ── */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Proof Documents</p>
            <div className="space-y-3">

              {/* File upload */}
              <div>
                <label className={lc}>
                  <Paperclip className="inline h-3 w-3 mr-1" />Upload Proof (PDF / Image / Excel)
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-input hover:border-teal-400 bg-muted/20 hover:bg-teal-50/30 transition-colors cursor-pointer p-4 text-center"
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <Paperclip className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-medium text-teal-700 truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                        className="text-red-400 hover:text-red-600 ml-1">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Paperclip className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload <span className="text-teal-600 font-medium">PDF, JPG, PNG, or Excel</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Max 10 MB</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={handleFileChange} />
              </div>

              {/* Existing proof file (edit mode) */}
              {isEdit && (expense.proof_file_url || expense.proof_url) && !file && (
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-teal-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-teal-700 font-medium">Current proof file</p>
                    <ProofLink url={expense.proof_url} fileUrl={expense.proof_file_url} />
                  </div>
                </div>
              )}

              {/* Proof URL (optional) */}
              <div>
                <label className={lc}>Or paste a URL (Google Drive, Dropbox…)</label>
                <input value={form.proof_url} onChange={e => f('proof_url', e.target.value)}
                  placeholder="https://drive.google.com/file/..." className={ic(false)} />
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── SECTION 4: Notes & Visibility ── */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Notes & Visibility</p>
            <div className="space-y-3">
              <div>
                <label className={lc}>
                  <StickyNote className="inline h-3 w-3 mr-1" />Internal Notes
                </label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
                  placeholder="Any additional context for this expense…"
                  rows={2} className={ic(false)} />
              </div>

              {/* Publish toggle */}
              <div
                onClick={() => f('is_published', !form.is_published)}
                className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors
                  ${form.is_published
                    ? 'border-teal-300 bg-teal-50'
                    : 'border-border bg-background hover:bg-muted/30'}`}
              >
                <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0
                  ${form.is_published ? 'bg-teal-500' : 'bg-muted-foreground/30'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all
                    ${form.is_published ? 'left-5' : 'left-1'}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${form.is_published ? 'text-teal-700' : 'text-foreground'}`}>
                    {form.is_published ? 'Published — visible to residents' : 'Draft — hidden from residents'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Published expenses appear in the Maintenance Transparency section
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mut.isPending}
              className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {mut.isPending ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add Expense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ expense, onClose }) {
  const qc  = useQueryClient()
  const mut = useMutation({
    mutationFn: () => societyService.deleteExpense(expense.id),
    onSuccess: () => {
      toast.success('Expense deleted')
      qc.invalidateQueries({ queryKey: ['society-expenses'] })
      qc.invalidateQueries({ queryKey: ['fund-dashboard'] })
      onClose()
    },
    onError: e => toast.error(getErrorMessage(e)),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Delete Expense</h3>
            <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
          </div>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border p-3 text-sm">
          <p className="font-medium text-foreground">{expense.title}</p>
          <p className="text-muted-foreground">{inr(expense.amount)} · {fmtDate(expense.expense_date)}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="flex-1 rounded-xl bg-red-500 text-white py-2.5 text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors">
            {mut.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Three-dot action menu ─────────────────────────────────────────────────────
function ActionMenu({ exp, onView, onEdit, onDelete, onTogglePublish, isPending }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const items = [
    {
      label: 'View / Edit',
      icon:  Edit2,
      cls:   'text-foreground',
      action: () => { setOpen(false); onEdit() },
    },
    {
      label: exp.is_published ? 'Unpublish' : 'Publish',
      icon:  exp.is_published ? EyeOff : Eye,
      cls:   exp.is_published ? 'text-amber-600' : 'text-green-600',
      action: () => { setOpen(false); onTogglePublish() },
    },
    {
      label: 'Delete',
      icon:  Trash2,
      cls:   'text-red-600',
      action: () => { setOpen(false); onDelete() },
    },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-40 rounded-xl border border-border bg-background shadow-lg py-1 overflow-hidden">
          {items.map(({ label, icon: Icon, cls, action }) => (
            <button
              key={label}
              onClick={action}
              disabled={isPending && label !== 'View / Edit' && label !== 'Delete'}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50 ${cls}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Category badge colours ────────────────────────────────────────────────────
const CAT_CLR = {
  security:       'bg-blue-50   text-blue-700   border-blue-200',
  housekeeping:   'bg-purple-50 text-purple-700 border-purple-200',
  lift:           'bg-orange-50 text-orange-700 border-orange-200',
  water:          'bg-cyan-50   text-cyan-700   border-cyan-200',
  electricity:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  gardening:      'bg-green-50  text-green-700  border-green-200',
  repairs:        'bg-red-50    text-red-700    border-red-200',
  insurance:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  administrative: 'bg-gray-100  text-gray-600   border-gray-200',
  other:          'bg-muted     text-muted-foreground border-border',
}

function CategoryBadge({ category, display }) {
  const cls = CAT_CLR[category] ?? CAT_CLR.other
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {display || cap(category)}
    </span>
  )
}

// ── Payment mode pill ─────────────────────────────────────────────────────────
function ModePill({ mode, display }) {
  if (!mode) return null
  return (
    <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
      {display || mode}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Bone({ className = '' }) {
  return <div className={`rounded bg-muted animate-pulse ${className}`} />
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

export default function SocietyExpenses() {
  const qc = useQueryClient()
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [debSearch, setDeb]     = useState('')
  const [catFilter, setCat]     = useState('')
  const [pubFilter, setPub]     = useState('')
  const [showFilter, setFilter] = useState(false)
  const [modal, setModal]       = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setDeb(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  // ── Fetch all expenses (for KPI cards use full count) ─────────────────────
  const { data: raw, isLoading } = useQuery({
    queryKey: ['society-expenses', page, debSearch, catFilter, pubFilter],
    queryFn:  () => societyService.getExpenses({
      page, page_size: PAGE_SIZE, ordering: '-expense_date',
      ...(debSearch  && { search:       debSearch }),
      ...(catFilter  && { category:     catFilter }),
      ...(pubFilter !== '' && { is_published: pubFilter }),
    }).then(r => r.data),
    staleTime: 30_000,
  })

  // Fetch summary stats (unfiltered, for KPI cards)
  const { data: summaryRaw } = useQuery({
    queryKey: ['expense-summary'],
    queryFn:  () => societyService.getExpenseSummary().then(r => r.data?.data ?? r.data ?? {}),
    staleTime: 60_000,
  })
  const summary = summaryRaw ?? {}

  const expenses = raw?.results ?? []
  const total    = raw?.count   ?? 0
  const pages    = Math.ceil(total / PAGE_SIZE)

  // Compute KPI from current page + summary
  const totalAmount   = summary.total_amount   ?? expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const publishedCount= summary.published_count ?? expenses.filter(e => e.is_published).length
  const draftCount    = summary.draft_count     ?? expenses.filter(e => !e.is_published).length

  // Publish / Unpublish
  const publishMut = useMutation({
    mutationFn: ({ id, publish }) => publish
      ? societyService.publishExpense(id)
      : societyService.unpublishExpense(id),
    onSuccess: (_, { publish }) => {
      toast.success(publish ? 'Published — residents can now see this expense' : 'Unpublished — hidden from residents')
      qc.invalidateQueries({ queryKey: ['society-expenses'] })
      qc.invalidateQueries({ queryKey: ['expense-summary'] })
      qc.invalidateQueries({ queryKey: ['fund-dashboard'] })
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const hasFilters = !!(catFilter || pubFilter !== '' || search)

  return (
    <div className="p-6 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record, manage and publish society expenses with proof documents.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => exportToExcel(expenses)}
            disabled={expenses.length === 0}
            className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 text-green-700 px-4 py-2 text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
          <button
            onClick={() => setModal({ type: 'add' })}
            className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* ── KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total Expenses',
            value: isLoading ? null : total,
            sub:   'All recorded',
            icon:  Receipt,
            icCls: 'text-teal-600 bg-teal-50',
          },
          {
            label: 'Total Amount',
            value: isLoading ? null : inr(totalAmount),
            sub:   'Combined spend',
            icon:  Download,
            icCls: 'text-blue-600 bg-blue-50',
          },
          {
            label: 'Published',
            value: isLoading ? null : publishedCount,
            sub:   'Visible to residents',
            icon:  CheckCircle2,
            icCls: 'text-green-600 bg-green-50',
          },
          {
            label: 'Draft',
            value: isLoading ? null : draftCount,
            sub:   'Hidden from residents',
            icon:  AlertCircle,
            icCls: 'text-amber-600 bg-amber-50',
          },
        ].map(({ label, value, sub, icon: Icon, icCls }) => (
          <div key={label} className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${icCls}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              {value == null
                ? <Bone className="h-6 w-20 mb-1" />
                : <p className="text-xl font-extrabold text-foreground tabular-nums truncate">{value}</p>
              }
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">

        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search expenses..."
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <button onClick={() => setFilter(p => !p)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors
              ${showFilter ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-input bg-background hover:bg-muted'}`}>
            <Filter className="h-4 w-4" /> Filter
            {hasFilters && <span className="h-2 w-2 rounded-full bg-teal-500" />}
          </button>
        </div>

        {/* Filter row */}
        {showFilter && (
          <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-border bg-muted/20">
            <select value={catFilter} onChange={e => { setCat(e.target.value); setPage(1) }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none min-w-[160px]">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={pubFilter} onChange={e => { setPub(e.target.value); setPage(1) }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none">
              <option value="">All Status</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setCat(''); setPub(''); setPage(1) }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground font-semibold tracking-wide">
                <th className="px-4 py-3.5 text-left">EXPENSE</th>
                <th className="px-4 py-3.5 text-left hidden sm:table-cell">VENDOR</th>
                <th className="px-4 py-3.5 text-left">AMOUNT</th>
                <th className="px-4 py-3.5 text-left hidden md:table-cell">DATE</th>
                <th className="px-4 py-3.5 text-left hidden lg:table-cell">PROOF</th>
                <th className="px-4 py-3.5 text-left">STATUS</th>
                <th className="px-4 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-4">
                        <Bone className="h-3 w-44 mb-2" />
                        <Bone className="h-4 w-20 rounded-full" />
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <Bone className="h-3 w-28 mb-1.5" />
                        <Bone className="h-3 w-10 rounded-md" />
                      </td>
                      <td className="px-4 py-4"><Bone className="h-4 w-20" /></td>
                      <td className="px-4 py-4 hidden md:table-cell"><Bone className="h-3 w-20" /></td>
                      <td className="px-4 py-4 hidden lg:table-cell"><Bone className="h-3 w-32" /></td>
                      <td className="px-4 py-4"><Bone className="h-6 w-20 rounded-full" /></td>
                      <td className="px-4 py-4"><Bone className="h-7 w-24 rounded-lg ml-auto" /></td>
                    </tr>
                  ))
                : expenses.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                          <Receipt className="h-7 w-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">No expenses found</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          {hasFilters ? 'No results match your current filters.' : 'Start recording society expenses.'}
                        </p>
                        {hasFilters
                          ? <button onClick={() => { setSearch(''); setCat(''); setPub(''); setPage(1) }}
                              className="text-xs text-teal-600 hover:underline">Clear all filters</button>
                          : <button onClick={() => setModal({ type: 'add' })}
                              className="btn-teal rounded-xl px-5 py-2 text-sm font-semibold inline-flex items-center gap-2">
                              <Plus className="h-4 w-4" /> Add first expense
                            </button>
                        }
                      </td>
                    </tr>
                  )
                  : expenses.map(exp => (
                    <tr key={exp.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group">

                      {/* EXPENSE — title + category badge */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-foreground leading-tight text-sm">
                          {exp.title}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <CategoryBadge category={exp.category} display={exp.category_display} />
                          {exp.invoice_number && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              #{exp.invoice_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* VENDOR — name + payment mode pill */}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        {exp.vendor_name
                          ? <>
                              <p className="text-sm font-medium text-foreground">{exp.vendor_name}</p>
                              <div className="mt-1">
                                <ModePill mode={exp.payment_mode} display={exp.payment_mode_display} />
                              </div>
                            </>
                          : <div className="flex flex-col gap-1">
                              <span className="text-muted-foreground text-sm">—</span>
                              {exp.payment_mode && (
                                <ModePill mode={exp.payment_mode} display={exp.payment_mode_display} />
                              )}
                            </div>
                        }
                      </td>

                      {/* AMOUNT */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-foreground tabular-nums">{inr(exp.amount)}</p>
                        {exp.building_area && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">
                            {exp.building_area}
                          </p>
                        )}
                      </td>

                      {/* DATE */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-foreground">{fmtDate(exp.expense_date)}</p>
                      </td>

                      {/* PROOF */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <ProofLink url={exp.proof_url} fileUrl={exp.proof_file_url} />
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold
                          ${exp.is_published
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {exp.is_published
                            ? <><CheckCircle2 className="h-3 w-3" />Published</>
                            : <><AlertCircle className="h-3 w-3" />Draft</>
                          }
                        </span>
                      </td>

                      {/* ACTIONS — single ⋮ menu */}
                      <td className="px-4 py-3.5 text-right">
                        <ActionMenu
                          exp={exp}
                          isPending={publishMut.isPending}
                          onEdit={()  => setModal({ type: 'edit',   expense: exp })}
                          onDelete={() => setModal({ type: 'delete', expense: exp })}
                          onTogglePublish={() =>
                            publishMut.mutate({ id: exp.id, publish: !exp.is_published })
                          }
                        />
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
      {modal?.type === 'add'    && <ExpenseModal onClose={() => setModal(null)} />}
      {modal?.type === 'edit'   && <ExpenseModal expense={modal.expense} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <DeleteModal  expense={modal.expense} onClose={() => setModal(null)} />}
    </div>
  )
}

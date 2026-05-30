import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Download, Search, SlidersHorizontal,
  MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { formatDate, getErrorMessage } from '../../utils/formatters.js'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'water_tanker', label: 'Water Tanker'    },
  { value: 'landscaping',  label: 'Landscaping'     },
  { value: 'plumbing',     label: 'Plumbing'        },
  { value: 'electrical',   label: 'Electrical'      },
  { value: 'security',     label: 'Security Agency' },
  { value: 'cleaning',     label: 'Cleaning'        },
  { value: 'lift',         label: 'Lift Maintenance'},
  { value: 'pest',         label: 'Pest Control'    },
  { value: 'other',        label: 'Other'           },
]

const STATUSES = [
  { value: 'active',          label: 'Active'          },
  { value: 'pending_renewal', label: 'Pending Renewal' },
  { value: 'inactive',        label: 'Inactive'        },
]

const PAGE_SIZE = 10

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['bg-teal-500','bg-violet-500','bg-orange-500','bg-pink-500','bg-blue-500','bg-emerald-500','bg-rose-400','bg-amber-500']
function avatarColor(str = '') { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return AVATAR_COLORS[h % AVATAR_COLORS.length] }
function initials(name = '') { return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?' }

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'active')
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
  if (status === 'pending_renewal')
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Pending Renewal</span>
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 border border-slate-200"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Inactive</span>
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ value, label, color = 'text-foreground' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className={`text-3xl font-extrabold ${color}`}>{value ?? '—'}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

// ── Vendor Modal (Add / Edit) ─────────────────────────────────────────────────
function VendorModal({ vendor, onClose, onSaved }) {
  const isEdit = !!vendor
  const [form, setForm] = useState({
    name:           vendor?.name           ?? '',
    category:       vendor?.category       ?? 'other',
    contact_name:   vendor?.contact_name   ?? '',
    contact_phone:  vendor?.contact_phone  ?? '',
    contact_email:  vendor?.contact_email  ?? '',
    status:         vendor?.status         ?? 'active',
    contract_start: vendor?.contract_start ?? '',
    contract_end:   vendor?.contract_end   ?? '',
    monthly_cost:   vendor?.monthly_cost   ?? '',
    notes:          vendor?.notes          ?? '',
  })
  const [errors, setErrors] = useState({})

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? societyService.updateVendor(vendor.id, data) : societyService.createVendor(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Vendor updated' : 'Vendor added')
      onSaved()
      onClose()
    },
    onError: (err) => {
      const d = err?.response?.data
      if (d && typeof d === 'object') {
        const e = {}
        Object.entries(d).forEach(([k, v]) => { e[k] = Array.isArray(v) ? v[0] : String(v) })
        setErrors(e)
        toast.error(Object.values(e)[0] ?? 'Failed to save')
      } else {
        toast.error(getErrorMessage(err))
      }
    },
  })

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.name.trim())          next.name          = 'Vendor name is required'
    if (!form.category)             next.category      = 'Category is required'
    if (!form.contact_phone.trim()) next.contact_phone = 'Contact phone is required'
    setErrors(next)
    if (Object.keys(next).length) return
    const payload = { ...form }
    if (!payload.monthly_cost) delete payload.monthly_cost
    if (!payload.contract_start) delete payload.contract_start
    if (!payload.contract_end) delete payload.contract_end
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background z-10">
          <div>
            <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Vendor' : 'Add Vendor'}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{isEdit ? 'Update vendor details.' : 'Add a new vendor to your society.'}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Vendor Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="AquaFlow Water Supply"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Contact Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contact Name</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Rajesh Nair"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Phone *</label>
              <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="9876543210"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
              {errors.contact_phone && <p className="text-xs text-red-500 mt-1">{errors.contact_phone}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email (optional)</label>
            <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="vendor@example.com"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
          </div>

          {/* Contract Start + End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contract Start</label>
              <input type="date" value={form.contract_start} onChange={e => set('contract_start', e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contract End</label>
              <input type="date" value={form.contract_end} onChange={e => set('contract_end', e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            </div>
          </div>

          {/* Monthly Cost */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Monthly Cost (₹)</label>
            <input type="number" value={form.monthly_cost} onChange={e => set('monthly_cost', e.target.value)} placeholder="8500"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Any additional notes..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none" />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2 text-sm font-semibold disabled:opacity-60 transition-colors">
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SocietyVendors() {
  const qc      = useQueryClient()
  const society = useSelector(selectSociety)

  const [modal,      setModal]      = useState(null)   // null | 'add' | vendor obj
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('')
  const [statFilter, setStatFilter] = useState('')
  const [page,       setPage]       = useState(1)

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const { data: kpi } = useQuery({
    queryKey: ['vendors-kpi', society?.id],
    queryFn:  () => societyService.getVendorKpi().then(r => r.data?.data ?? r.data),
    staleTime: 30_000,
  })

  // ── Vendors list ──────────────────────────────────────────────────────────
  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ['society-vendors', society?.id, search, catFilter, statFilter, page],
    queryFn:  () => societyService.getVendors({
      search:   search     || undefined,
      category: catFilter  || undefined,
      status:   statFilter || undefined,
      page,
      page_size: PAGE_SIZE,
    }).then(r => r.data),
    staleTime: 20_000,
  })
  const vendors    = vendorsData?.results ?? []
  const total      = vendorsData?.count   ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  const fromNum    = (page - 1) * PAGE_SIZE + 1
  const toNum      = Math.min(page * PAGE_SIZE, total)

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id) => societyService.deleteVendor(id),
    onSuccess: () => { toast.success('Vendor deleted'); invalidate() },
    onError:   (err) => toast.error(getErrorMessage(err)),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['society-vendors'] })
    qc.invalidateQueries({ queryKey: ['vendors-kpi'] })
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {kpi?.total ?? total} vendor{(kpi?.total ?? total) !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.info('Export started')}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => setModal('add')}
            className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add Vendor
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard value={kpi?.total           ?? '—'} label="Total Vendors"    color="text-foreground"  />
        <StatCard value={kpi?.active          ?? '—'} label="Active"           color="text-teal-600"    />
        <StatCard value={kpi?.pending_renewal ?? '—'} label="Pending Renewal"  color="text-amber-600"   />
        <StatCard value={kpi?.inactive        ?? '—'} label="Inactive"         color="text-slate-500"   />
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            placeholder="Search by name, contact or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none w-full sm:w-44">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={statFilter} onChange={e => { setStatFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none w-full sm:w-40">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors shrink-0">
          <SlidersHorizontal className="h-4 w-4" /> More filters
        </button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <th className="px-5 py-3 text-left font-medium">Vendor</th>
                <th className="px-5 py-3 text-left font-medium">Category</th>
                <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Phone</th>
                <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">Contract End</th>
                <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">Monthly Cost</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">Loading vendors…</td></tr>
              )}
              {!isLoading && vendors.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-muted-foreground">
                    No vendors found.{' '}
                    <button onClick={() => setModal('add')} className="text-teal-600 underline font-medium">Add one</button>
                  </td>
                </tr>
              )}
              {vendors.map(v => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  {/* Vendor name + contact */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(v.name)}`}>
                        {initials(v.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{v.name}</p>
                        {v.contact_name && <p className="text-xs text-muted-foreground">{v.contact_name}</p>}
                        {v.contact_email && <p className="text-xs text-muted-foreground">{v.contact_email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-foreground">{v.category_display || v.category}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{v.contact_phone || '—'}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground">
                    {v.contract_end ? formatDate(v.contract_end) : '—'}
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground">
                    {v.monthly_cost ? `₹${Number(v.monthly_cost).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={v.status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setModal(v)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => { if (window.confirm(`Delete "${v.name}"?`)) deleteMut.mutate(v.id) }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {total > 0 && (
          <div className="border-t border-border px-5 py-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing <strong className="text-foreground">{fromNum}–{toNum}</strong> of <strong className="text-foreground">{total}</strong> vendors</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`rounded-lg border px-2.5 py-1 transition-colors ${page === p ? 'bg-teal-600 text-white border-teal-600' : 'border-border hover:bg-muted'}`}>
                  {p}
                </button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {(modal === 'add' || (modal && modal?.id)) && (
        <VendorModal
          vendor={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}

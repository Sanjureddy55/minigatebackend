import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Download, Search, SlidersHorizontal, Pencil, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

// ── Only 3 roles allowed ──────────────────────────────────────────────────────
const ROLES = [
  { value: 'security-guard',    label: 'Security Guard'    },
  { value: 'maintenance-staff', label: 'Maintenance Staff' },
  { value: 'support-staff',     label: 'Support Staff'     },
]

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'active')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    )
  if (status === 'pending')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Pending
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-4xl font-extrabold text-foreground">{value ?? '—'}</p>
    </div>
  )
}

// ── Add Staff Modal ───────────────────────────────────────────────────────────
function AddStaffModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name:   '',
    mobile:      '',
    role_slug:   'security-guard',
    description: '',
  })
  const [errors, setErrors] = useState({})

  const set = (field, val) => {
    setForm((p) => ({ ...p, [field]: val }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const mutation = useMutation({
    mutationFn: (data) => societyService.createStaffAccount(data),
    onSuccess: (res) => {
      const d = res.data
      toast.success(
        `Account created! Login: mobile ${form.mobile}, OTP 123456`
      )
      onSaved()
      onClose()
    },
    onError: (err) => {
      const d = err?.response?.data
      if (d && typeof d === 'object') {
        const e = {}
        Object.entries(d).forEach(([k, v]) => { e[k] = Array.isArray(v) ? v[0] : String(v) })
        setErrors(e)
        toast.error(Object.values(e)[0] ?? 'Failed to create account')
      } else {
        toast.error(getErrorMessage(err))
      }
    },
  })

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.full_name.trim()) next.full_name = 'Full name is required'
    if (!form.mobile.trim())    next.mobile    = 'Mobile number is required'
    if (!form.role_slug)        next.role_slug = 'Role is required'
    setErrors(next)
    if (Object.keys(next).length) return
    mutation.mutate(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">

        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Add Staff Member</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Staff will log in with their mobile number and OTP 123456.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">

          {/* Full Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full Name *</label>
            <input
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="Ramesh Kumar"
              autoFocus
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
          </div>

          {/* Mobile */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Mobile Number *</label>
            <input
              value={form.mobile}
              onChange={(e) => set('mobile', e.target.value)}
              placeholder="9876543210"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
            <p className="text-xs text-muted-foreground mt-1">Used to log in with OTP 123456</p>
          </div>

          {/* Role */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Role *</label>
            <select
              value={form.role_slug}
              onChange={(e) => set('role_slug', e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role_slug && <p className="text-xs text-red-500 mt-1">{errors.role_slug}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Manages Gate 1"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          {/* Login info box */}
          <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-xs text-teal-800">
            <strong>Login credentials:</strong> Mobile number + OTP <strong>123456</strong>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2 text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {mutation.isPending ? 'Creating…' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Staff Modal ──────────────────────────────────────────────────────────
function EditStaffModal({ staff, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name:   staff?.full_name   ?? '',
    mobile:      staff?.mobile      ?? '',
    description: staff?.description ?? '',
  })
  const [errors, setErrors] = useState({})

  const set = (field, val) => {
    setForm((p) => ({ ...p, [field]: val }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const mutation = useMutation({
    mutationFn: (data) => societyService.updateStaffAccount(staff.id, data),
    onSuccess: () => {
      toast.success('Staff updated')
      onSaved()
      onClose()
    },
    onError: (err) => {
      const d = err?.response?.data
      if (d && typeof d === 'object') {
        const e = {}
        Object.entries(d).forEach(([k, v]) => { e[k] = Array.isArray(v) ? v[0] : String(v) })
        setErrors(e)
        toast.error(Object.values(e)[0] ?? 'Failed to update')
      } else {
        toast.error(getErrorMessage(err))
      }
    },
  })

  const submit = (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) { setErrors({ full_name: 'Required' }); return }
    mutation.mutate(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Edit Staff Member</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{staff?.role_name} · {staff?.mobile}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full Name *</label>
            <input
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Mobile</label>
            <input
              value={form.mobile}
              onChange={(e) => set('mobile', e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Manages Gate 1"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2 text-sm font-semibold disabled:opacity-60 transition-colors">
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SocietyStaff() {
  const qc      = useQueryClient()
  const society = useSelector(selectSociety)

  const [modal,      setModal]      = useState(null)
  const [editStaff,  setEditStaff]  = useState(null)
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page,       setPage]       = useState(1)
  const PAGE_SIZE = 20

  // ── KPI ───────────────────────────────────────────────────────────────────
  const { data: kpi } = useQuery({
    queryKey: ['staff-accounts-kpi', society?.id],
    queryFn:  () => societyService.getStaffKpi().then((r) => r.data?.data ?? r.data),
    staleTime: 30_000,
  })

  // ── List ──────────────────────────────────────────────────────────────────
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff-accounts', society?.id, search, roleFilter, page],
    queryFn:  () =>
      societyService.getStaffAccounts({
        search:    search     || undefined,
        role:      roleFilter !== 'all' ? roleFilter : undefined,
        page,
        page_size: PAGE_SIZE,
      }).then((r) => r.data),
    staleTime: 20_000,
  })
  // Only show the 3 allowed roles — filter out accountant, delivery-partner, guest-user etc.
  const ALLOWED_SLUGS = ['security-guard', 'maintenance-staff', 'support-staff']
  const allStaff   = staffData?.results ?? staffData?.data?.results ?? []
  const staff      = allStaff.filter(s => ALLOWED_SLUGS.includes(s.role_slug))
  const total      = staff.length
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  // ── Deactivate / Reactivate ───────────────────────────────────────────────
  const deactivateMut = useMutation({
    mutationFn: (id) => societyService.deactivateStaff(id),
    onSuccess: () => { toast.success('Staff deactivated'); invalidate() },
    onError:   (err) => toast.error(getErrorMessage(err)),
  })
  const reactivateMut = useMutation({
    mutationFn: (id) => societyService.reactivateStaff(id),
    onSuccess: () => { toast.success('Staff reactivated'); invalidate() },
    onError:   (err) => toast.error(getErrorMessage(err)),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['staff-accounts'] })
    qc.invalidateQueries({ queryKey: ['staff-accounts-kpi'] })
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff & Guard Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Roster of guards, housekeeping and on-site staff.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => setModal('add')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Staff
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Staff"       value={kpi?.total                          ?? '—'} />
          <StatCard label="Security Guards"   value={kpi?.by_role?.['security-guard']    ?? '—'} />
          <StatCard label="Maintenance Staff" value={kpi?.by_role?.['maintenance-staff'] ?? '—'} />
        </div>

        {/* ── Search + Filter ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              placeholder="Search staff & guard management..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none w-full sm:w-48"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors shrink-0">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>

        {/* ── Table ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Role</th>
                  <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Mobile</th>
                  <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">Description</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Loading staff…
                    </td>
                  </tr>
                )}
                {!isLoading && staff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground">
                      No staff found.{' '}
                      <button onClick={() => setModal('add')} className="text-teal-600 underline font-medium">
                        Add one
                      </button>
                    </td>
                  </tr>
                )}
                {staff.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-foreground">{s.full_name}</td>
                    <td className="px-5 py-3.5 text-foreground">{s.role_name || s.role_slug}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{s.mobile || '—'}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground truncate max-w-xs">
                      {s.description || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditStaff(s)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {s.status === 'active' ? (
                          <button
                            onClick={() => {
                              if (window.confirm(`Deactivate "${s.full_name}"?`))
                                deactivateMut.mutate(s.id)
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Deactivate"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivateMut.mutate(s.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            title="Reactivate"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="border-t border-border px-5 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</strong> of <strong className="text-foreground">{total}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-border px-2.5 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">‹</button>
                <span className="font-medium text-foreground">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-border px-2.5 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'add' && (
        <AddStaffModal onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {editStaff && (
        <EditStaffModal staff={editStaff} onClose={() => setEditStaff(null)} onSaved={invalidate} />
      )}
    </div>
  )
}

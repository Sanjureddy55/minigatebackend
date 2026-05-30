import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Download, Search, SlidersHorizontal,
  Pencil, UserCheck, UserX, Shield, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

// ── All 6 creatable staff role slugs (no super-admin / society-admin / resident) ──
const ALL_ROLES = [
  { slug: 'security-guard',    label: 'Security Guard',    color: 'bg-sky-500',     light: 'bg-sky-50 text-sky-700 border-sky-200' },
  { slug: 'accountant',        label: 'Accountant',        color: 'bg-violet-500',  light: 'bg-violet-50 text-violet-700 border-violet-200' },
  { slug: 'maintenance-staff', label: 'Maintenance Staff', color: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700 border-amber-200' },
  { slug: 'support-staff',     label: 'Support Staff',     color: 'bg-teal-500',    light: 'bg-teal-50 text-teal-700 border-teal-200' },
  { slug: 'delivery-partner',  label: 'Delivery Partner',  color: 'bg-orange-500',  light: 'bg-orange-50 text-orange-700 border-orange-200' },
  { slug: 'guest-user',        label: 'Guest User',        color: 'bg-rose-500',    light: 'bg-rose-50 text-rose-700 border-rose-200' },
]

function roleMeta(slug) {
  return ALL_ROLES.find(r => r.slug === slug) ?? { label: slug, color: 'bg-slate-500', light: 'bg-slate-50 text-slate-600 border-slate-200' }
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'active')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
      </span>
    )
  if (status === 'pending')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Pending
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
    </span>
  )
}

// ── Role KPI Card ─────────────────────────────────────────────────────────────
function RoleCard({ slug, label, color, count, active, onClick, isSelected }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all w-full ${
        isSelected
          ? 'border-teal-500 bg-teal-50 shadow-sm ring-1 ring-teal-500/20'
          : 'border-border bg-card hover:border-teal-300 hover:bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-xs text-muted-foreground font-medium truncate">{label}</span>
      </div>
      <p className={`text-3xl font-extrabold tabular-nums ${isSelected ? 'text-teal-600' : 'text-foreground'}`}>
        {count ?? 0}
      </p>
      {active != null && (
        <p className="text-xs text-muted-foreground mt-1">{active} active</p>
      )}
    </button>
  )
}

// ── Add Staff Modal ───────────────────────────────────────────────────────────
function AddStaffModal({ onClose, onSaved, defaultRole }) {
  const [form, setForm] = useState({
    full_name:   '',
    email:       '',
    mobile:      '',
    role_slug:   defaultRole || 'security-guard',
    description: '',
  })
  const [errors, setErrors] = useState({})

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const mutation = useMutation({
    mutationFn: (data) => societyService.createStaffAccount(data),
    onSuccess: () => {
      toast.success(`Account created! Login: ${form.mobile} · OTP 123456`)
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
    const payload = { ...form }
    if (!payload.email.trim()) delete payload.email
    if (!payload.description.trim()) delete payload.description
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">

        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base">Add Staff Member</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Staff login: mobile number + OTP <strong>123456</strong>
            </p>
          </div>
          <button onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">

          {/* Full Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Full Name *
            </label>
            <input
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="e.g. Rahul Sharma"
              autoFocus
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-muted-foreground/50"
            />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Email Address <span className="normal-case text-muted-foreground/60">(optional)</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="user@society.io"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-muted-foreground/50"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Mobile */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Mobile *
            </label>
            <input
              value={form.mobile}
              onChange={e => set('mobile', e.target.value)}
              placeholder="9876543210"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-muted-foreground/50"
            />
            {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Role *
            </label>
            <select
              value={form.role_slug}
              onChange={e => set('role_slug', e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              {ALL_ROLES.map(r => (
                <option key={r.slug} value={r.slug}>{r.label}</option>
              ))}
            </select>
            {errors.role_slug && <p className="text-xs text-red-500 mt-1">{errors.role_slug}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Super Admin and Society Admin roles cannot be created here.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Description <span className="normal-case text-muted-foreground/60">(optional)</span>
            </label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Manages Gate 1"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Credentials info */}
          <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-xs text-teal-800">
            <strong>Login credentials:</strong> Mobile number + OTP <strong>123456</strong>
          </div>

          {errors.detail && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {errors.detail}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2.5 text-sm font-semibold disabled:opacity-60 transition-colors">
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
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const mutation = useMutation({
    mutationFn: (data) => societyService.updateStaffAccount(staff.id, data),
    onSuccess: () => {
      toast.success('Staff updated successfully')
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

  const meta = roleMeta(staff?.role_slug)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base">Edit Staff Member</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold mr-1 ${meta.light}`}>
                {meta.label}
              </span>
              {staff?.mobile}
            </p>
          </div>
          <button onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Full Name *</label>
            <input
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Mobile</label>
            <input
              value={form.mobile}
              onChange={e => set('mobile', e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Description</label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Manages Gate 1"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2.5 text-sm font-semibold disabled:opacity-60 transition-colors">
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RolesAccess() {
  const qc = useQueryClient()

  const [showAdd,    setShowAdd]    = useState(false)
  const [editStaff,  setEditStaff]  = useState(null)
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')   // 'all' | role slug
  const [page,       setPage]       = useState(1)
  const PAGE_SIZE = 20

  // ── KPI (role counts) ─────────────────────────────────────────────────────
  const { data: kpi } = useQuery({
    queryKey: ['staff-kpi'],
    queryFn:  () => societyService.getStaffKpi().then(r => r.data?.data ?? r.data),
    staleTime: 30_000,
  })

  // ── Staff list ────────────────────────────────────────────────────────────
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff-list', search, roleFilter, page],
    queryFn:  () =>
      societyService.getStaffAccounts({
        search:    search     || undefined,
        role:      roleFilter !== 'all' ? roleFilter : undefined,
        page,
        page_size: PAGE_SIZE,
      }).then(r => r.data),
    staleTime: 20_000,
  })

  const staff      = staffData?.results ?? []
  const totalCount = staffData?.count   ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1

  // ── Deactivate / Reactivate ───────────────────────────────────────────────
  const deactivateMut = useMutation({
    mutationFn: (id) => societyService.deactivateStaff(id),
    onSuccess: () => { toast.success('Staff deactivated'); invalidate() },
    onError:   err  => toast.error(getErrorMessage(err)),
  })
  const reactivateMut = useMutation({
    mutationFn: (id) => societyService.reactivateStaff(id),
    onSuccess: () => { toast.success('Staff reactivated'); invalidate() },
    onError:   err  => toast.error(getErrorMessage(err)),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['staff-list'] })
    qc.invalidateQueries({ queryKey: ['staff-kpi'] })
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (!staff.length) { toast.error('No staff to export'); return }
    const rows = [
      ['Name', 'Role', 'Mobile', 'Email', 'Status', 'Description'],
      ...staff.map(s => [
        s.full_name, s.role_name || s.role_slug, s.mobile || '',
        s.email || '', s.status, s.description || '',
      ]),
    ]
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = 'staff-roster.csv'
    a.click()
  }

  // ── Active role filter counts ─────────────────────────────────────────────
  const byRole  = kpi?.by_role ?? {}

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles &amp; Access</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage staff accounts and role assignments for your society.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> Add New
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6">

        {/* ── Role KPI Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {/* All Staff card */}
          <RoleCard
            slug="all"
            label="All Staff"
            color="bg-slate-500"
            count={kpi?.total ?? 0}
            active={kpi?.active}
            onClick={() => { setRoleFilter('all'); setPage(1) }}
            isSelected={roleFilter === 'all'}
          />
          {ALL_ROLES.map(r => (
            <RoleCard
              key={r.slug}
              slug={r.slug}
              label={r.label}
              color={r.color}
              count={byRole[r.slug] ?? 0}
              onClick={() => { setRoleFilter(r.slug); setPage(1) }}
              isSelected={roleFilter === r.slug}
            />
          ))}
        </div>

        {/* ── Search + Filter ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              placeholder="Search staff & guard management..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none w-full sm:w-44"
          >
            <option value="all">All Roles</option>
            {ALL_ROLES.map(r => (
              <option key={r.slug} value={r.slug}>{r.label}</option>
            ))}
          </select>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors shrink-0">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>

        {/* ── Active filter badge ── */}
        {roleFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtered by:</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleMeta(roleFilter).light}`}>
              {roleMeta(roleFilter).label}
              <button onClick={() => { setRoleFilter('all'); setPage(1) }} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        {/* ── Staff Table ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-5 py-3.5 text-left font-medium">Name</th>
                  <th className="px-5 py-3.5 text-left font-medium">Role</th>
                  <th className="px-5 py-3.5 text-left font-medium hidden md:table-cell">Mobile</th>
                  <th className="px-5 py-3.5 text-left font-medium hidden lg:table-cell">Description</th>
                  <th className="px-5 py-3.5 text-left font-medium">Status</th>
                  <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Loading staff accounts…
                    </td>
                  </tr>
                )}

                {!isLoading && staff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Shield className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">No staff found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {search || roleFilter !== 'all'
                          ? 'Try adjusting your search or filter.'
                          : <>Get started by <button onClick={() => setShowAdd(true)} className="text-teal-600 underline font-medium">adding a staff member</button>.</>
                        }
                      </p>
                    </td>
                  </tr>
                )}

                {staff.map(s => {
                  const meta = roleMeta(s.role_slug)
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${meta.color}`}>
                            {(s.full_name || 'S').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-foreground">{s.full_name}</span>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.light}`}>
                          {s.role_name || meta.label}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground font-mono text-xs">
                        {s.mobile || '—'}
                      </td>

                      {/* Description */}
                      <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground text-xs max-w-xs truncate">
                        {s.description || '—'}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={s.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditStaff(s)}
                            title="Edit"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {s.status === 'active' ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`Deactivate "${s.full_name}"?`))
                                  deactivateMut.mutate(s.id)
                              }}
                              title="Deactivate"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateMut.mutate(s.id)}
                              title="Reactivate"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="border-t border-border px-5 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing{' '}
                <strong className="text-foreground">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)}</strong>
                {' '}of{' '}
                <strong className="text-foreground">{totalCount}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded-lg border border-border px-2.5 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                <span className="font-semibold text-foreground">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-lg border border-border px-2.5 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <AddStaffModal
          defaultRole={roleFilter !== 'all' ? roleFilter : 'security-guard'}
          onClose={() => setShowAdd(false)}
          onSaved={invalidate}
        />
      )}
      {editStaff && (
        <EditStaffModal
          staff={editStaff}
          onClose={() => setEditStaff(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}

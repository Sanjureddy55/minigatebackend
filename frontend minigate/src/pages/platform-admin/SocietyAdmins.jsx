import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, UserPlus, Phone, Mail, Search, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { platformService } from '../../services/platform.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { getErrorMessage } from '../../utils/formatters.js'

const AVATAR_COLORS = [
  'bg-teal-500', 'bg-violet-500', 'bg-orange-500',
  'bg-pink-500', 'bg-blue-500', 'bg-emerald-500',
]
const PLAN_COLORS = {
  enterprise: 'bg-violet-100 text-violet-700',
  pro:        'bg-blue-100 text-blue-700',
  'pro-plan': 'bg-blue-100 text-blue-700',
  free:       'bg-gray-100 text-gray-600',
  trial:      'bg-amber-100 text-amber-700',
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}
function avatarColor(id) {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]
}

// ── Invite Modal ────────────────────────────────────────────────────────────
function InviteModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    full_name: '', mobile: '', email: '', society_id: '', password: '',
  })
  const [errors, setErrors] = useState({})

  const { data: societiesData } = useQuery({
    queryKey: ['societies-list'],
    queryFn: () => platformService.getSocieties({ page_size: 200 }).then((r) => r.data?.results ?? []),
    staleTime: 300_000,
  })
  const societies = societiesData ?? []

  const mut = useMutation({
    mutationFn: (data) => platformService.inviteSocietyAdmin(data),
    onSuccess: (res) => {
      const pwd = res?.data?.data?.generated_password
      toast.success(pwd ? `Admin invited. Auto-password: ${pwd}` : 'Admin invited successfully')
      qc.invalidateQueries({ queryKey: ['society-admins'] })
      qc.invalidateQueries({ queryKey: ['society-admin-stats'] })
      onClose()
    },
    onError: (err) => {
      const data = err.response?.data
      if (data && typeof data === 'object' && !data.detail) {
        const fieldErrors = {}
        Object.entries(data).forEach(([k, v]) => {
          fieldErrors[k] = Array.isArray(v) ? v[0] : String(v)
        })
        setErrors(fieldErrors)
        toast.error('Please fix the errors')
      } else {
        toast.error(getErrorMessage(err))
      }
    },
  })

  function validate() {
    const next = {}
    if (!form.full_name.trim()) next.full_name = 'Full name is required'
    if (!form.mobile.trim()) next.mobile = 'Mobile number is required'
    if (!form.society_id) next.society_id = 'Society is required'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Invalid email'
    return next
  }

  function submit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return
    const payload = {
      full_name: form.full_name.trim(),
      mobile: form.mobile.trim(),
      society_id: Number(form.society_id),
      ...(form.email && { email: form.email.trim().toLowerCase() }),
      ...(form.password && { password: form.password }),
    }
    mut.mutate(payload)
  }

  const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30'
  const labelCls = 'text-xs font-medium text-muted-foreground block mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Invite Society Admin</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className={labelCls}>Full Name *</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Priya Sharma"
              className={inputCls}
            />
            {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
          </div>

          {/* Mobile + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Mobile *</label>
              <input
                type="tel"
                value={form.mobile}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                placeholder="9876543210"
                className={inputCls}
              />
              {errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile}</p>}
            </div>
            <div>
              <label className={labelCls}>Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="priya@greenwood.io"
                className={inputCls}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Society */}
          <div>
            <label className={labelCls}>Society *</label>
            <select
              value={form.society_id}
              onChange={(e) => setForm((p) => ({ ...p, society_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">{societies.length === 0 ? 'Loading…' : 'Select society'}</option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.society_id && <p className="text-xs text-destructive mt-1">{errors.society_id}</p>}
          </div>

          {/* Password */}
          <div>
            <label className={labelCls}>Password (optional — auto-generated if blank)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Leave blank to auto-generate"
              className={inputCls}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Admin can log in with mobile + OTP <span className="font-mono font-semibold">123456</span>
          </p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mut.isPending} className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
              {mut.isPending ? 'Inviting…' : 'Invite Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SocietyAdmins() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  // Stats from dedicated endpoint
  const { data: statsData } = useQuery({
    queryKey: ['society-admin-stats'],
    queryFn: () => platformService.getSocietyAdminStats().then((r) => r.data?.data ?? r.data),
    staleTime: 30_000,
  })
  const stats = statsData ?? { total: 0, active: 0, pending: 0, suspended: 0 }

  // Fetch ALL admins — filter client-side (API status param only supports active/pending/inactive, not suspended)
  const { data, isLoading } = useQuery({
    queryKey: ['society-admins', search],
    queryFn: () =>
      platformService.getSocietyAdmins({
        ...(search && { search }),
        page_size: 200,
      }).then((r) => r.data),
    staleTime: 30_000,
  })

  const allAdmins = data?.results ?? []
  // API uses "inactive" for suspended admins — map the "suspended" tab key to "inactive"
  const admins = statusFilter === 'all'
    ? allAdmins
    : allAdmins.filter((a) => a.status === (statusFilter === 'suspended' ? 'inactive' : statusFilter))

  const approveMut = useMutation({
    mutationFn: (id) => platformService.approveSocietyAdmin(id),
    onSuccess: () => {
      toast.success('Admin approved')
      qc.invalidateQueries({ queryKey: ['society-admins'] })
      qc.invalidateQueries({ queryKey: ['society-admin-stats'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const suspendMut = useMutation({
    mutationFn: (id) => platformService.suspendSocietyAdmin(id),
    onSuccess: () => {
      toast.success('Admin suspended')
      qc.invalidateQueries({ queryKey: ['society-admins'] })
      qc.invalidateQueries({ queryKey: ['society-admin-stats'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const TABS = [
    { key: 'all',       label: 'All',       count: stats.total },
    { key: 'active',    label: 'Active',    count: stats.active },
    { key: 'pending',   label: 'Pending',   count: stats.pending },
    { key: 'suspended', label: 'Suspended', count: stats.suspended },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Society Admins"
        description="Manage all society administrator accounts"
        actions={
          <>
            <button
              onClick={() => toast.info('Export started')}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <UserPlus className="h-4 w-4" /> Invite Admin
            </button>
          </>
        }
      />

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Admins', value: stats.total,     border: 'border-border',      bg: 'bg-card',       color: 'text-foreground' },
          { label: 'Active',       value: stats.active,    border: 'border-teal-100',    bg: 'bg-teal-50',    color: 'text-teal-600' },
          { label: 'Pending',      value: stats.pending,   border: 'border-amber-100',   bg: 'bg-amber-50',   color: 'text-amber-600' },
        ].map(({ label, value, border, bg, color }) => (
          <div key={label} className={`rounded-2xl border ${border} ${bg} p-5`}>
            <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
            <div className="text-sm text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label} <span className="ml-1 text-xs opacity-70">{count}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, society, email…"
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 w-64"
          />
        </div>
      </div>

      {/* Admin Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : admins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <ShieldCheck className="h-10 w-10 opacity-30" />
          <p className="text-sm">No society admins found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {admins.map((admin) => {
            const name       = admin.full_name || admin.name || 'Unknown'
            const planKey    = (admin.plan || admin.society_plan || '').toLowerCase().replace(' ', '-')
            const planLabel  = admin.plan_display || admin.plan || ''
            const planCls    = PLAN_COLORS[planKey] || 'bg-gray-100 text-gray-600'
            const isPending   = admin.status === 'pending'
            const isSuspended = admin.status === 'inactive'   // API returns "inactive" when suspended
            const isActive    = admin.status === 'active'

            return (
              <div
                key={admin.id}
                className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4 hover:shadow-sm transition-shadow"
              >
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${avatarColor(admin.id)}`}>
                  {getInitials(name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="font-semibold text-foreground truncate">{name}</span>
                    <StatusBadge status={admin.status === 'inactive' ? 'suspended' : admin.status} />
                    {planLabel && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${planCls}`}>
                        {planLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{admin.society_name || '—'}</div>
                  <div className="text-xs text-muted-foreground truncate">{admin.email || admin.mobile || ''}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {admin.mobile && (
                    <a
                      href={`tel:${admin.mobile}`}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-teal-600 hover:border-teal-300 transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {admin.email && (
                    <a
                      href={`mailto:${admin.email}`}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-teal-600 hover:border-teal-300 transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {isPending && (
                    <button
                      onClick={() => approveMut.mutate(admin.id)}
                      disabled={approveMut.isPending}
                      className="rounded-xl bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 disabled:opacity-60 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {isActive && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Suspend ${name}?`)) suspendMut.mutate(admin.id)
                      }}
                      disabled={suspendMut.isPending}
                      className="rounded-xl border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60 transition-colors"
                    >
                      Suspend
                    </button>
                  )}
                  {isSuspended && (
                    <span className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      Suspended
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}

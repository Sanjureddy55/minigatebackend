import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { platformService } from '../../services/platform.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, getErrorMessage } from '../../utils/formatters.js'

// ── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    full_name:   '',
    email:       '',
    mobile:      '',
    role_id:     '',
    society_id:  '',
    building_id: '',
    flat_id:     '',
    flat_number: '',
    password:    '',
    status:      'active',
  })
  const [errors, setErrors] = useState({})

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => platformService.getRoles().then((r) => r.data?.results ?? r.data),
    staleTime: 300_000,
  })
  const roles = (rolesData ?? []).filter((r) => r.is_active)

  const { data: societiesData } = useQuery({
    queryKey: ['societies-list'],
    queryFn: () => platformService.getSocieties({ page_size: 200 }).then((r) => r.data?.results ?? []),
    staleTime: 300_000,
  })
  const societies = societiesData ?? []

  const { data: buildingsData } = useQuery({
    queryKey: ['buildings', form.society_id],
    queryFn: () => platformService.getBuildings(form.society_id).then((r) => r.data?.results ?? r.data ?? []),
    enabled: !!form.society_id,
    staleTime: 60_000,
  })
  const buildings = buildingsData ?? []

  const { data: flatsData } = useQuery({
    queryKey: ['flats', form.society_id, form.building_id],
    queryFn: () => platformService.getFlats(form.society_id, form.building_id || undefined).then((r) => r.data?.results ?? r.data ?? []),
    enabled: !!form.society_id,
    staleTime: 60_000,
  })
  const flats = flatsData ?? []

  const mut = useMutation({
    mutationFn: (data) => platformService.inviteUser(data),
    onSuccess: () => {
      toast.success('User invited successfully')
      qc.invalidateQueries({ queryKey: ['platform-users'] })
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
    if (!form.mobile.trim())    next.mobile    = 'Mobile number is required'
    if (!form.role_id)          next.role_id   = 'Role is required'
    if (!form.society_id)       next.society_id = 'Society is required'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Invalid email'
    return next
  }

  function submit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return
    // Use flat_number from selected flat, or manual entry
    const selectedFlat = flats.find((f) => String(f.id) === String(form.flat_id))
    const flatNumber = selectedFlat?.flat_number || selectedFlat?.number || form.flat_number || ''
    mut.mutate({
      full_name:   form.full_name.trim(),
      mobile:      form.mobile.trim(),
      role_id:     Number(form.role_id),
      society_id:  Number(form.society_id),
      status:      form.status,
      ...(form.email  && { email:       form.email.trim().toLowerCase() }),
      ...(flatNumber  && { flat_number: flatNumber }),
      ...(form.password && { password:  form.password }),
    })
  }

  const inputCls = 'w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30'
  const labelCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h3 className="font-bold text-foreground text-lg">Invite User</h3>
            <p className="text-xs text-muted-foreground mt-0.5">An invitation will be sent to the user</p>
          </div>
          <button onClick={onClose} className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className={labelCls}>Full Name *</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="e.g. Rahul Sharma"
              className={inputCls}
            />
            {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="user@society.io"
              className={inputCls}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          {/* Mobile */}
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

          {/* Society */}
          <div>
            <label className={labelCls}>Society *</label>
            <select
              value={form.society_id}
              onChange={(e) => setForm((p) => ({ ...p, society_id: e.target.value, building_id: '', flat_id: '' }))}
              className={inputCls}
            >
              <option value="">{societies.length === 0 ? 'Loading…' : 'Select society'}</option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.society_id && <p className="text-xs text-destructive mt-1">{errors.society_id}</p>}
          </div>

          {/* Role */}
          <div>
            <label className={labelCls}>Role *</label>
            <select
              value={form.role_id}
              onChange={(e) => setForm((p) => ({ ...p, role_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">{roles.length === 0 ? 'Loading…' : 'Select role'}</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {errors.role_id && <p className="text-xs text-destructive mt-1">{errors.role_id}</p>}
          </div>

          {/* Tower (Building) + Flat */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tower / Block</label>
              <select
                value={form.building_id}
                onChange={(e) => setForm((p) => ({ ...p, building_id: e.target.value, flat_id: '' }))}
                disabled={!form.society_id}
                className={inputCls + ' disabled:opacity-50'}
              >
                <option value="">
                  {!form.society_id ? 'Select society first' : buildings.length === 0 ? 'No towers' : 'All towers'}
                </option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name || b.tower_name || `Tower ${b.id}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Flat</label>
              <select
                value={form.flat_id}
                onChange={(e) => setForm((p) => ({ ...p, flat_id: e.target.value }))}
                disabled={!form.society_id}
                className={inputCls + ' disabled:opacity-50'}
              >
                <option value="">
                  {!form.society_id ? 'Select society first' : flats.length === 0 ? 'No flats' : 'Select flat'}
                </option>
                {flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.flat_number || f.number || `Flat ${f.id}`}
                    {f.owner_name ? ` — ${f.owner_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={labelCls}>Password (optional)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Auto-generated if blank"
              className={inputCls}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {mut.isPending ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

export default function PlatformUsers() {
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [showInvite, setShowInvite] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-users', page, search],
    queryFn: () =>
      platformService.getGlobalUsers({
        page,
        page_size: PAGE_SIZE,
        ...(search && { search }),
      }).then((r) => r.data),
    staleTime: 30_000,
  })

  const users  = data?.results || []
  const total  = data?.count   || 0
  const pages  = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Global Users"
        description="All users across all societies on the platform"
        actions={
          <button
            onClick={() => setShowInvite(true)}
            className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <UserPlus className="h-4 w-4" /> Invite User
          </button>
        }
      />

      {/* Table card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search users…"
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          {total > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">{total} users</span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Role</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Society</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                          <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
                        </div>
                      </div>
                    </td>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-4 py-3 hidden sm:table-cell">
                        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const initials = (user.full_name || 'U').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
                  const COLORS = ['bg-teal-500','bg-violet-500','bg-orange-500','bg-pink-500','bg-blue-500','bg-emerald-500']
                  const color  = COLORS[(user.id || 0) % COLORS.length]
                  return (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-foreground leading-tight">{user.full_name}</div>
                            <div className="text-xs text-muted-foreground">{user.mobile || user.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {user.role_name
                          ? <span className="text-xs font-semibold text-primary">{user.role_name}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm text-foreground">
                        {user.society_name || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.status === 'inactive' ? 'suspended' : user.status} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {pages} · {total} total
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg p-1.5 border border-border hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="rounded-lg p-1.5 border border-border hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}

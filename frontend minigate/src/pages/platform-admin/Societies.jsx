import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { platformService } from '../../services/platform.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { EmptyState } from '../../components/shared/EmptyState.jsx'
import { formatDate, getErrorMessage } from '../../utils/formatters.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'

function SocietyModal({ society, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!society
  const [form, setForm] = useState({
    name: society?.name || '',
    city: society?.city ? String(society.city) : '',
    total_flats: society?.total_flats || 100,
    plan: society?.plan || 'free',
    status: society?.status || 'active',
    admin_email: '',
  })
  const [errors, setErrors] = useState({})

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => platformService.getCities().then((r) => r.data?.results ?? r.data),
    staleTime: 300_000,
  })
  const cities = citiesData ?? []

  const { data: plansData } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => platformService.getPlans().then((r) => r.data?.results ?? r.data),
    staleTime: 300_000,
  })
  const plans = (plansData ?? []).filter((p) => p.status === 'active')

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? platformService.updateSociety(society.id, data)
        : platformService.createSociety(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Society updated' : 'Society created')
      qc.invalidateQueries({ queryKey: ['platform-societies-list'] })
      qc.invalidateQueries({ queryKey: ['platform-stats'] })
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
    if (!form.name.trim()) next.name = 'Society name is required'
    if (!form.city) next.city = 'City is required'
    if (!form.total_flats || form.total_flats < 1) next.total_flats = 'At least 1 flat required'
    if (!isEdit && !form.admin_email.trim()) next.admin_email = 'Admin email is required'
    else if (!isEdit && !/^\S+@\S+\.\S+$/.test(form.admin_email)) next.admin_email = 'Invalid email'
    return next
  }

  function submit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return
    mutation.mutate({
      name: form.name.trim(),
      city: Number(form.city),
      total_flats: Number(form.total_flats),
      plan: form.plan,
      status: form.status,
      ...(!isEdit && { admin_email: form.admin_email.trim().toLowerCase() }),
    })
  }

  const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30'
  const labelCls = 'text-xs font-medium text-muted-foreground block mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Society' : 'Create Society'}</h3>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">

          {/* Society Name */}
          <div>
            <label className={labelCls}>Society Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Greenwood Heights"
              className={inputCls}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          {/* City + Total Flats */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>City *</label>
              <select
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className={inputCls}
              >
                <option value="">{cities.length === 0 ? 'Loading…' : 'Select city'}</option>
                {cities.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}{c.state ? `, ${c.state}` : ''}
                  </option>
                ))}
              </select>
              {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className={labelCls}>Total Flats *</label>
              <input
                type="number"
                min={1}
                value={form.total_flats}
                onChange={(e) => setForm((p) => ({ ...p, total_flats: e.target.value }))}
                className={inputCls}
              />
              {errors.total_flats && <p className="text-xs text-destructive mt-1">{errors.total_flats}</p>}
            </div>
          </div>

          {/* Admin Email — only on create */}
          {!isEdit && (
            <div>
              <label className={labelCls}>Society Admin Email *</label>
              <input
                type="email"
                value={form.admin_email}
                onChange={(e) => setForm((p) => ({ ...p, admin_email: e.target.value }))}
                placeholder="admin@society.com"
                className={inputCls}
              />
              {errors.admin_email && <p className="text-xs text-destructive mt-1">{errors.admin_email}</p>}
            </div>
          )}

          {/* Plan + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                className={inputCls}
              >
                <option value="">{plans.length === 0 ? 'Loading…' : 'Select plan'}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className={inputCls}
              >
                {[['active', 'Active'], ['inactive', 'Inactive'], ['suspended', 'Suspended']].map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PlatformSocieties() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const { data, isLoading } = useQuery({
    queryKey: ['platform-societies-list', page],
    queryFn: () =>
      platformService.getSocieties({ page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const suspendMutation = useMutation({
    mutationFn: (id) => platformService.updateSociety(id, { status: 'suspended' }),
    onSuccess: () => {
      toast.success('Society suspended')
      qc.invalidateQueries({ queryKey: ['platform-societies-list'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const columns = [
    { header: 'Name', accessor: 'name', render: (v) => <span className="font-medium">{v}</span> },
    { header: 'City', accessor: 'city_name', render: (v) => v || '—' },
    { header: 'Plan', accessor: 'plan_display', render: (v) => <span className="capitalize text-xs font-semibold text-primary">{v || '—'}</span> },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v} /> },
    { header: 'Created', accessor: 'created_at', render: (v) => formatDate(v) },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-md p-1.5 hover:bg-muted transition-colors">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast.info(`Viewing ${row.name}`)}>
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setModal({ type: 'edit', society: row })}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={row.status === 'suspended' || suspendMutation.isPending}
              onClick={() => {
                if (window.confirm(`Suspend "${row.name}"? This will restrict access for all residents.`))
                  suspendMutation.mutate(row.id)
              }}
            >
              Suspend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Society Management"
        description="Create and manage all societies on the platform"
        actions={
          <button
            onClick={() => setModal({ type: 'create' })}
            className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> New Society
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No societies"
        emptyIcon={Building2}
        searchable
        searchPlaceholder="Search societies…"
        pagination={
          data
            ? { page, pageSize: PAGE_SIZE, total: data.count || 0 }
            : undefined
        }
        onPageChange={setPage}
      />

      {modal?.type === 'create' && (
        <SocietyModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <SocietyModal society={modal.society} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

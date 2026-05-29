import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, CreditCard, Check, X, Star, Users, Building2, Wrench, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { toast } from 'sonner'
import { platformService } from '../../services/platform.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { EmptyState } from '../../components/shared/EmptyState.jsx'
import { getErrorMessage } from '../../utils/formatters.js'

// ── Plan Modal ───────────────────────────────────────────────────────────────
function PlanModal({ plan, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!plan

  const [form, setForm] = useState({
    name:              plan?.name || '',
    slug:              plan?.slug || '',
    description:       plan?.description || '',
    monthly_price:     plan?.monthly_price || '0.00',
    annual_price:      plan?.annual_price || '0.00',
    max_flats:         plan?.max_flats ?? 50,
    max_users:         plan?.max_users ?? 100,
    max_buildings:     plan?.max_buildings ?? 1,
    max_staff:         plan?.max_staff ?? 5,
    // features: join array to one-per-line for textarea
    features:          Array.isArray(plan?.features) ? plan.features.join('\n') : (plan?.features || ''),
    status:            plan?.status || 'active',
    sort_order:        plan?.sort_order ?? 1,
    is_popular:        plan?.is_popular ?? false,
    is_trial:          plan?.is_trial ?? false,
    is_custom_pricing: plan?.is_custom_pricing ?? false,
  })
  const [errors, setErrors] = useState({})

  function set(key, val) { setForm((p) => ({ ...p, [key]: val })) }
  function toggle(key)    { setForm((p) => ({ ...p, [key]: !p[key] })) }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Plan name is required'
    if (form.monthly_price === '' || Number(form.monthly_price) < 0) next.monthly_price = 'Invalid price'
    return next
  }

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? platformService.updatePlan(plan.id, data) : platformService.createPlan(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Plan updated' : 'Plan created')
      qc.invalidateQueries({ queryKey: ['subscription-plans'] })
      onClose()
    },
    onError: (err) => {
      const data = err.response?.data
      if (data && typeof data === 'object' && !data.detail) {
        const fieldErrors = {}
        Object.entries(data).forEach(([k, v]) => { fieldErrors[k] = Array.isArray(v) ? v[0] : String(v) })
        setErrors(fieldErrors)
        toast.error('Please fix the errors')
      } else {
        toast.error(getErrorMessage(err))
      }
    },
  })

  function submit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    const payload = {
      name:              form.name.trim(),
      description:       form.description.trim(),
      monthly_price:     form.monthly_price,
      annual_price:      form.annual_price,
      max_flats:         form.max_flats === '' ? null : Number(form.max_flats),
      max_users:         form.max_users === '' ? null : Number(form.max_users),
      max_buildings:     form.max_buildings === '' ? null : Number(form.max_buildings),
      max_staff:         form.max_staff === '' ? null : Number(form.max_staff),
      features:          form.features.split('\n').map((f) => f.trim()).filter(Boolean),
      status:            form.status,
      sort_order:        Number(form.sort_order),
      is_popular:        form.is_popular,
      is_trial:          form.is_trial,
      is_custom_pricing: form.is_custom_pricing,
      ...(form.slug.trim() && { slug: form.slug.trim() }),
    }
    mutation.mutate(payload)
  }

  const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30'
  const labelCls = 'text-xs font-medium text-muted-foreground block mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Plan' : 'New Subscription Plan'}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto p-6 space-y-4">
          {/* Name + Slug */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Plan Name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Pro Plan" className={inputCls} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className={labelCls}>Slug (auto if blank)</label>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="pro-plan" className={inputCls} />
              {errors.slug && <p className="text-xs text-destructive mt-1">{errors.slug}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Plan for medium-size societies…" className={inputCls} />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Monthly Price (₹)</label>
              <input type="number" min="0" step="0.01" value={form.monthly_price} onChange={(e) => set('monthly_price', e.target.value)} className={inputCls} />
              {errors.monthly_price && <p className="text-xs text-destructive mt-1">{errors.monthly_price}</p>}
            </div>
            <div>
              <label className={labelCls}>Annual Price (₹)</label>
              <input type="number" min="0" step="0.01" value={form.annual_price} onChange={(e) => set('annual_price', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Max Flats (blank = unlimited)</label>
              <input type="number" min="0" value={form.max_flats ?? ''} onChange={(e) => set('max_flats', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Users</label>
              <input type="number" min="0" value={form.max_users ?? ''} onChange={(e) => set('max_users', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Buildings</label>
              <input type="number" min="0" value={form.max_buildings ?? ''} onChange={(e) => set('max_buildings', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Staff</label>
              <input type="number" min="0" value={form.max_staff ?? ''} onChange={(e) => set('max_staff', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className={labelCls}>Features (one per line)</label>
            <textarea
              value={form.features}
              onChange={(e) => set('features', e.target.value)}
              rows={5}
              placeholder={"Resident Management\nVisitor Management\nBilling\nComplaints"}
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground mt-1">Each line becomes one feature item</p>
          </div>

          {/* Status + Sort Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input type="number" min="1" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Boolean Toggles */}
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'is_popular',        label: 'Popular Plan' },
              { key: 'is_trial',          label: 'Trial Plan' },
              { key: 'is_custom_pricing', label: 'Custom Pricing' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors ${
                  form[key]
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${form[key] ? 'bg-teal-500 border-teal-500' : 'border-input'}`}>
                  {form[key] && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
              {mutation.isPending ? 'Saving…' : isEdit ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SubscriptionPlans() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => platformService.getPlans().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => platformService.deletePlan(id),
    onSuccess: () => { toast.success('Plan deleted'); qc.invalidateQueries({ queryKey: ['subscription-plans'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const plans = data?.results || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Subscription Plans"
        description="Manage pricing plans for societies"
        actions={
          <button onClick={() => setModal({ type: 'create' })} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> New Plan
          </button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3 animate-pulse">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-8 w-20 rounded bg-muted" />
              <div className="h-3 w-48 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans yet" description="Create your first subscription plan." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features)
              ? plan.features
              : String(plan.features || '').split(',').map((f) => f.trim()).filter(Boolean)
            const price = plan.price_display ||
              (plan.monthly_price === '0.00' || !plan.monthly_price
                ? 'Free'
                : `₹${Number(plan.monthly_price).toLocaleString('en-IN')}`)

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border bg-card flex flex-col relative overflow-hidden transition-shadow hover:shadow-lg ${
                  plan.is_popular ? 'border-teal-400 shadow-md' : 'border-border'
                }`}
              >
                {/* Popular ribbon */}
                {plan.is_popular && (
                  <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-white" /> POPULAR
                  </div>
                )}

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Top row: name + menu */}
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-foreground text-lg leading-tight pr-2">{plan.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-lg p-1 hover:bg-muted transition-colors shrink-0">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setModal({ type: 'edit', plan })}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => { if (window.confirm(`Delete "${plan.name}"?`)) deleteMutation.mutate(plan.id) }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <StatusBadge status={plan.status} />
                    {plan.is_trial         && <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">Trial</span>}
                    {plan.is_custom_pricing && <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs font-medium">Custom</span>}
                  </div>

                  {/* Description */}
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-2">{plan.description}</p>
                  )}

                  {/* Price block */}
                  <div className="rounded-xl bg-muted/40 px-4 py-3 mb-4">
                    <div className="text-3xl font-extrabold text-teal-600 leading-none">
                      {price}
                      {!plan.is_custom_pricing && plan.monthly_price !== '0.00' && (
                        <span className="text-sm text-muted-foreground font-normal ml-1">/mo</span>
                      )}
                    </div>
                    {plan.annual_price && plan.annual_price !== '0.00' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ₹{Number(plan.annual_price).toLocaleString('en-IN')}/yr
                        {plan.annual_savings > 0 && (
                          <span className="ml-2 text-teal-600 font-medium">Save ₹{Number(plan.annual_savings).toLocaleString('en-IN')}</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Limits row */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    {[
                      { icon: Building2, label: 'Flats',    val: plan.max_flats },
                      { icon: Users,     label: 'Users',    val: plan.max_users },
                      { icon: Wrench,    label: 'Staff',    val: plan.max_staff },
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="rounded-xl border border-border bg-background py-2 px-1">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
                        <div className="text-xs font-bold text-foreground">{val ?? '∞'}</div>
                        <div className="text-[10px] text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  {features.length > 0 && (
                    <div className="space-y-1.5 mb-4 flex-1">
                      {features.slice(0, 5).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-teal-500 shrink-0" />
                          {f}
                        </div>
                      ))}
                      {features.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-5">+{features.length - 5} more features</p>
                      )}
                    </div>
                  )}

                  {/* Tenant stats */}
                  {(plan.tenants != null || plan.total_flats != null) && (
                    <div className="flex gap-4 pt-3 border-t border-border text-xs text-muted-foreground mt-auto">
                      {plan.tenants    != null && <span><strong className="text-foreground">{plan.tenants}</strong> societies</span>}
                      {plan.total_flats != null && <span><strong className="text-foreground">{plan.total_flats}</strong> flats</span>}
                    </div>
                  )}
                </div>

                {/* Card Footer — Edit Plan button */}
                <div className="border-t border-border px-5 py-3">
                  <button
                    onClick={() => setModal({ type: 'edit', plan })}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit Plan
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal?.type === 'create' && <PlanModal onClose={() => setModal(null)} />}
      {modal?.type === 'edit'   && <PlanModal plan={modal.plan} onClose={() => setModal(null)} />}
    </div>
  )
}

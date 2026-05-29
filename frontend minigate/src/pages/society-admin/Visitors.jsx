import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  QrCode, Plus, Search, X, Wifi, Clock, Car, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

// ── helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['bg-teal-500','bg-violet-500','bg-orange-500','bg-pink-500','bg-blue-500','bg-emerald-500','bg-rose-400','bg-amber-500']
function avatarColor(s=''){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))&0xffff;return AVATAR_COLORS[h%AVATAR_COLORS.length]}
function initials(n=''){return n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?'}
function fmtTime(ts){if(!ts)return'—';return new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false})}

const TYPE_CLS = {
  guest:    'bg-teal-50 text-teal-700 border-teal-200',
  delivery: 'bg-orange-50 text-orange-700 border-orange-200',
  cab:      'bg-blue-50 text-blue-700 border-blue-200',
  service:  'bg-gray-100 text-gray-600 border-gray-200',
  other:    'bg-purple-50 text-purple-700 border-purple-200',
}

const STATUS_CLS = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-teal-50 text-teal-700',
  inside:   'bg-teal-50 text-teal-700',
  exited:   'bg-gray-100 text-gray-500',
  rejected: 'bg-red-50 text-red-600',
}
const STATUS_LABEL = {
  pending:  'Pending',
  approved: 'Approved',
  inside:   'Checked In',
  exited:   'Checked Out',
  rejected: 'Rejected',
}

// ── Reject Reason Modal ───────────────────────────────────────────────────────
function RejectModal({ visitor, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  function submit(e) {
    e.preventDefault()
    if (!reason.trim()) { toast.error('Reason is required'); return }
    onConfirm(reason.trim())
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground">Reject Visitor</h3>
        <p className="text-xs text-muted-foreground">Rejecting <strong>{visitor.full_name}</strong>. Please provide a reason.</p>
        <form onSubmit={submit} className="space-y-3">
          <textarea
            value={reason}
            onChange={e=>setReason(e.target.value)}
            placeholder="Unknown person, not verified…"
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" className="flex-1 rounded-xl bg-destructive text-white py-2 text-sm font-semibold hover:bg-destructive/90 transition-colors">Reject</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── New Visitor Modal ─────────────────────────────────────────────────────────
function NewVisitorModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    full_name: '', mobile: '', visit_type: 'guest',
    buildingId: '',    // UUID — for fetching flats
    buildingName: '',  // Name — sent in POST body
    flat_number: '',   // From flat dropdown
    host_name: '', purpose: '', vehicle_number: '',
  })
  const [errors, setErrors] = useState({})

  // Step 1 — Load buildings on modal open
  const { data: buildingsData, isLoading: loadingBuildings } = useQuery({
    queryKey: ['visitor-modal-buildings'],
    queryFn: () => societyService.getBuildings().then(r => r.data?.results ?? r.data ?? []),
    staleTime: 300_000,
  })
  const buildings = buildingsData ?? []

  // Step 2 — Load flats when building is selected
  const { data: flatsData, isLoading: loadingFlats } = useQuery({
    queryKey: ['visitor-modal-flats', form.buildingId],
    queryFn: () => societyService.getFlats({ building: form.buildingId }).then(r => r.data?.results ?? r.data ?? []),
    enabled: !!form.buildingId,
    staleTime: 60_000,
  })
  const flats = flatsData ?? []

  function handleBuildingChange(e) {
    const id = e.target.value
    const bld = buildings.find(b => b.id === id)
    setForm(p => ({ ...p, buildingId: id, buildingName: bld?.name ?? '', flat_number: '' }))
  }

  const mut = useMutation({
    mutationFn: (data) => societyService.registerVisitor(data),
    onSuccess: (res) => {
      const msg = res?.data?.message || 'Visitor registered successfully'
      toast.success(msg)
      qc.invalidateQueries({ queryKey: ['society-visitors'] })
      qc.invalidateQueries({ queryKey: ['visitor-dashboard'] })
      onClose()
    },
    onError: (err) => {
      const data = err.response?.data
      if (data && typeof data === 'object' && !data.detail) {
        const fe = {}
        Object.entries(data).forEach(([k,v])=>{fe[k]=Array.isArray(v)?v[0]:String(v)})
        setErrors(fe); toast.error('Please fix the errors')
      } else toast.error(getErrorMessage(err))
    },
  })

  function validate() {
    const next = {}
    if (!form.full_name.trim()) next.full_name   = 'Name is required'
    if (!form.mobile.trim())    next.mobile      = 'Mobile is required'
    if (!form.buildingId)       next.buildingId  = 'Building is required'
    if (!form.flat_number)      next.flat_number = 'Flat is required'
    return next
  }

  function submit(e) {
    e.preventDefault()
    const errs = validate(); setErrors(errs)
    if (Object.keys(errs).length) return
    // Step 3 — submit with building NAME (not UUID) and flat_number
    mut.mutate({
      full_name:     form.full_name.trim(),
      mobile:        form.mobile.trim(),
      visit_type:    form.visit_type,
      building_name: form.buildingName,   // name, not UUID
      flat_number:   form.flat_number,    // from flat dropdown
      ...(form.host_name      && { host_name:      form.host_name.trim() }),
      ...(form.purpose        && { purpose:        form.purpose.trim() }),
      ...(form.vehicle_number && { vehicle_number: form.vehicle_number.trim() }),
    })
  }

  const inputCls = 'w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30'
  const labelCls = 'text-xs font-medium text-muted-foreground block mb-1.5'
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl">
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h3 className="font-bold text-lg">New Visitor</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Register a visitor for gate entry.</p>
          </div>
          <button onClick={onClose} className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted">
            <X className="h-3.5 w-3.5"/>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 pb-6 space-y-4">

          {/* Name + Mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input value={form.full_name} onChange={e=>f('full_name',e.target.value)} placeholder="Rahul Kumar" className={inputCls}/>
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <label className={labelCls}>Mobile *</label>
              <input type="tel" value={form.mobile} onChange={e=>f('mobile',e.target.value)} placeholder="9876543210" className={inputCls}/>
              {errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile}</p>}
            </div>
          </div>

          {/* Visit Type */}
          <div>
            <label className={labelCls}>Visit Type *</label>
            <div className="flex gap-2 flex-wrap">
              {[['guest','Guest'],['delivery','Delivery'],['cab','Cab'],['service','Service'],['other','Other']].map(([val,lbl])=>(
                <button key={val} type="button" onClick={()=>f('visit_type',val)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${form.visit_type===val ? 'bg-teal-500 border-teal-500 text-white' : 'border-border hover:bg-muted'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Step 1 — Building dropdown */}
          <div>
            <label className={labelCls}>Building Name *</label>
            <select
              value={form.buildingId}
              onChange={handleBuildingChange}
              disabled={loadingBuildings}
              className={inputCls + ' disabled:opacity-50'}
            >
              <option value="">{loadingBuildings ? 'Loading buildings…' : 'Select building'}</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.buildingId && <p className="text-xs text-destructive mt-1">{errors.buildingId}</p>}
          </div>

          {/* Step 2 — Flat dropdown (chains from building) */}
          <div>
            <label className={labelCls}>Flat Number *</label>
            <select
              value={form.flat_number}
              onChange={e => f('flat_number', e.target.value)}
              disabled={!form.buildingId || loadingFlats}
              className={inputCls + ' disabled:opacity-50'}
            >
              <option value="">
                {!form.buildingId ? 'Select building first' : loadingFlats ? 'Loading flats…' : flats.length === 0 ? 'No flats found' : 'Select flat'}
              </option>
              {flats.map(fl => (
                <option key={fl.id} value={fl.flat_number}>{fl.flat_number}</option>
              ))}
            </select>
            {errors.flat_number && <p className="text-xs text-destructive mt-1">{errors.flat_number}</p>}
          </div>

          {/* Host + Purpose */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Host Name</label>
              <input value={form.host_name} onChange={e=>f('host_name',e.target.value)} placeholder="Aarav Sharma" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Purpose</label>
              <input value={form.purpose} onChange={e=>f('purpose',e.target.value)} placeholder="Personal visit" className={inputCls}/>
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <label className={labelCls}>Vehicle Number (optional)</label>
            <input value={form.vehicle_number} onChange={e=>f('vehicle_number',e.target.value)} placeholder="MH12AB1234" className={inputCls}/>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {mut.isPending ? 'Registering…' : 'Register Visitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',      label: 'All Visitors' },
  { key: 'pending',  label: 'Pending', dot: 'bg-amber-400' },
  { key: 'inside',   label: 'Inside',  dot: 'bg-teal-400' },
  { key: 'exited',   label: 'Exited' },
  { key: 'rejected', label: 'Rejected' },
]

export default function SocietyVisitors() {
  const qc = useQueryClient()
  const [tab, setTab]           = useState('all')
  const [search, setSearch]     = useState('')
  const [debSearch, setDeb]     = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null) // visitor to reject

  useEffect(()=>{const t=setTimeout(()=>setDeb(search),300);return()=>clearTimeout(t)},[search])

  // KPI dashboard
  const { data: kpi } = useQuery({
    queryKey: ['visitor-dashboard'],
    queryFn: () => societyService.getVisitorDashboard().then(r=>r.data?.data??r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  // Fetch ALL visitors — filter by tab client-side (reliable across all status values)
  const { data, isLoading } = useQuery({
    queryKey: ['society-visitors', debSearch],
    queryFn: () => societyService.getVisitors({
      page_size: 200,
      ...(debSearch && { search: debSearch }),
      ordering: '-created_at',
    }).then(r=>r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const allVisitors = data?.results ?? []

  // Client-side tab filter
  const visitors = tab === 'all'
    ? allVisitors
    : allVisitors.filter(v => (v.status || '').toLowerCase() === tab)

  const total = allVisitors.length

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['society-visitors'] })
    qc.invalidateQueries({ queryKey: ['visitor-dashboard'] })
  }

  const approveMut  = useMutation({ mutationFn: (id)=>societyService.approveVisitor(id),            onSuccess:()=>{toast.success('Visitor approved');  invalidate()}, onError:e=>toast.error(getErrorMessage(e)) })
  const rejectMut   = useMutation({ mutationFn: ({id,reason})=>societyService.rejectVisitor(id,reason), onSuccess:()=>{toast.success('Visitor rejected');  setRejectTarget(null); invalidate()}, onError:e=>toast.error(getErrorMessage(e)) })
  const checkInMut  = useMutation({ mutationFn: (id)=>societyService.checkInVisitor(id),            onSuccess:()=>{toast.success('Checked in');        invalidate()}, onError:e=>toast.error(getErrorMessage(e)) })
  const checkOutMut = useMutation({ mutationFn: (id)=>societyService.checkOutVisitor(id),           onSuccess:()=>{toast.success('Checked out');       invalidate()}, onError:e=>toast.error(getErrorMessage(e)) })

  const KPI_CHIPS = [
    { label: 'INSIDE',   value: kpi?.currently_inside   ?? 0, color: 'bg-teal-500 text-white' },
    { label: 'PENDING',  value: kpi?.pending_approval   ?? 0, color: 'bg-amber-400 text-white' },
    { label: 'TODAY',    value: kpi?.total_today         ?? 0, color: 'bg-gray-100 text-foreground' },
    { label: 'REJECTED', value: kpi?.rejected_today      ?? 0, color: 'bg-red-50 text-red-500' },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visitors & Gate Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live entry/exit logs, approvals and QR verification</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>toast.info('QR scanner — coming soon')} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <QrCode className="h-4 w-4"/> Scan QR
          </button>
          <button onClick={()=>setShowNew(true)} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4"/> New Visitor
          </button>
        </div>
      </div>

      {/* Live indicator + KPI chips */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <span className="flex items-center gap-2 text-xs font-semibold text-teal-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"/>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"/>
          </span>
          Gate feed live
        </span>
        <div className="flex gap-2">
          {KPI_CHIPS.map(({ label, value, color }) => (
            <div key={label} className={`flex flex-col items-center rounded-xl px-4 py-2 min-w-[60px] ${color}`}>
              <span className="text-lg font-extrabold leading-tight">{value}</span>
              <span className="text-[10px] font-semibold opacity-80">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 border-b border-border">
          {TABS.map(({ key, label, dot }) => (
            <button key={key} onClick={()=>setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab===key ? 'border-teal-500 text-teal-600' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {dot && <span className={`w-2 h-2 rounded-full ${dot}`}/>}
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <input value={search} onChange={e=>{setSearch(e.target.value)}}
            placeholder="Search visitor, flat, purpose…"
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background w-64 focus:outline-none focus:ring-2 focus:ring-ring/30"/>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Visitor</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Destination</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Time</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({length:8}).map((_,i)=>(
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0"/>
                        <div className="space-y-1.5">
                          <div className="h-3 w-28 rounded bg-muted animate-pulse"/>
                          <div className="h-2.5 w-20 rounded bg-muted animate-pulse"/>
                        </div>
                      </div>
                    </td>
                    {[...Array(6)].map((_,j)=><td key={j} className="px-4 py-3 hidden sm:table-cell"><div className="h-3 w-16 rounded bg-muted animate-pulse"/></td>)}
                  </tr>
                ))
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <QrCode className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2"/>
                    <p className="text-sm text-muted-foreground">No visitors found</p>
                  </td>
                </tr>
              ) : visitors.map((v) => {
                const name    = v.full_name || 'Visitor'
                const vtype   = (v.visit_type || 'guest').toLowerCase()
                const status  = (v.status || 'pending').toLowerCase()
                const typeCls = TYPE_CLS[vtype] || TYPE_CLS.other

                const destination = [v.flat_number, v.building_name].filter(Boolean).join(' / ')
                const hostLine = v.host_name ? `Host: ${v.host_name}` : ''

                const checkInTime  = v.checked_in_at  ? fmtTime(v.checked_in_at)  : null
                const checkOutTime = v.checked_out_at ? fmtTime(v.checked_out_at) : null

                return (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    {/* Visitor */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(name)}`}>
                          {initials(name)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground leading-tight">{name}</div>
                          <div className="text-xs text-muted-foreground">+91 {v.mobile}</div>
                          {v.purpose && <div className="text-xs text-muted-foreground">{v.purpose}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${typeCls}`}>
                        {v.visit_type_display || v.visit_type}
                      </span>
                    </td>

                    {/* Destination */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {destination && <div className="font-medium text-foreground text-xs">{destination}</div>}
                      {hostLine    && <div className="text-xs text-muted-foreground">{hostLine}</div>}
                      {!destination && !hostLine && <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Vehicle */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {v.vehicle_number
                        ? <span className="flex items-center gap-1 text-xs font-mono text-foreground"><Car className="h-3 w-3 text-muted-foreground"/>{v.vehicle_number}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {checkInTime && (
                        <div className="flex items-center gap-1 text-xs text-foreground">
                          <Clock className="h-3 w-3 text-muted-foreground"/> {checkInTime}
                        </div>
                      )}
                      {checkOutTime && (
                        <div className="text-xs text-muted-foreground">Out: {checkOutTime}</div>
                      )}
                      {!checkInTime && !checkOutTime && (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[status] || 'bg-muted text-muted-foreground'}`}>
                        {STATUS_LABEL[status] || v.status_display || status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {status === 'pending' && <>
                          <button onClick={()=>setRejectTarget(v)}
                            className="rounded-lg border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors">
                            Reject
                          </button>
                          <button onClick={()=>approveMut.mutate(v.id)} disabled={approveMut.isPending}
                            className="btn-teal rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-60">
                            Approve
                          </button>
                        </>}
                        {status === 'approved' && (
                          <button onClick={()=>checkInMut.mutate(v.id)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors">
                            Check in
                          </button>
                        )}
                        {status === 'inside' && (
                          <button onClick={()=>checkOutMut.mutate(v.id)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors">
                            Check out
                          </button>
                        )}
                        {(status === 'exited' || status === 'rejected') && (
                          <button onClick={()=>toast.info(`Visitor details — ${name}`)}
                            className="flex items-center gap-0.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors">
                            Details <ChevronRight className="h-3 w-3"/>
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

        {/* Footer */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">Showing <strong>{visitors.length}</strong> of <strong>{allVisitors.length}</strong> visitors</p>
            <span className="flex items-center gap-1.5 text-xs text-teal-600 font-medium">
              <Wifi className="h-3.5 w-3.5 animate-pulse"/> Auto-updating live
            </span>
          </div>
        )}
      </div>

      {showNew && <NewVisitorModal onClose={()=>setShowNew(false)}/>}
      {rejectTarget && (
        <RejectModal
          visitor={rejectTarget}
          onConfirm={(reason)=>rejectMut.mutate({ id: rejectTarget.id, reason })}
          onClose={()=>setRejectTarget(null)}
        />
      )}
    </div>
  )
}

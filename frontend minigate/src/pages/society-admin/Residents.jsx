import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, UserPlus, Download, Search, ChevronLeft, ChevronRight,
  X, Car, SlidersHorizontal, MoreHorizontal, CheckCircle, XCircle,
  PowerOff, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, getErrorMessage } from '../../utils/formatters.js'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'

const AVATAR_COLORS = ['bg-teal-500','bg-violet-500','bg-orange-500','bg-pink-500','bg-blue-500','bg-emerald-500','bg-rose-400','bg-amber-500']
function avatarColor(str='') { let h=0; for(const c of str) h=(h*31+c.charCodeAt(0))&0xffff; return AVATAR_COLORS[h%AVATAR_COLORS.length] }
function initials(name='') { return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?' }

// ── Add Resident Modal ────────────────────────────────────────────────────────
function AddResidentModal({ onClose }) {
  const qc = useQueryClient()

  // Step 1 — form state: building stores { id, name }, flat_number from dropdown
  const [form, setForm] = useState({
    full_name: '', email: '', mobile: '', type: 'owner',
    buildingId: '',    // UUID — used only to fetch flats
    buildingName: '',  // NAME — sent in POST body
    flat_number: '',   // from flat dropdown
    family_members: 1, vehicles: 0,
  })
  const [errors, setErrors] = useState({})

  // Step 1 — load buildings when modal opens
  const { data: buildingsData, isLoading: loadingBuildings } = useQuery({
    queryKey: ['modal-buildings'],
    queryFn: () => societyService.getBuildings().then(r => r.data?.results ?? r.data ?? []),
    staleTime: 300_000,
  })
  const buildings = buildingsData ?? []

  // Step 2 — load flats when building is selected
  const { data: flatsData, isLoading: loadingFlats } = useQuery({
    queryKey: ['modal-flats', form.buildingId],
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
    mutationFn: (data) => societyService.addResident(data),
    onSuccess: (res) => {
      const otp = res?.data?.data?.default_otp
      toast.success(otp ? `Resident added. Default OTP: ${otp}` : 'Resident added successfully')
      qc.invalidateQueries({ queryKey: ['society-residents'] })
      qc.invalidateQueries({ queryKey: ['resident-stats'] })
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

  function validate() {
    const next = {}
    if (!form.full_name.trim())  next.full_name  = 'Full name is required'
    if (!form.mobile.trim())     next.mobile     = 'Mobile is required'
    if (!form.buildingName)      next.buildingId = 'Building is required'
    if (!form.flat_number)       next.flat_number = 'Flat is required'
    return next
  }

  function submit(e) {
    e.preventDefault()
    const errs = validate(); setErrors(errs)
    if (Object.keys(errs).length) return
    // Step 3 — send building NAME (not UUID)
    mut.mutate({
      full_name:      form.full_name.trim(),
      mobile:         form.mobile.trim(),
      type:           form.type,
      building:       form.buildingName,   // ← NAME per API spec
      flat_number:    form.flat_number,
      family_members: Number(form.family_members),
      vehicles:       Number(form.vehicles),
      ...(form.email && { email: form.email.trim().toLowerCase() }),
    })
  }

  const inputCls = 'w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 disabled:opacity-50'
  const labelCls = 'text-xs font-medium text-muted-foreground block mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl">
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h3 className="font-bold text-foreground text-lg">Add Resident</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Register a new owner or tenant in the society.</p>
          </div>
          <button onClick={onClose} className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5"/>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 space-y-4">
          {/* Full Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Full name</label>
              <input value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))} placeholder="Aarav Sharma" className={inputCls}/>
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="aarav@email.com" className={inputCls}/>
            </div>
          </div>

          {/* Phone + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" value={form.mobile} onChange={e=>setForm(p=>({...p,mobile:e.target.value}))} placeholder="+91 90000 00000" className={inputCls}/>
              {errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile}</p>}
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className={inputCls}>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </select>
            </div>
          </div>

          {/* Step 1 — Building dropdown */}
          <div>
            <label className={labelCls}>Building</label>
            <select value={form.buildingId} onChange={handleBuildingChange} className={inputCls} disabled={loadingBuildings}>
              <option value="">{loadingBuildings ? 'Loading buildings…' : 'Select building'}</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.buildingId && <p className="text-xs text-destructive mt-1">{errors.buildingId}</p>}
          </div>

          {/* Step 2 — Flat dropdown (loads after building selected) */}
          <div>
            <label className={labelCls}>Flat Number</label>
            <select
              value={form.flat_number}
              onChange={e => setForm(p => ({ ...p, flat_number: e.target.value }))}
              disabled={!form.buildingId || loadingFlats}
              className={inputCls}
            >
              <option value="">
                {!form.buildingId ? 'Select building first' : loadingFlats ? 'Loading flats…' : flats.length === 0 ? 'No flats found' : 'Select flat'}
              </option>
              {flats.map(f => (
                <option key={f.id} value={f.flat_number}>
                  {f.flat_number}
                </option>
              ))}
            </select>
            {errors.flat_number && <p className="text-xs text-destructive mt-1">{errors.flat_number}</p>}
          </div>

          {/* Family + Vehicles */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Family members</label>
              <input type="number" min="0" value={form.family_members} onChange={e=>setForm(p=>({...p,family_members:e.target.value}))} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Vehicles</label>
              <input type="number" min="0" value={form.vehicles} onChange={e=>setForm(p=>({...p,vehicles:e.target.value}))} className={inputCls}/>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {mut.isPending ? 'Adding…' : 'Add Resident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

export default function SocietyResidents() {
  const society = useSelector(selectSociety)
  const qc      = useQueryClient()
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [typeFilter, setTypeFilter]   = useState('')
  const [buildingFilter, setBuildingFilter] = useState('')
  const [statusFilter, setStatusFilter]     = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['society-residents'] })
    qc.invalidateQueries({ queryKey: ['resident-stats'] })
  }

  const approveMut    = useMutation({ mutationFn: (id) => societyService.approveResident2(id),    onSuccess: ()=>{ toast.success('Resident approved'); invalidate() }, onError: (e)=>toast.error(getErrorMessage(e)) })
  const rejectMut     = useMutation({ mutationFn: (id) => societyService.rejectResident2(id),     onSuccess: ()=>{ toast.success('Resident rejected'); invalidate() }, onError: (e)=>toast.error(getErrorMessage(e)) })
  const deactivateMut = useMutation({ mutationFn: (id) => societyService.deactivateResident(id),  onSuccess: ()=>{ toast.success('Resident deactivated'); invalidate() }, onError: (e)=>toast.error(getErrorMessage(e)) })
  const reactivateMut = useMutation({ mutationFn: (id) => societyService.reactivateResident(id),  onSuccess: ()=>{ toast.success('Resident reactivated'); invalidate() }, onError: (e)=>toast.error(getErrorMessage(e)) })

  useEffect(() => {
    const t = setTimeout(()=>setDebSearch(search), 300)
    return ()=>clearTimeout(t)
  }, [search])

  // Stats
  const { data: statsRaw } = useQuery({
    queryKey: ['resident-stats'],
    queryFn: () => societyService.getResidentStats().then(r=>r.data?.data??r.data),
    staleTime: 30_000,
  })
  const stats = statsRaw ?? {}

  // Buildings for filter dropdown — derived from resident data (no extra API call needed)
  // Residents list — API only supports ?status and ?search server-side
  // resident_type and building are filtered CLIENT-SIDE
  const { data, isLoading } = useQuery({
    queryKey: ['society-residents', debSearch, statusFilter],
    queryFn: () => societyService.getResidents({
      page_size: 200,                                    // fetch all to allow client filtering
      ...(debSearch    && { search:  debSearch }),
      ...(statusFilter && { status:  statusFilter }),
    }).then(r => r.data),
    staleTime: 30_000,
  })

  const allResidents = data?.results ?? []

  // Client-side filters for type and building (not supported by API)
  const filtered = allResidents.filter(r => {
    const typeOk     = !typeFilter     || r.resident_type === typeFilter
    const buildingOk = !buildingFilter || (r.building_name || '') === buildingFilter
    return typeOk && buildingOk
  })

  // Pagination client-side
  const total    = filtered.length
  const from     = (page - 1) * PAGE_SIZE
  const residents = filtered.slice(from, from + PAGE_SIZE)

  // Unique buildings from data for dropdown
  const buildings = [...new Map(
    allResidents
      .filter(r => r.building_name)
      .map(r => [r.building_name, { id: r.building_name, name: r.building_name }])
  ).values()]
  const pages = Math.ceil(total / PAGE_SIZE)
  const fromDisplay = from + 1
  const toDisplay   = Math.min(from + PAGE_SIZE, total)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Residents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total ?? total} registered across {buildings.length || '—'} buildings
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>toast.info('Export started')} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4"/> Export
          </button>
          <button onClick={()=>setShowAdd(true)} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4"/> Add Resident
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label:'Total Residents', value:stats.total??total,   border:'border-border',    bg:'bg-card',       color:'text-foreground' },
          { label:'Active',          value:stats.active??'—',    border:'border-teal-100',  bg:'bg-teal-50',    color:'text-teal-600' },
          { label:'Owners',          value:stats.owners??'—',    border:'border-blue-100',  bg:'bg-blue-50',    color:'text-blue-600' },
          { label:'Tenants',         value:stats.tenants??'—',   border:'border-violet-100',bg:'bg-violet-50',  color:'text-violet-600' },
        ].map(({ label,value,border,bg,color }) => (
          <div key={label} className={`rounded-2xl border ${border} ${bg} px-5 py-4`}>
            <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
              placeholder="Search by name, flat or email…"
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring/30"/>
          </div>

          {/* Type filter */}
          <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1)}}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
            <option value="">All Types</option>
            <option value="owner">Owner</option>
            <option value="tenant">Tenant</option>
          </select>

          {/* Building filter */}
          <select value={buildingFilter} onChange={e=>{setBuildingFilter(e.target.value);setPage(1)}}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
            <option value="">All Buildings</option>
            {buildings.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}
          </select>

          {/* Status filter */}
          <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>

          <button className="flex items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors">
            <SlidersHorizontal className="h-4 w-4"/> More filters
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Resident</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Flat & Building</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Family</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Vehicles</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium hidden xl:table-cell">Joined</th>
                <th className="w-10 px-4 py-3"></th>
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
                          <div className="h-2.5 w-36 rounded bg-muted animate-pulse"/>
                        </div>
                      </div>
                    </td>
                    {[...Array(6)].map((_,j)=>(
                      <td key={j} className="px-4 py-3 hidden sm:table-cell">
                        <div className="h-3 w-16 rounded bg-muted animate-pulse"/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : residents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2"/>
                    <p className="text-sm text-muted-foreground">No residents found</p>
                  </td>
                </tr>
              ) : residents.map((r) => {
                const name  = r.full_name || 'Unknown'
                const color = avatarColor(name)
                const flat  = r.flat_display || r.flat_number || '—'
                const bld   = r.building_name || ''
                const type  = r.resident_type || 'owner'
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
                          {initials(name)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground leading-tight">{name}</div>
                          <div className="text-xs text-muted-foreground">{r.email || r.mobile}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="font-mono text-xs font-semibold text-foreground">{flat}</div>
                      {bld && <div className="text-xs text-muted-foreground">{bld}</div>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${type==='owner' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-violet-50 text-violet-700 border border-violet-200'}`}>
                        {type.charAt(0).toUpperCase()+type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-sm text-foreground">
                        <Users className="h-3.5 w-3.5 text-muted-foreground"/> {r.family_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-sm text-foreground">
                        <Car className="h-3.5 w-3.5 text-muted-foreground"/> {r.vehicle_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status}/>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-sm text-muted-foreground">
                      {formatDate(r.joined_at)}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground"/>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.status === 'pending' && <>
                            <DropdownMenuItem onClick={()=>approveMut.mutate(r.id)}>
                              <CheckCircle className="h-3.5 w-3.5 mr-2 text-teal-500"/> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive"
                              onClick={()=>{ if(window.confirm(`Reject ${r.full_name}?`)) rejectMut.mutate(r.id) }}>
                              <XCircle className="h-3.5 w-3.5 mr-2"/> Reject
                            </DropdownMenuItem>
                          </>}
                          {r.status === 'active' && <>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem className="text-destructive focus:text-destructive"
                              onClick={()=>{ if(window.confirm(`Deactivate ${r.full_name}?`)) deactivateMut.mutate(r.id) }}>
                              <PowerOff className="h-3.5 w-3.5 mr-2"/> Deactivate
                            </DropdownMenuItem>
                          </>}
                          {r.status === 'inactive' && <>
                            <DropdownMenuItem onClick={()=>reactivateMut.mutate(r.id)}>
                              <RotateCcw className="h-3.5 w-3.5 mr-2 text-teal-500"/> Reactivate
                            </DropdownMenuItem>
                          </>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Showing <strong>{fromDisplay}–{toDisplay}</strong> of <strong>{total}</strong> residents
            </p>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronLeft className="h-4 w-4"/>
              </button>
              {Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(n=>(
                <button key={n} onClick={()=>setPage(n)}
                  className={`rounded-lg min-w-[32px] h-8 text-xs font-medium transition-colors ${page===n ? 'bg-teal-500 text-white' : 'border border-border hover:bg-muted'}`}>
                  {n}
                </button>
              ))}
              {pages > 5 && <span className="text-muted-foreground text-xs px-1">…</span>}
              {pages > 5 && (
                <button onClick={()=>setPage(pages)}
                  className={`rounded-lg min-w-[32px] h-8 text-xs font-medium border border-border hover:bg-muted transition-colors ${page===pages?'bg-teal-500 text-white':''}`}>
                  {pages}
                </button>
              )}
              <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages||pages===0}
                className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronRight className="h-4 w-4"/>
              </button>
            </div>
          </div>
        )}
      </div>

      {showAdd && <AddResidentModal onClose={()=>setShowAdd(false)}/>}
    </div>
  )
}

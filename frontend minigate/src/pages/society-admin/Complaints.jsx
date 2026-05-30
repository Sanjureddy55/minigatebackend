import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download, Plus, Search, X, ChevronLeft, ChevronRight,
  Filter, MessageSquareWarning, CheckCircle2, XCircle,
  ArrowRight, Clock, AlertTriangle, User,
} from 'lucide-react'
import { toast } from 'sonner'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

// ── Badge helpers ─────────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  low:    { cls: 'bg-gray-100 text-gray-600 border-gray-200',   label: 'Low' },
  medium: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Medium' },
  high:   { cls: 'bg-red-50  text-red-600   border-red-200',    label: 'High' },
  urgent: { cls: 'bg-red-100 text-red-700   border-red-300',    label: 'Urgent' },
}
const STATUS_CFG = {
  open:        { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending'   },
  in_progress: { cls: 'bg-blue-50  text-blue-700  border-blue-200',  label: 'In Review' },
  resolved:    { cls: 'bg-green-50 text-green-700 border-green-200', label: 'Approved'  },
  closed:      { cls: 'bg-gray-100 text-gray-500  border-gray-200',  label: 'Closed'    },
}

function PriorityBadge({ priority }) {
  const { cls, label } = PRIORITY_CFG[priority] ?? PRIORITY_CFG.medium
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
}
function StatusBadge({ status, display }) {
  const { cls, label } = STATUS_CFG[status] ?? STATUS_CFG.closed
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{display || label}</span>
}
function cap(s = '') { return s.charAt(0).toUpperCase() + s.slice(1) }

// ── Log Complaint Modal ───────────────────────────────────────────────────────
function LogComplaintModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    buildingId:       '',   // UUID — for fetching flats
    buildingName:     '',   // name — for filtering residents
    flat_number:      '',   // sent to API
    resident_mobile:  '',   // auto-filled from selected resident
    residentId:       '',   // resident profile id (for dropdown display)
    title:            '',
    description:      '',
    category:         'maintenance',
    priority:         'medium',
    assign_to:        '',
  })
  const [errors, setErrors] = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Step 1: Load all buildings for this society ───────────────────────────
  const { data: buildingsData, isLoading: loadingBuildings } = useQuery({
    queryKey: ['log-complaint-buildings'],
    queryFn:  () => societyService.getBuildings().then(r => r.data?.results ?? r.data ?? []),
    staleTime: 300_000,
  })
  const buildings = buildingsData ?? []

  // ── Step 2: Load flats when building is selected ──────────────────────────
  const { data: flatsData, isLoading: loadingFlats } = useQuery({
    queryKey: ['log-complaint-flats', form.buildingId],
    queryFn:  () => societyService.getFlats({ building: form.buildingId })
                     .then(r => r.data?.results ?? r.data ?? []),
    enabled:  !!form.buildingId,
    staleTime: 60_000,
  })
  const flats = flatsData ?? []

  // ── Step 3: Load residents for selected tower (filtered client-side by flat) ─
  // Fetches all active residents of the society; client-filters by building + flat
  const { data: residentsData, isLoading: loadingResidents } = useQuery({
    queryKey: ['log-complaint-residents', form.buildingId],
    queryFn:  () => societyService.getResidents({ status: 'active', page_size: 500 })
                     .then(r => r.data?.results ?? r.data ?? []),
    enabled:  !!form.buildingId,
    staleTime: 60_000,
  })

  // Filter residents: first by building, then by flat if one is selected
  const allResidents = residentsData ?? []
  const residentsByBuilding = allResidents.filter(
    r => (r.building_name || '').toLowerCase() === form.buildingName.toLowerCase()
  )
  const residentsByFlat = form.flat_number
    ? residentsByBuilding.filter(r => r.flat_number === form.flat_number)
    : residentsByBuilding

  // ── Support staff for auto-assign ─────────────────────────────────────────
  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ['support-staff-list'],
    queryFn:  () => societyService.getStaffAccounts({ role: 'support-staff', status: 'active' })
                     .then(r => r.data?.results ?? r.data ?? []),
    staleTime: 120_000,
  })
  const supportStaff = staffData ?? []

  function handleBuildingChange(e) {
    const id  = e.target.value
    const bld = buildings.find(b => b.id === id)
    setForm(p => ({ ...p, buildingId: id, buildingName: bld?.name ?? '', flat_number: '', resident_mobile: '', residentId: '' }))
  }

  function handleFlatChange(e) {
    const flatNum = e.target.value
    setForm(p => ({ ...p, flat_number: flatNum, resident_mobile: '', residentId: '' }))
  }

  function handleResidentChange(e) {
    const id = e.target.value
    const resident = residentsByFlat.find(r => String(r.id) === id)
    setForm(p => ({
      ...p,
      residentId:      id,
      resident_mobile: resident?.mobile ?? '',
    }))
  }

  // ── Log then auto-assign ──────────────────────────────────────────────────
  const assignMut = useMutation({
    mutationFn: ({ complaintId, staffId }) =>
      societyService.assignComplaint(complaintId, { assigned_to: staffId }),
    onSuccess: () => toast.success('Complaint assigned to support staff'),
    onError:   () => toast.error('Complaint logged but auto-assign failed'),
  })

  const logMut = useMutation({
    mutationFn: (data) => societyService.logComplaint(data),
    onSuccess: (res) => {
      const complaintId = res.data?.data?.id
      qc.invalidateQueries({ queryKey: ['society-complaints'] })
      qc.invalidateQueries({ queryKey: ['complaint-stats'] })
      if (complaintId && form.assign_to) {
        assignMut.mutate({ complaintId, staffId: Number(form.assign_to) })
      } else {
        toast.success('Complaint logged successfully')
      }
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

  function submit(e) {
    e.preventDefault()
    const er = {}
    if (!form.buildingId)             er.buildingId     = 'Select a tower'
    if (!form.flat_number)            er.flat_number    = 'Select a flat'
    if (!form.resident_mobile.trim()) er.residentId     = 'Select a resident'
    if (!form.title.trim())           er.title          = 'Required'
    if (!form.description.trim())     er.description    = 'Required'
    setErrors(er)
    if (Object.keys(er).length) return

    logMut.mutate({
      flat_number:     form.flat_number,
      resident_mobile: form.resident_mobile.trim(),
      title:           form.title.trim(),
      description:     form.description.trim(),
      category:        form.category,
      priority:        form.priority,
    })
  }

  const ic  = (hasErr) =>
    `w-full rounded-xl border ${hasErr ? 'border-red-400' : 'border-input'} bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 disabled:opacity-50`
  const lc  = 'text-xs font-medium text-muted-foreground block mb-1.5'
  const Err = ({ k }) => errors[k]
    ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>{errors[k]}</p>
    : null

  const isBusy = logMut.isPending || assignMut.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground text-base">Log Complaint</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Log a complaint on behalf of a resident.</p>
          </div>
          <button onClick={onClose}
            className="rounded-full w-7 h-7 border border-border flex items-center justify-center hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">

          {/* ── Step 1: Tower ── */}
          <div>
            <label className={lc}>Tower / Building *</label>
            <select value={form.buildingId} onChange={handleBuildingChange}
              disabled={loadingBuildings} className={ic(errors.buildingId)}>
              <option value="">{loadingBuildings ? 'Loading towers…' : 'Select tower'}</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <Err k="buildingId" />
          </div>

          {/* ── Step 2: Flat (chains from tower) ── */}
          <div>
            <label className={lc}>Flat Number *</label>
            <select value={form.flat_number} onChange={handleFlatChange}
              disabled={!form.buildingId || loadingFlats} className={ic(errors.flat_number)}>
              <option value="">
                {!form.buildingId ? 'Select tower first'
                  : loadingFlats ? 'Loading flats…'
                  : flats.length === 0 ? 'No flats found'
                  : 'Select flat'}
              </option>
              {flats.map(fl => <option key={fl.id} value={fl.flat_number}>{fl.flat_number}</option>)}
            </select>
            <Err k="flat_number" />
          </div>

          {/* ── Step 3: Resident (chains from tower + flat) ── */}
          <div>
            <label className={lc}>Resident *</label>
            <select value={form.residentId} onChange={handleResidentChange}
              disabled={!form.buildingId || loadingResidents} className={ic(errors.residentId)}>
              <option value="">
                {!form.buildingId ? 'Select tower first'
                  : loadingResidents ? 'Loading residents…'
                  : residentsByFlat.length === 0
                    ? (form.flat_number ? 'No resident in this flat' : 'No residents in this tower')
                    : 'Select resident'}
              </option>
              {residentsByFlat.map(r => (
                <option key={r.id} value={r.id}>
                  {r.full_name} — {r.flat_number} ({r.mobile})
                </option>
              ))}
            </select>
            <Err k="residentId" />

            {/* Auto-filled mobile preview */}
            {form.resident_mobile && (
              <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 px-3 py-1.5">
                <User className="h-3 w-3 text-teal-600 shrink-0" />
                <span className="text-xs text-teal-700 font-medium">
                  Mobile auto-filled: <span className="font-mono">{form.resident_mobile}</span>
                </span>
              </div>
            )}
          </div>

          {/* ── Title ── */}
          <div>
            <label className={lc}>Issue Title *</label>
            <input value={form.title} onChange={e => f('title', e.target.value)}
              placeholder="Water leakage in bathroom" className={ic(errors.title)} />
            <Err k="title" />
          </div>

          {/* ── Description ── */}
          <div>
            <label className={lc}>Description *</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)}
              placeholder="Continuous dripping from ceiling pipe since 2 days..."
              rows={3} className={ic(errors.description)} />
            <Err k="description" />
          </div>

          {/* ── Category + Priority ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Category</label>
              <select value={form.category} onChange={e => f('category', e.target.value)} className={ic(false)}>
                {['maintenance','security','noise','parking','cleanliness','amenities','other'].map(c => (
                  <option key={c} value={c}>{cap(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lc}>Priority</label>
              <select value={form.priority} onChange={e => f('priority', e.target.value)} className={ic(false)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* ── Auto-assign to Support Staff ── */}
          <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-semibold text-teal-700">Auto-assign to Support Staff</span>
              <span className="text-xs text-muted-foreground">(optional)</span>
            </div>
            <select
              value={form.assign_to}
              onChange={e => f('assign_to', e.target.value)}
              disabled={loadingStaff}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 disabled:opacity-50"
            >
              <option value="">
                {loadingStaff
                  ? 'Loading support staff…'
                  : supportStaff.length === 0
                    ? 'No support staff in this society'
                    : '— Skip assignment —'}
              </option>
              {supportStaff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name}  {s.mobile ? `(${s.mobile})` : ''}
                </option>
              ))}
            </select>
            {form.assign_to && (
              <p className="text-xs text-teal-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Complaint will be automatically assigned and moved to &ldquo;In Review&rdquo;
              </p>
            )}
          </div>

          {/* ── Buttons ── */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isBusy}
              className="flex-1 btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {isBusy ? 'Logging…' : form.assign_to ? 'Log & Assign' : 'Log Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Detail / Action Modal ─────────────────────────────────────────────────────
function DetailModal({ complaint: c, onClose }) {
  const qc = useQueryClient()
  const [resolveNote, setResolveNote] = useState('')
  const [noteErr, setNoteErr] = useState('')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['society-complaints'] })
    qc.invalidateQueries({ queryKey: ['complaint-stats'] })
  }

  // Move to In Review — no body needed
  const inProgressMut = useMutation({
    mutationFn: () => societyService.moveComplaintInProgress(c.id),
    onSuccess: () => { toast.success('Moved to In Review'); invalidate(); onClose() },
    onError:   e  => toast.error(getErrorMessage(e)),
  })

  // Resolve — pass notes via mutate(notes)
  const resolveMut = useMutation({
    mutationFn: (notes) => societyService.resolveComplaint(c.id, { resolution_notes: notes }),
    onSuccess: () => { toast.success('Complaint resolved'); invalidate(); onClose() },
    onError:   e  => {
      const msg = e.response?.data?.resolution_notes?.[0]
             || e.response?.data?.detail
             || getErrorMessage(e)
      toast.error(msg)
    },
  })

  // Close — no body needed
  const closeMut = useMutation({
    mutationFn: () => societyService.closeComplaint(c.id),
    onSuccess: () => { toast.success('Complaint closed'); invalidate(); onClose() },
    onError:   e  => toast.error(getErrorMessage(e)),
  })

  function handleResolve() {
    if (!resolveNote.trim()) { setNoteErr('Resolution notes are required'); return }
    setNoteErr('')
    resolveMut.mutate(resolveNote.trim())   // ← pass notes directly to mutationFn
  }

  const priorCfg  = PRIORITY_CFG[c.priority]  ?? PRIORITY_CFG.medium
  const statusCfg = STATUS_CFG[c.status]      ?? STATUS_CFG.closed

  const isOpen       = c.status === 'open'
  const isInProgress = c.status === 'in_progress'
  const isResolved   = c.status === 'resolved'
  const isClosed     = c.status === 'closed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                  {c.complaint_number}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorCfg.cls}`}>
                  {c.priority_display || priorCfg.label}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.cls}`}>
                  {c.status_display || statusCfg.label}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground leading-tight">{c.title}</h3>
            </div>
            <button onClick={onClose}
              className="shrink-0 rounded-full w-8 h-8 border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* ── Description ── */}
          {c.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground leading-relaxed">{c.description}</p>
            </div>
          )}

          {/* ── Meta grid ── */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              { label: 'Resident', value: c.resident_name || '—' },
              { label: 'Flat',     value: c.flat_display || c.flat_number || '—' },
              { label: 'Category', value: c.category_display || cap(c.category || '') },
              { label: 'Raised',   value: c.raised_display || '—' },
              ...(c.assigned_to_name ? [{ label: 'Assigned To', value: c.assigned_to_name }] : []),
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {/* ── Existing resolution notes (if any) ── */}
          {c.resolution_notes && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3">
              <p className="text-xs font-medium text-green-700 mb-1">Resolution Notes</p>
              <p className="text-sm text-green-800">{c.resolution_notes}</p>
            </div>
          )}

          {/* ── Divider ── */}
          {!isClosed && <div className="border-t border-border" />}

          {/* ── ACTION SECTION ── */}

          {/* OPEN: can move to In Review OR resolve directly */}
          {isOpen && (
            <>
              <button
                onClick={() => inProgressMut.mutate()}
                disabled={inProgressMut.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 py-2.5 text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60"
              >
                <ArrowRight className="h-4 w-4" />
                {inProgressMut.isPending ? 'Moving…' : 'Move to In Review'}
              </button>

              {/* Resolve section */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  — Or resolve directly —
                </p>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Resolution Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={resolveNote}
                    onChange={e => { setResolveNote(e.target.value); setNoteErr('') }}
                    rows={3}
                    placeholder="Describe how the issue was resolved..."
                    className={`w-full rounded-xl border ${noteErr ? 'border-red-400' : 'border-input'} bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30`}
                  />
                  {noteErr && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {noteErr}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleResolve}
                  disabled={resolveMut.isPending}
                  className="w-full btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {resolveMut.isPending ? 'Resolving…' : 'Confirm Resolve'}
                </button>
              </div>
            </>
          )}

          {/* IN PROGRESS: can resolve */}
          {isInProgress && (
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Resolution Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={resolveNote}
                  onChange={e => { setResolveNote(e.target.value); setNoteErr('') }}
                  rows={3}
                  placeholder="Describe how the issue was resolved..."
                  className={`w-full rounded-xl border ${noteErr ? 'border-red-400' : 'border-input'} bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30`}
                />
                {noteErr && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {noteErr}
                  </p>
                )}
              </div>
              <button
                onClick={handleResolve}
                disabled={resolveMut.isPending}
                className="w-full btn-teal rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {resolveMut.isPending ? 'Resolving…' : 'Confirm Resolve'}
              </button>
            </div>
          )}

          {/* RESOLVED: can close */}
          {isResolved && (
            <button
              onClick={() => closeMut.mutate()}
              disabled={closeMut.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
            >
              <XCircle className="h-4 w-4 text-muted-foreground" />
              {closeMut.isPending ? 'Closing…' : 'Close Complaint'}
            </button>
          )}

          {/* CLOSED: nothing more to do */}
          {isClosed && (
            <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
              <p className="text-sm text-muted-foreground">This complaint has been closed.</p>
            </div>
          )}

          {/* Always show dismiss */}
          <button onClick={onClose}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

export default function SocietyComplaints() {
  const qc = useQueryClient()
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [statusFilter, setStatus] = useState('')
  const [priorityFilter, setPrio] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [showLog, setShowLog]       = useState(false)
  const [selected, setSelected]     = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['complaint-stats'],
    queryFn:  () => societyService.getComplaintStats().then(r => r.data?.data ?? r.data),
    staleTime: 30_000,
  })

  // ── List ───────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['society-complaints', page, debSearch, statusFilter, priorityFilter],
    queryFn:  () => societyService.getComplaints({
      page,
      page_size: PAGE_SIZE,
      ordering:  '-created_at',
      ...(debSearch      && { search:   debSearch }),
      ...(statusFilter   && { status:   statusFilter }),
      ...(priorityFilter && { priority: priorityFilter }),
    }).then(r => r.data),
    staleTime: 30_000,
  })

  const list  = data?.results ?? []
  const total = data?.count   ?? 0
  const pages = Math.ceil(total / PAGE_SIZE)

  const hasFilters = !!(statusFilter || priorityFilter || search)

  const KPI = [
    { label: 'Open',           value: stats?.open         ?? '—', icon: Clock,       iconCls: 'text-amber-500 bg-amber-50'  },
    { label: 'In Progress',    value: stats?.in_progress  ?? '—', icon: ArrowRight,  iconCls: 'text-blue-500  bg-blue-50'   },
    { label: 'Resolved (30d)', value: stats?.resolved_30d ?? '—', icon: CheckCircle2,iconCls: 'text-green-500 bg-green-50'  },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Complaints</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and resolve resident complaints.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => setShowLog(true)}
            className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> Log Complaint
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {KPI.map(({ label, value, icon: Icon, iconCls }) => (
          <div key={label} className="rounded-2xl border border-border bg-card px-6 py-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-3xl font-extrabold text-foreground tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">

        {/* Search + Filter bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search complaints..."
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <button
            onClick={() => setShowFilter(p => !p)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors
              ${showFilter ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-input bg-background hover:bg-muted'}`}
          >
            <Filter className="h-4 w-4" /> Filter
            {hasFilters && <span className="h-2 w-2 rounded-full bg-teal-500" />}
          </button>
        </div>

        {/* Filter row */}
        {showFilter && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
            <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none min-w-[140px]">
              <option value="">All Statuses</option>
              <option value="open">Pending (Open)</option>
              <option value="in_progress">In Review</option>
              <option value="resolved">Approved</option>
              <option value="closed">Closed</option>
            </select>
            <select value={priorityFilter} onChange={e => { setPrio(e.target.value); setPage(1) }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none min-w-[130px]">
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setStatus(''); setPrio(''); setPage(1) }}
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
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground font-medium">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">ISSUE</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">FLAT</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">PRIORITY</th>
                <th className="px-4 py-3 text-left">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-3.5"><div className="h-3 w-16 rounded bg-muted animate-pulse" /></td>
                      <td className="px-4 py-3.5">
                        <div className="h-3 w-48 rounded bg-muted animate-pulse mb-1.5" />
                        <div className="h-2.5 w-28 rounded bg-muted animate-pulse" />
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="h-3 w-16 rounded bg-muted animate-pulse" /></td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-5 w-14 rounded-full bg-muted animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-full bg-muted animate-pulse" /></td>
                    </tr>
                  ))
                : list.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <MessageSquareWarning className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">No complaints found</p>
                        {hasFilters && (
                          <button onClick={() => { setSearch(''); setStatus(''); setPrio(''); setPage(1) }}
                            className="mt-2 text-xs text-teal-600 hover:underline">
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                  : list.map(c => (
                    <tr key={c.id} onClick={() => setSelected(c)}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group">

                      {/* ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                          {c.complaint_number}
                        </span>
                      </td>

                      {/* ISSUE */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-medium text-foreground leading-tight truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {c.category_display || cap(c.category)}
                          {c.resident_name && <> · {c.resident_name}</>}
                        </p>
                      </td>

                      {/* FLAT */}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {c.flat_number || '—'}
                        </p>
                        {c.building_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{c.building_name}</p>
                        )}
                      </td>

                      {/* PRIORITY */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <PriorityBadge priority={c.priority} />
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={c.status} display={c.status_display} />
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
              Showing{' '}
              <strong>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</strong>{' '}
              of <strong>{total}</strong> complaints
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
              {pages > 5 && <span className="text-xs text-muted-foreground px-1">…</span>}
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
                className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showLog  && <LogComplaintModal onClose={() => setShowLog(false)} />}
      {selected && <DetailModal complaint={selected} onClose={() => { setSelected(null) }} />}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Download, Search, SlidersHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'

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
      Vacant
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

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function FlatModal({ flat, buildings, onClose, onSaved }) {
  const isEdit = !!flat
  const [flatNumber,   setFlatNumber]   = useState(flat?.flat_number   ?? '')
  const [buildingName, setBuildingName] = useState(flat?.building_name ?? '')
  const [errors,       setErrors]       = useState({})

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? societyService.updateFlat(flat.id, { flat_number: data.flat_number })
        : societyService.addFlat({ flat_number: data.flat_number, building: data.building }),
    onSuccess: () => {
      toast.success(isEdit ? 'Flat updated' : 'Flat added successfully')
      onSaved?.()
      onClose()
    },
    onError: (err) => {
      const d = err?.response?.data
      if (d && typeof d === 'object') {
        const e = {}
        Object.entries(d).forEach(([k, v]) => { e[k] = Array.isArray(v) ? v[0] : String(v) })
        setErrors(e)
        toast.error(e.flat_number ?? e.building ?? 'Failed to save flat')
      } else {
        toast.error(getErrorMessage(err))
      }
    },
  })

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!flatNumber.trim())       next.flat_number = 'Flat number is required'
    if (!isEdit && !buildingName) next.building    = 'Building is required'
    setErrors(next)
    if (Object.keys(next).length) return
    mutation.mutate({ flat_number: flatNumber.trim(), building: buildingName })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Flat' : 'Add Flat'}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Update the flat number.' : 'Add a new flat to a building.'}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Building — only for new flats */}
          {!isEdit && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Building *</label>
              <select
                value={buildingName}
                onChange={(e) => { setBuildingName(e.target.value); setErrors((p) => ({ ...p, building: '' })) }}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="">{buildings.length === 0 ? 'No buildings yet' : 'Select building'}</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
              {errors.building && <p className="text-xs text-red-500 mt-1">{errors.building}</p>}
            </div>
          )}

          {/* Flat Number */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Flat Number *</label>
            <input
              value={flatNumber}
              onChange={(e) => { setFlatNumber(e.target.value); setErrors((p) => ({ ...p, flat_number: '' })) }}
              placeholder="e.g. A-402"
              autoFocus
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {errors.flat_number && <p className="text-xs text-red-500 mt-1">{errors.flat_number}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || (!isEdit && buildings.length === 0)}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2 text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Flat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SocietyFlats() {
  const qc      = useQueryClient()
  const society = useSelector(selectSociety)

  const [search,         setSearch]         = useState('')
  const [buildingFilter, setBuildingFilter] = useState('all')
  const [modal,          setModal]          = useState(null)   // null | 'add' | { flat }
  const [page,           setPage]           = useState(1)
  const PAGE_SIZE = 20

  // ── Dashboard stat cards ──────────────────────────────────────────────────
  const { data: dashData } = useQuery({
    queryKey: ['flats-dashboard', society?.id],
    queryFn:  () => societyService.getFlatDashboard().then((r) => r.data?.data ?? r.data),
    staleTime: 30_000,
  })

  // ── Buildings for filter ──────────────────────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: ['buildings', society?.id],
    queryFn:  () => societyService.getBuildings({ page_size: 100 }).then((r) => r.data),
    staleTime: 60_000,
  })
  const buildings = buildingsData?.results ?? []

  // ── Flats list ────────────────────────────────────────────────────────────
  const { data: flatsData, isLoading } = useQuery({
    queryKey: ['society-flats', society?.id, search, buildingFilter, page],
    queryFn:  () =>
      societyService.getFlats({
        search:   search         || undefined,
        building: buildingFilter !== 'all' ? buildingFilter : undefined,
        page,
        page_size: PAGE_SIZE,
      }).then((r) => r.data),
    staleTime: 20_000,
  })
  const flats = flatsData?.results ?? []
  const total = flatsData?.count   ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id) => societyService.deleteFlat(id),
    onSuccess: () => {
      toast.success('Flat deleted')
      qc.invalidateQueries({ queryKey: ['society-flats'] })
      qc.invalidateQueries({ queryKey: ['flats-dashboard'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['society-flats'] })
    qc.invalidateQueries({ queryKey: ['flats-dashboard'] })
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flat Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Map flats to owners, tenants and occupants.
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
            <Plus className="h-4 w-4" /> Add Flat
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total"    value={dashData?.total    ?? total} />
          <StatCard label="Occupied" value={dashData?.occupied ?? '—'} />
          <StatCard label="Vacant"   value={dashData?.vacant   ?? '—'} />
        </div>

        {/* ── Search + Filter ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              placeholder="Search flat management..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            value={buildingFilter}
            onChange={(e) => { setBuildingFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none w-full sm:w-44"
          >
            <option value="all">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
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
                  <th className="px-5 py-3 text-left font-medium">Flat</th>
                  <th className="px-5 py-3 text-left font-medium">Building</th>
                  <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Owner</th>
                  <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">Tenant</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>

                {/* Loading */}
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Loading flats…
                    </td>
                  </tr>
                )}

                {/* Empty */}
                {!isLoading && flats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground">
                      No flats found.{' '}
                      <button
                        onClick={() => setModal('add')}
                        className="text-teal-600 underline font-medium"
                      >
                        Add one
                      </button>
                    </td>
                  </tr>
                )}

                {/* Rows */}
                {flats.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      {f.flat_number}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-teal-600">
                      {f.building_name || '—'}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {f.owner
                        ? <span className="text-teal-700 font-medium">{f.owner}</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {f.tenant
                        ? <span className="font-medium text-foreground">{f.tenant}</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ flat: f })}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete flat "${f.flat_number}"?`)) {
                              deleteMut.mutate(f.id)
                            }
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {total > 0 && (
            <div className="border-t border-border px-5 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</strong> of <strong className="text-foreground">{total}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-border px-2.5 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                <span className="font-medium text-foreground">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-border px-2.5 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {(modal === 'add' || modal?.flat) && (
        <FlatModal
          flat={modal?.flat ?? null}
          buildings={buildings}
          onClose={() => setModal(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}

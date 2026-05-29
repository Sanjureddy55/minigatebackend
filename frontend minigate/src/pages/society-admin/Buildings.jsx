import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Building2, Search, Download,
  MoreHorizontal, SlidersHorizontal, X, Layers, Home,
} from 'lucide-react'
import { toast } from 'sonner'
import { societyService } from '../../services/society.service.js'
import { getErrorMessage } from '../../utils/formatters.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// Building Form Modal
// ─────────────────────────────────────────────────────────────────────────────

function BuildingModal({ building, onClose }) {
  const qc     = useQueryClient()
  const isEdit = !!building
  const [name, setName]       = useState(building?.name || '')
  const [floors, setFloors]   = useState(building?.total_floors || '')
  const [fpf, setFpf]         = useState('')
  const [status, setStatus]   = useState(building?.status || 'active')
  const [errors, setErrors]   = useState({})

  const mut = useMutation({
    mutationFn: (data) =>
      isEdit
        ? societyService.updateBuilding(building.id, data)
        : societyService.createBuilding(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Building updated' : 'Building created')
      qc.invalidateQueries({ queryKey: ['buildings-list'] })
      qc.invalidateQueries({ queryKey: ['buildings-dashboard'] })
      onClose()
    },
    onError: (err) => {
      const d = err.response?.data || {}
      const e = {}
      if (d.name) e.name = Array.isArray(d.name) ? d.name[0] : d.name
      if (Object.keys(e).length) setErrors(e)
      else toast.error(getErrorMessage(err))
    },
  })

  const submit = (ev) => {
    ev.preventDefault()
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    const payload = { name: name.trim(), status }
    if (floors) payload.total_floors = Number(floors)
    if (!isEdit && fpf) payload.flats_per_floor = Number(fpf)
    mut.mutate(payload)
  }

  const floorsN = Number(floors) || 0
  const fpfN    = Number(fpf)    || 0
  const preview = !isEdit && floorsN > 0 && fpfN > 0 ? floorsN * fpfN : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-6 py-4">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Building' : 'Add Building'}</h3>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Building Name *
            </label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
              placeholder="e.g. Tower A, Block D"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Floors + Flats per floor */}
          <div className={`grid gap-3 ${!isEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total Floors
              </label>
              <input
                type="number" min="0"
                value={floors}
                onChange={(e) => setFloors(e.target.value)}
                placeholder="e.g. 14"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            {!isEdit && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Flats / Floor
                </label>
                <input
                  type="number" min="0"
                  value={fpf}
                  onChange={(e) => setFpf(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            )}
          </div>

          {/* Auto-generate preview */}
          {preview !== null && (
            <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 dark:border-teal-800 dark:bg-teal-950/30">
              <Home className="h-4 w-4 text-teal-600 shrink-0" />
              <p className="text-sm text-teal-700 dark:text-teal-400">
                <strong>{preview}</strong> flats will be auto-generated
              </p>
            </div>
          )}

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex-1 rounded-xl bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {mut.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Building'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────

function DeleteModal({ building, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-red-500">
          <Trash2 className="h-5 w-5" />
          <h3 className="font-semibold text-foreground">Delete Building</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong className="text-foreground">{building.name}</strong>?
          {building.flat_count > 0 && (
            <span className="block mt-1 font-semibold text-red-500">
              This will also remove {building.flat_count} flat(s).
            </span>
          )}
          This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 text-white py-2 text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Row actions dropdown
// ─────────────────────────────────────────────────────────────────────────────

function RowActions({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-background shadow-lg py-1">
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => { setOpen(false); onDelete() }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function SocietyBuildings() {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [ordering, setOrdering]   = useState('name')
  const [showFilter, setShowFilter] = useState(false)
  const [addOpen, setAddOpen]     = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: dashData } = useQuery({
    queryKey: ['buildings-dashboard'],
    queryFn: () => societyService.getBuildingDashboard().then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['buildings-list', search, statusFilter, ordering],
    queryFn: () =>
      societyService.getBuildings({
        search:    search       || undefined,
        status:    statusFilter || undefined,
        ordering:  ordering     || undefined,
        page_size: 100,
      }).then((r) => r.data),
    staleTime: 30_000,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteMut = useMutation({
    mutationFn: (id) => societyService.deleteBuilding(id),
    onSuccess: () => {
      toast.success('Building deleted')
      qc.invalidateQueries({ queryKey: ['buildings-list'] })
      qc.invalidateQueries({ queryKey: ['buildings-dashboard'] })
      setDeleteItem(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ── Data ───────────────────────────────────────────────────────────────────

  const buildings  = listData?.results ?? listData ?? []
  const totalCount = listData?.count ?? buildings.length

  const stats = dashData ?? {
    buildings: buildings.length,
    floors:    buildings.reduce((s, b) => s + (b.total_floors ?? 0), 0),
    flats:     buildings.reduce((s, b) => s + (b.flat_count   ?? 0), 0),
  }

  const hasFilters = !!search || !!statusFilter

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportCsv = () => {
    const rows = [
      ['Name', 'Society', 'City', 'Floors', 'Flats', 'Status'],
      ...buildings.map((b) => [
        b.name, b.society_name || '', b.city_name || '',
        String(b.total_floors ?? 0), String(b.flat_count ?? 0), b.status_display || b.status,
      ]),
    ]
    const csv  = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = 'buildings.csv'
    a.click()
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Building Management"
        description="Define towers/blocks and their floor plans."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Building
            </button>
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Buildings', value: stats.buildings },
            { label: 'Floors',    value: stats.floors    },
            { label: 'Flats',     value: stats.flats     },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-card px-6 py-5">
              <p className="text-sm text-muted-foreground mb-1">{label}</p>
              <p className="text-4xl font-bold text-foreground tracking-tight">{value ?? 0}</p>
            </div>
          ))}
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Search building management..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              showFilter
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background hover:bg-muted'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>

        {/* ── Expanded filter row ── */}
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
          >
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="name">Name A–Z</option>
              <option value="-name">Name Z–A</option>
              <option value="created_at">Oldest First</option>
              <option value="-created_at">Newest First</option>
            </select>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setStatus('') }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </motion.div>
        )}

        {/* ── Table ── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_44px] border-b border-border bg-muted/20 px-6 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Building</span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Floors</span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Flats</span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</span>
            <span />
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_44px] items-center px-6 py-4 border-b border-border last:border-0 animate-pulse">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
                <div className="h-3.5 w-8 rounded bg-muted" />
                <div className="h-3.5 w-8 rounded bg-muted" />
                <div className="h-6 w-16 rounded-full bg-muted" />
                <div />
              </div>
            ))
          )}

          {/* Empty state */}
          {!isLoading && buildings.length === 0 && (
            <div className="py-20 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-semibold text-foreground">
                {hasFilters ? 'No buildings match your filters' : 'No buildings yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasFilters ? 'Try adjusting your search.' : 'Add your first building to get started.'}
              </p>
              {!hasFilters && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="mt-4 flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors mx-auto"
                >
                  <Plus className="h-4 w-4" /> Add Building
                </button>
              )}
            </div>
          )}

          {/* Rows */}
          {!isLoading && buildings.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_44px] items-center px-6 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              {/* Name */}
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{b.name}</p>
                {b.society_name && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.society_name}</p>
                )}
              </div>

              {/* Floors */}
              <span className="text-sm font-medium text-foreground">{b.total_floors ?? '—'}</span>

              {/* Flats */}
              <span className="text-sm font-medium text-foreground">{b.flat_count ?? 0}</span>

              {/* Status badge */}
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${
                b.status === 'active'
                  ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-400'
                  : 'border-border bg-muted/50 text-muted-foreground'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${b.status === 'active' ? 'bg-teal-500' : 'bg-muted-foreground'}`} />
                {b.status_display || (b.status === 'active' ? 'Active' : 'Inactive')}
              </span>

              {/* Actions */}
              <RowActions
                onEdit={() => setEditItem(b)}
                onDelete={() => setDeleteItem(b)}
              />
            </motion.div>
          ))}

          {/* Footer */}
          {!isLoading && buildings.length > 0 && (
            <div className="border-t border-border px-6 py-2.5 text-xs text-muted-foreground">
              Showing {buildings.length} of {totalCount} buildings
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {addOpen && <BuildingModal onClose={() => setAddOpen(false)} />}
      {editItem && <BuildingModal building={editItem} onClose={() => setEditItem(null)} />}
      {deleteItem && (
        <DeleteModal
          building={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={() => deleteMut.mutate(deleteItem.id)}
          loading={deleteMut.isPending}
        />
      )}
    </>
  )
}

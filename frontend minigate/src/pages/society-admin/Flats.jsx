import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, DoorOpen } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { getErrorMessage } from '../../utils/formatters.js'

function FlatModal({ flat, societyId, buildings, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!flat
  const [form, setForm] = useState({
    flat_number: flat?.flat_number || '',
    floor: flat?.floor || '',
    flat_type: flat?.flat_type || '2bhk',
    building: flat?.building || (buildings[0]?.id || ''),
    society: societyId,
    monthly_rent: flat?.monthly_rent || '',
    maintenance_charge: flat?.maintenance_charge || '',
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? societyService.updateFlat(flat.id, data) : societyService.createFlat(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Flat updated' : 'Flat created')
      qc.invalidateQueries({ queryKey: ['society-flats'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const FLAT_TYPES = ['1rk', '1bhk', '2bhk', '3bhk', '4bhk', 'penthouse', 'duplex', 'studio']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Flat' : 'Add Flat'}</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Flat Number</label>
              <input
                value={form.flat_number} required
                onChange={(e) => setForm((p) => ({ ...p, flat_number: e.target.value }))}
                placeholder="e.g. A-101"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Floor</label>
              <input
                type="number" min="0" value={form.floor}
                onChange={(e) => setForm((p) => ({ ...p, floor: Number(e.target.value) }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
              <select
                value={form.flat_type}
                onChange={(e) => setForm((p) => ({ ...p, flat_type: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {FLAT_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Building</label>
              <select
                value={form.building}
                onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Monthly Rent (₹)</label>
              <input
                type="number" value={form.monthly_rent}
                onChange={(e) => setForm((p) => ({ ...p, monthly_rent: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Maintenance (₹)</label>
              <input
                type="number" value={form.maintenance_charge}
                onChange={(e) => setForm((p) => ({ ...p, maintenance_charge: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
              {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SocietyFlats() {
  const qc = useQueryClient()
  const society = useSelector(selectSociety)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['society-flats', society?.id, page],
    queryFn: () =>
      societyService.getFlats({ society: society?.id, page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const { data: buildingsData } = useQuery({
    queryKey: ['society-buildings', society?.id],
    queryFn: () =>
      societyService.getBuildings({ society: society?.id, page_size: 100 }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => societyService.deleteFlat(id),
    onSuccess: () => { toast.success('Flat deleted'); qc.invalidateQueries({ queryKey: ['society-flats'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const buildings = buildingsData?.results || []

  const columns = [
    {
      header: 'Flat',
      accessor: 'flat_number',
      render: (v) => <span className="font-mono text-xs font-bold">{v}</span>,
    },
    { header: 'Building', accessor: 'building_name', render: (v) => v || '—' },
    { header: 'Floor', accessor: 'floor', render: (v) => v ?? '—' },
    { header: 'Type', accessor: 'flat_type', render: (v) => <span className="uppercase text-xs font-semibold">{v}</span> },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v || 'vacant'} /> },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => setModal({ type: 'edit', flat: row })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { if (window.confirm('Delete this flat?')) deleteMutation.mutate(row.id) }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Flats"
        description="Manage all flats in your society"
        actions={
          <button onClick={() => setModal({ type: 'create' })} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add Flat
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No flats"
        emptyDescription="Add flats to your society."
        emptyIcon={DoorOpen}
        searchable
        searchPlaceholder="Search by flat number…"
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />

      {modal?.type === 'create' && <FlatModal societyId={society?.id} buildings={buildings} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <FlatModal flat={modal.flat} societyId={society?.id} buildings={buildings} onClose={() => setModal(null)} />}
    </div>
  )
}

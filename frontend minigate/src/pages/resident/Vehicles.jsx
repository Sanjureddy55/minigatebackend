import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Car } from 'lucide-react'
import { toast } from 'sonner'
import { residentService } from '../../services/resident.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { EmptyState } from '../../components/shared/EmptyState.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { getErrorMessage } from '../../utils/formatters.js'

function VehicleModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    vehicle_number: '',
    vehicle_type: 'car',
    brand: '',
    model: '',
    color: '',
  })

  const mutation = useMutation({
    mutationFn: (data) => residentService.createVehicle(data),
    onSuccess: () => {
      toast.success('Vehicle registered')
      qc.invalidateQueries({ queryKey: ['resident-vehicles'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const TYPES = ['car', 'bike', 'scooter', 'bicycle', 'truck', 'other']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Register Vehicle</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Vehicle Number</label>
            <input
              value={form.vehicle_number} required
              onChange={(e) => setForm((p) => ({ ...p, vehicle_number: e.target.value.toUpperCase() }))}
              placeholder="e.g. KA 01 AB 1234"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
            <select
              value={form.vehicle_type}
              onChange={(e) => setForm((p) => ({ ...p, vehicle_type: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Brand</label>
              <input
                value={form.brand}
                onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                placeholder="e.g. Toyota"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Color</label>
              <input
                value={form.color}
                onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                placeholder="e.g. White"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
              {mutation.isPending ? 'Saving…' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResidentVehicles() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['resident-vehicles'],
    queryFn: () => residentService.getVehicles().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => residentService.deleteVehicle(id),
    onSuccess: () => { toast.success('Vehicle removed'); qc.invalidateQueries({ queryKey: ['resident-vehicles'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const vehicles = data?.results || data || []

  const typeIcon = (type) => {
    if (type === 'bike' || type === 'scooter') return '🛵'
    if (type === 'bicycle') return '🚲'
    return '🚗'
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="My Vehicles"
        description="Registered vehicles for gate access"
        actions={
          <button onClick={() => setModal(true)} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add Vehicle
          </button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card-premium p-4 space-y-2">
              <div className="shimmer h-4 w-32 rounded bg-muted" />
              <div className="shimmer h-3 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <EmptyState icon={Car} title="No vehicles" description="Register your vehicles for faster gate entry." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vehicles.map((v) => (
            <div key={v.id} className="card-premium p-4 flex items-center gap-3">
              <div className="text-2xl">{typeIcon(v.vehicle_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-mono font-bold text-sm text-foreground">{v.vehicle_number}</p>
                <p className="text-xs text-muted-foreground">
                  {[v.brand, v.model, v.color].filter(Boolean).join(' · ') || v.vehicle_type}
                </p>
                <StatusBadge status={v.status || 'active'} className="mt-1" />
              </div>
              <button
                onClick={() => { if (window.confirm('Remove this vehicle?')) deleteMutation.mutate(v.id) }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && <VehicleModal onClose={() => setModal(false)} />}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { maintenanceService } from '../../services/maintenance.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

export default function MaintenanceMaterials() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ material_name: '', quantity: '', unit: '', purpose: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-materials'],
    queryFn: () => maintenanceService.getMaterials().then((r) => r.data?.results || r.data?.data || []),
  })

  const createMut = useMutation({
    mutationFn: (d) => maintenanceService.createMaterial(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-materials'] })
      setOpen(false)
      setForm({ material_name: '', quantity: '', unit: '', purpose: '' })
    },
  })

  const materials = data || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Materials Request" description="Request materials for tasks" />
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Request
        </button>
      </div>

      {isLoading ? (
        <CardsSkeleton count={3} />
      ) : materials.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No materials requested yet.</p>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {materials.map((m) => (
            <div key={m.id} className="flex items-start justify-between px-5 py-4 gap-4">
              <div>
                <p className="font-medium text-sm">{m.material_name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.quantity} {m.unit} {m.purpose ? `· ${m.purpose}` : ''}
                </p>
              </div>
              <StatusBadge status={m.status || 'pending'} />
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-semibold">Request Materials</h3>
            {[
              { key: 'material_name', label: 'Material Name', placeholder: 'e.g. Pipe fittings' },
              { key: 'quantity', label: 'Quantity', placeholder: 'e.g. 10' },
              { key: 'unit', label: 'Unit', placeholder: 'e.g. pcs' },
              { key: 'purpose', label: 'Purpose', placeholder: 'e.g. Bathroom repair flat 203' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1">{label}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                />
              </div>
            ))}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={() => createMut.mutate(form)}
                disabled={createMut.isPending || !form.material_name}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

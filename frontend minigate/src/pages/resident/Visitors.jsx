import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { residentService } from '../../services/resident.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, formatDateTime, getErrorMessage } from '../../utils/formatters.js'

function VisitorModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    purpose: 'visit',
    expected_arrival: '',
    vehicle_number: '',
  })

  const mutation = useMutation({
    mutationFn: (data) => residentService.createVisitor?.(data),
    onSuccess: () => {
      toast.success('Visitor pre-approved')
      qc.invalidateQueries({ queryKey: ['resident-visitors'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const PURPOSES = ['visit', 'delivery', 'service', 'cab', 'guest', 'other']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Pre-Approve Visitor</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Visitor Name</label>
            <input
              value={form.name} required
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Purpose</label>
              <select
                value={form.purpose}
                onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {PURPOSES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Expected Arrival</label>
            <input
              type="datetime-local" value={form.expected_arrival}
              onChange={(e) => setForm((p) => ({ ...p, expected_arrival: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Vehicle Number (optional)</label>
            <input
              value={form.vehicle_number}
              onChange={(e) => setForm((p) => ({ ...p, vehicle_number: e.target.value }))}
              placeholder="e.g. KA 01 AB 1234"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
              {mutation.isPending ? 'Adding…' : 'Add Visitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResidentVisitors() {
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['resident-visitors', page],
    queryFn: () => residentService.getVisitors({ page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const columns = [
    {
      header: 'Visitor',
      accessor: 'name',
      render: (v, row) => (
        <div>
          <div className="font-medium text-sm">{v || row.visitor_name}</div>
          <div className="text-xs text-muted-foreground">{row.mobile || ''}</div>
        </div>
      ),
    },
    { header: 'Purpose', accessor: 'purpose', render: (v) => <span className="capitalize text-xs">{v || '—'}</span> },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v || 'expected'} /> },
    {
      header: 'Expected',
      accessor: 'expected_arrival',
      render: (v) => v ? formatDateTime(v) : '—',
    },
    {
      header: 'Check-in',
      accessor: 'check_in_time',
      render: (v) => v ? formatDateTime(v) : <span className="text-muted-foreground">—</span>,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Visitors"
        description="Manage your visitor pre-approvals"
        actions={
          <button onClick={() => setModal(true)} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add Visitor
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No visitors"
        emptyDescription="Pre-approve visitors for faster gate entry."
        emptyIcon={UserCheck}
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />
      {modal && <VisitorModal onClose={() => setModal(false)} />}
    </div>
  )
}

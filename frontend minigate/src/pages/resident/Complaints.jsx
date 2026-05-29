import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MessageSquareWarning } from 'lucide-react'
import { toast } from 'sonner'
import { residentService } from '../../services/resident.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, getErrorMessage } from '../../utils/formatters.js'

const CATEGORIES = ['maintenance', 'security', 'noise', 'parking', 'garbage', 'electricity', 'water', 'other']

function ComplaintModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'maintenance',
    priority: 'normal',
  })

  const mutation = useMutation({
    mutationFn: (data) => residentService.createComplaint(data),
    onSuccess: () => {
      toast.success('Complaint submitted')
      qc.invalidateQueries({ queryKey: ['resident-complaints'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">File a Complaint</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Subject</label>
            <input
              value={form.title} required
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Brief description of the issue"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {['low', 'normal', 'high', 'urgent'].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Details</label>
            <textarea
              value={form.description} required rows={4}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe the issue in detail..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
              {mutation.isPending ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResidentComplaints() {
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const PAGE_SIZE = 10

  const { data, isLoading } = useQuery({
    queryKey: ['resident-complaints', page],
    queryFn: () => residentService.getComplaints({ page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const columns = [
    {
      header: 'Complaint',
      accessor: 'title',
      render: (v, row) => (
        <div>
          <div className="font-medium text-sm">{v || row.subject}</div>
          <div className="text-xs text-muted-foreground capitalize">{row.category || '—'}</div>
        </div>
      ),
    },
    { header: 'Priority', accessor: 'priority', render: (v) => <StatusBadge status={v || 'normal'} /> },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v} /> },
    { header: 'Submitted', accessor: 'created_at', render: (v) => formatDate(v) },
    {
      header: 'Admin Note',
      accessor: 'admin_note',
      render: (v) => v ? <span className="text-xs text-muted-foreground line-clamp-1">{v}</span> : <span className="text-xs text-muted-foreground">—</span>,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="My Complaints"
        description="Track your submitted complaints"
        actions={
          <button onClick={() => setModal(true)} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> File Complaint
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No complaints filed"
        emptyDescription="File a complaint to report an issue."
        emptyIcon={MessageSquareWarning}
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />
      {modal && <ComplaintModal onClose={() => setModal(false)} />}
    </div>
  )
}

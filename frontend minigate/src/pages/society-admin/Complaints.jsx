import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquareWarning } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, getErrorMessage } from '../../utils/formatters.js'

const STATUSES = ['open', 'in_progress', 'resolved', 'closed']

function ComplaintDetailModal({ complaint, onClose }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState(complaint.status)
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: (data) => societyService.updateComplaint(complaint.id, data),
    onSuccess: () => {
      toast.success('Complaint updated')
      qc.invalidateQueries({ queryKey: ['society-complaints'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Complaint Details</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Subject</p>
            <p className="text-sm font-semibold text-foreground">{complaint.title || complaint.subject}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-foreground">{complaint.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Resident</p>
              <p className="font-medium">{complaint.resident_name || complaint.created_by || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Flat</p>
              <p className="font-mono font-semibold">{complaint.flat_number || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <p className="capitalize">{complaint.category || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Submitted</p>
              <p>{formatDate(complaint.created_at)}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Update Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Admin Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note for the resident..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button
              onClick={() => mutation.mutate({ status, admin_note: note })}
              disabled={mutation.isPending}
              className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SocietyComplaints() {
  const society = useSelector(selectSociety)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['society-complaints', society?.id, page, statusFilter],
    queryFn: () =>
      societyService.getComplaints({ society: society?.id, page, page_size: PAGE_SIZE, status: statusFilter || undefined })
        .then((r) => r.data),
  })

  const columns = [
    {
      header: 'Complaint',
      accessor: 'title',
      render: (v, row) => (
        <div>
          <div className="font-medium text-foreground text-sm">{v || row.subject}</div>
          <div className="text-xs text-muted-foreground capitalize">{row.category || 'general'}</div>
        </div>
      ),
    },
    {
      header: 'Resident',
      accessor: 'resident_name',
      render: (v, row) => (
        <div>
          <div className="text-sm">{v || row.created_by || '—'}</div>
          <div className="text-xs font-mono text-muted-foreground">{row.flat_number || ''}</div>
        </div>
      ),
    },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v} /> },
    { header: 'Date', accessor: 'created_at', render: (v) => formatDate(v) },
    {
      header: 'Action',
      key: 'action',
      render: (_, row) => (
        <button
          onClick={() => setSelected(row)}
          className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
        >
          View
        </button>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Complaints"
        description="Manage resident complaints and track resolutions"
        actions={
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        }
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No complaints"
        emptyDescription="No complaints have been filed."
        emptyIcon={MessageSquareWarning}
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />
      {selected && <ComplaintDetailModal complaint={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

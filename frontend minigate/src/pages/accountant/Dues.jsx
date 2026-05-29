import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { accountantService } from '../../services/accountant.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, formatCurrency, getErrorMessage } from '../../utils/formatters.js'

function DueModal({ due, societyId, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!due
  const [form, setForm] = useState({
    title: due?.title || '',
    amount: due?.amount || '',
    due_date: due?.due_date || '',
    due_type: due?.due_type || 'maintenance',
    description: due?.description || '',
    society: societyId,
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? accountantService.updateDue(due.id, data) : accountantService.createDue(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Due updated' : 'Due created')
      qc.invalidateQueries({ queryKey: ['accountant-dues'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Due' : 'Create Due'}</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Title</label>
            <input
              value={form.title} required
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. October Maintenance"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Amount (₹)</label>
              <input
                type="number" min="0" value={form.amount} required
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Due Date</label>
              <input
                type="date" value={form.due_date} required
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
            <select
              value={form.due_type}
              onChange={(e) => setForm((p) => ({ ...p, due_type: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
            >
              {['maintenance', 'water', 'parking', 'amenity', 'special', 'other'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
            <textarea
              value={form.description} rows={2}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
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

export default function AccountantDues() {
  const qc = useQueryClient()
  const society = useSelector(selectSociety)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['accountant-dues', society?.id, page],
    queryFn: () =>
      accountantService.getDues({ society: society?.id, page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const paidMutation = useMutation({
    mutationFn: (id) => accountantService.markDuePaid(id),
    onSuccess: () => { toast.success('Marked as paid'); qc.invalidateQueries({ queryKey: ['accountant-dues'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const reminderMutation = useMutation({
    mutationFn: () => accountantService.sendReminders({ society: society?.id }),
    onSuccess: () => toast.success('Reminders sent'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const columns = [
    {
      header: 'Due',
      accessor: 'title',
      render: (v, row) => (
        <div>
          <div className="font-medium text-sm">{v}</div>
          <div className="text-xs text-muted-foreground capitalize">{row.due_type || ''}</div>
        </div>
      ),
    },
    {
      header: 'Resident',
      accessor: 'resident_name',
      render: (v, row) => (
        <div>
          <div className="text-sm">{v || '—'}</div>
          <div className="text-xs font-mono text-muted-foreground">{row.flat_number || ''}</div>
        </div>
      ),
    },
    { header: 'Amount', accessor: 'amount', render: (v) => <span className="font-semibold">{formatCurrency(v)}</span> },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v} /> },
    { header: 'Due Date', accessor: 'due_date', render: (v) => formatDate(v) },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) =>
        row.status === 'pending' || row.status === 'overdue' ? (
          <button
            onClick={() => paidMutation.mutate(row.id)}
            disabled={paidMutation.isPending}
            className="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/20 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" /> Mark Paid
          </button>
        ) : <span className="text-xs text-muted-foreground capitalize">{row.status}</span>,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dues Management"
        description="Track and manage all resident dues"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => reminderMutation.mutate()}
              disabled={reminderMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Send className="h-4 w-4" /> Send Reminders
            </button>
            <button onClick={() => setModal({ type: 'create' })} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus className="h-4 w-4" /> Create Due
            </button>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No dues"
        emptyDescription="Create dues to track resident payments."
        emptyIcon={AlertCircle}
        searchable
        searchPlaceholder="Search dues..."
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />

      {modal?.type === 'create' && <DueModal societyId={society?.id} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <DueModal due={modal.due} societyId={society?.id} onClose={() => setModal(null)} />}
    </div>
  )
}

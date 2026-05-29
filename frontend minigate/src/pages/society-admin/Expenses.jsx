import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, formatCurrency, getErrorMessage } from '../../utils/formatters.js'

const CATEGORIES = ['maintenance', 'security', 'cleaning', 'electricity', 'water', 'repairs', 'salary', 'events', 'other']

function ExpenseModal({ expense, societyId, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!expense
  const [form, setForm] = useState({
    title: expense?.title || '',
    amount: expense?.amount || '',
    category: expense?.category || 'maintenance',
    description: expense?.description || '',
    expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
    society: societyId,
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? societyService.updateExpense?.(expense.id, data) : societyService.createExpense?.(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Expense updated' : 'Expense added')
      qc.invalidateQueries({ queryKey: ['society-expenses'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Expense' : 'Add Expense'}</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Title</label>
            <input
              value={form.title} required
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
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
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
            <input
              type="date" value={form.expense_date}
              onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
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
              {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SocietyExpenses() {
  const society = useSelector(selectSociety)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['society-expenses', society?.id, page],
    queryFn: () =>
      societyService.getExpenses?.({ society: society?.id, page, page_size: PAGE_SIZE })
        .then((r) => r.data) ?? Promise.resolve({ results: [], count: 0 }),
  })

  const columns = [
    {
      header: 'Expense',
      accessor: 'title',
      render: (v, row) => (
        <div>
          <div className="font-medium text-sm">{v}</div>
          <div className="text-xs text-muted-foreground capitalize">{row.category || '—'}</div>
        </div>
      ),
    },
    { header: 'Amount', accessor: 'amount', render: (v) => <span className="font-semibold">{formatCurrency(v)}</span> },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v || 'draft'} /> },
    { header: 'Date', accessor: 'expense_date', render: (v, row) => formatDate(v || row.created_at) },
    {
      header: 'Action',
      key: 'action',
      render: (_, row) => (
        <button onClick={() => setModal({ type: 'edit', expense: row })} className="text-xs text-primary underline underline-offset-2 hover:text-primary/80">
          Edit
        </button>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and manage society expenses"
        actions={
          <button onClick={() => setModal({ type: 'create' })} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No expenses"
        emptyDescription="Add your first expense record."
        emptyIcon={Receipt}
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />

      {modal?.type === 'create' && <ExpenseModal societyId={society?.id} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <ExpenseModal expense={modal.expense} societyId={society?.id} onClose={() => setModal(null)} />}
    </div>
  )
}

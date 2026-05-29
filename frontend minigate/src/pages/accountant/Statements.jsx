import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Download, Plus, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { accountantService } from '../../services/accountant.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, formatCurrency, downloadBlob, getErrorMessage } from '../../utils/formatters.js'

function GenerateModal({ societyId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    period_start: '',
    period_end: '',
    title: '',
    society: societyId,
  })

  const mutation = useMutation({
    mutationFn: (data) => accountantService.generateStatement(data),
    onSuccess: () => {
      toast.success('Statement generated')
      qc.invalidateQueries({ queryKey: ['accountant-statements'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Generate Statement</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Title</label>
            <input
              value={form.title} required
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. October 2024 Statement"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Period Start</label>
            <input
              type="date" value={form.period_start} required
              onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Period End</label>
            <input
              type="date" value={form.period_end} required
              onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
              {mutation.isPending ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AccountantStatements() {
  const qc = useQueryClient()
  const society = useSelector(selectSociety)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const PAGE_SIZE = 10

  const { data, isLoading } = useQuery({
    queryKey: ['accountant-statements', society?.id, page],
    queryFn: () =>
      accountantService.getStatements({ society: society?.id, page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const publishMutation = useMutation({
    mutationFn: (id) => accountantService.publishStatement(id),
    onSuccess: () => { toast.success('Statement published'); qc.invalidateQueries({ queryKey: ['accountant-statements'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const pdfMutation = useMutation({
    mutationFn: (id) => accountantService.downloadStatementPdf(id),
    onSuccess: (res, id) => downloadBlob(res.data, `statement-${id}.pdf`),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const excelMutation = useMutation({
    mutationFn: (id) => accountantService.exportStatementExcel(id),
    onSuccess: (res, id) => downloadBlob(res.data, `statement-${id}.xlsx`),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const columns = [
    {
      header: 'Statement',
      accessor: 'title',
      render: (v, row) => (
        <div>
          <div className="font-medium text-sm">{v || `Statement #${row.id}`}</div>
          <div className="text-xs text-muted-foreground">{row.period || formatDate(row.created_at)}</div>
        </div>
      ),
    },
    { header: 'Total', accessor: 'total_amount', render: (v) => <span className="font-semibold">{formatCurrency(v || 0)}</span> },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v || 'draft'} /> },
    { header: 'Generated', accessor: 'created_at', render: (v) => formatDate(v) },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex gap-1.5 flex-wrap">
          {row.status === 'draft' && (
            <button
              onClick={() => publishMutation.mutate(row.id)}
              disabled={publishMutation.isPending}
              className="text-xs text-success underline underline-offset-2 hover:text-success/80"
            >
              Publish
            </button>
          )}
          <button
            onClick={() => pdfMutation.mutate(row.id)}
            className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs hover:bg-muted/80 transition-colors"
          >
            <Download className="h-3 w-3" /> PDF
          </button>
          <button
            onClick={() => excelMutation.mutate(row.id)}
            className="flex items-center gap-1 rounded-lg bg-success/10 text-success px-2 py-1 text-xs hover:bg-success/20 transition-colors"
          >
            <Download className="h-3 w-3" /> Excel
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Statements"
        description="Generate and manage monthly financial statements"
        actions={
          <button onClick={() => setModal(true)} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Generate
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No statements"
        emptyDescription="Generate your first statement."
        emptyIcon={FileText}
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />
      {modal && <GenerateModal societyId={society?.id} onClose={() => setModal(false)} />}
    </div>
  )
}

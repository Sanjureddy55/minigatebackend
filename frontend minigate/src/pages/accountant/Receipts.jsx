import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Receipt, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { accountantService } from '../../services/accountant.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { formatDate, formatCurrency, downloadBlob, getErrorMessage } from '../../utils/formatters.js'

export default function AccountantReceipts() {
  const society = useSelector(selectSociety)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['accountant-receipts', society?.id, page],
    queryFn: () =>
      accountantService.getReceipts({ society: society?.id, page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const pdfMutation = useMutation({
    mutationFn: (id) => accountantService.downloadReceiptPdf(id),
    onSuccess: (res, id) => downloadBlob(res.data, `receipt-${id}.pdf`),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const bulkMutation = useMutation({
    mutationFn: () => accountantService.downloadBulkPdf({ society: society?.id }),
    onSuccess: (res) => downloadBlob(res.data, 'receipts-bulk.pdf'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const columns = [
    {
      header: 'Receipt No.',
      accessor: 'receipt_number',
      render: (v) => <span className="font-mono text-xs font-semibold">{v || '—'}</span>,
    },
    {
      header: 'Resident',
      accessor: 'resident_name',
      render: (v, row) => (
        <div>
          <div className="font-medium text-sm">{v || '—'}</div>
          <div className="text-xs font-mono text-muted-foreground">{row.flat_number || ''}</div>
        </div>
      ),
    },
    { header: 'Amount', accessor: 'amount', render: (v) => <span className="font-semibold">{formatCurrency(v)}</span> },
    { header: 'Date', accessor: 'created_at', render: (v) => formatDate(v) },
    {
      header: 'Download',
      key: 'download',
      render: (_, row) => (
        <button
          onClick={() => pdfMutation.mutate(row.id)}
          disabled={pdfMutation.isPending}
          className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs hover:bg-muted/80 transition-colors"
        >
          <Download className="h-3 w-3" /> PDF
        </button>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Receipts"
        description="Payment receipts for all transactions"
        actions={
          <button
            onClick={() => bulkMutation.mutate()}
            disabled={bulkMutation.isPending}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" /> Bulk PDF
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No receipts"
        emptyDescription="Receipts will appear here after payments are recorded."
        emptyIcon={Receipt}
        searchable
        searchPlaceholder="Search receipts..."
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />
    </div>
  )
}

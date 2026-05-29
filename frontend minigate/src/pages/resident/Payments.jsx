import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Wallet, Download } from 'lucide-react'
import { toast } from 'sonner'
import { residentService } from '../../services/resident.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, formatCurrency, downloadBlob, getErrorMessage } from '../../utils/formatters.js'

export default function ResidentPayments() {
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['resident-payments', page],
    queryFn: () => residentService.getPayments({ page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const pdfMutation = useMutation({
    mutationFn: (id) => residentService.downloadStatementPdf(id),
    onSuccess: (res, id) => downloadBlob(res.data, `receipt-${id}.pdf`),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const columns = [
    {
      header: 'Description',
      accessor: 'description',
      render: (v, row) => (
        <div>
          <div className="font-medium text-sm">{v || row.payment_type?.replace('_', ' ') || 'Payment'}</div>
          <div className="text-xs text-muted-foreground capitalize">{row.payment_type?.replace('_', ' ') || ''}</div>
        </div>
      ),
    },
    { header: 'Amount', accessor: 'amount', render: (v) => <span className="font-semibold">{formatCurrency(v)}</span> },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v} /> },
    { header: 'Date', accessor: 'created_at', render: (v) => formatDate(v) },
    { header: 'Mode', accessor: 'payment_mode', render: (v) => <span className="text-xs capitalize text-muted-foreground">{v || '—'}</span> },
    {
      header: 'Receipt',
      key: 'receipt',
      render: (_, row) =>
        row.status === 'paid' ? (
          <button
            onClick={() => pdfMutation.mutate(row.id)}
            disabled={pdfMutation.isPending}
            className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs hover:bg-muted/80 transition-colors"
          >
            <Download className="h-3 w-3" /> PDF
          </button>
        ) : null,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Payments" description="View your payment history and dues" />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No payments"
        emptyDescription="Your payment history will appear here."
        emptyIcon={Wallet}
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />
    </div>
  )
}

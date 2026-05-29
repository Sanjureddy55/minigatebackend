import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FileText, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, formatCurrency, downloadBlob, getErrorMessage } from '../../utils/formatters.js'

export default function SocietyStatements() {
  const society = useSelector(selectSociety)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['society-statements', society?.id, page],
    queryFn: () =>
      societyService.getStatements({ society: society?.id, page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const pdfMutation = useMutation({
    mutationFn: (id) => societyService.downloadStatementPdf(id),
    onSuccess: (res, id) => downloadBlob(res.data, `statement-${id}.pdf`),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const excelMutation = useMutation({
    mutationFn: (id) => societyService.exportStatementExcel(id),
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
      header: 'Download',
      key: 'download',
      render: (_, row) => (
        <div className="flex gap-1.5">
          <button
            onClick={() => pdfMutation.mutate(row.id)}
            disabled={pdfMutation.isPending}
            className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            <Download className="h-3 w-3" /> PDF
          </button>
          <button
            onClick={() => excelMutation.mutate(row.id)}
            disabled={excelMutation.isPending}
            className="flex items-center gap-1 rounded-lg bg-success/10 px-2 py-1 text-xs font-medium text-success hover:bg-success/20 transition-colors"
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
        description="Monthly financial statements for your society"
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No statements"
        emptyDescription="Financial statements will appear here once generated."
        emptyIcon={FileText}
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />
    </div>
  )
}

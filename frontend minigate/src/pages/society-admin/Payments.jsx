import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, formatCurrency } from '../../utils/formatters.js'

export default function SocietyPayments() {
  const society = useSelector(selectSociety)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['society-payments', society?.id, page, statusFilter],
    queryFn: () =>
      societyService.getPayments?.({ society: society?.id, page, page_size: PAGE_SIZE, status: statusFilter || undefined })
        .then((r) => r.data) ?? Promise.resolve({ results: [], count: 0 }),
  })

  const columns = [
    {
      header: 'Resident',
      accessor: 'resident_name',
      render: (v, row) => (
        <div>
          <div className="font-medium text-sm">{v || row.created_by || '—'}</div>
          <div className="text-xs font-mono text-muted-foreground">{row.flat_number || ''}</div>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (v) => <span className="font-semibold">{formatCurrency(v)}</span>,
    },
    {
      header: 'Type',
      accessor: 'payment_type',
      render: (v) => <span className="capitalize text-xs">{(v || 'maintenance').replace('_', ' ')}</span>,
    },
    { header: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v} /> },
    { header: 'Date', accessor: 'created_at', render: (v) => formatDate(v) },
    {
      header: 'Mode',
      accessor: 'payment_mode',
      render: (v) => <span className="text-xs capitalize text-muted-foreground">{v || '—'}</span>,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Payments"
        description="View all payment transactions in your society"
        actions={
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="failed">Failed</option>
          </select>
        }
      />
      <DataTable
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyTitle="No payments"
        emptyDescription="Payment records will appear here."
        emptyIcon={Wallet}
        pagination={data ? { page, pageSize: PAGE_SIZE, total: data.count || 0 } : undefined}
        onPageChange={setPage}
      />
    </div>
  )
}

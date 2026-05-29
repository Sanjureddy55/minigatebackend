import { useQuery, useMutation } from '@tanstack/react-query'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { accountantService } from '../../services/accountant.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'
import { formatCurrency, formatMonthLabel, downloadBlob, getErrorMessage } from '../../utils/formatters.js'
import { TrendingUp, Wallet, AlertCircle } from 'lucide-react'

export default function AccountantReports() {
  const society = useSelector(selectSociety)

  const { data, isLoading } = useQuery({
    queryKey: ['accountant-reports', society?.id],
    queryFn: () =>
      accountantService.getPaymentReports({ society: society?.id }).then((r) => r.data?.data || r.data),
  })

  const csvMutation = useMutation({
    mutationFn: () => accountantService.exportPaymentsCsv({ society: society?.id }),
    onSuccess: (res) => downloadBlob(res.data, 'payment-report.csv'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const tallyMutation = useMutation({
    mutationFn: () => accountantService.exportTallyXml({ society: society?.id }),
    onSuccess: (res) => downloadBlob(res.data, 'tally-export.xml'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const d = data || {}

  const revenueData = (d.monthly_revenue || []).map((item) => ({
    month: formatMonthLabel(item.month || item.label),
    collected: item.collected || item.amount || 0,
    pending: item.pending || 0,
  }))

  const collectionData = (d.collection_rate || []).map((item) => ({
    month: formatMonthLabel(item.month || item.label),
    rate: item.rate || item.percentage || 0,
  }))

  const statCards = [
    {
      title: 'Total Collected (YTD)',
      value: formatCurrency(d.total_collected_ytd || d.total_collected || 0),
      icon: TrendingUp,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(d.total_outstanding || d.pending_amount || 0),
      icon: Wallet,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      title: 'Overdue',
      value: formatCurrency(d.overdue_amount || 0),
      icon: AlertCircle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Reports"
        description="Financial reports and analytics"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => csvMutation.mutate()}
              disabled={csvMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" /> CSV
            </button>
            <button
              onClick={() => tallyMutation.mutate()}
              disabled={tallyMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" /> Tally XML
            </button>
          </div>
        }
      />

      {isLoading ? (
        <CardsSkeleton count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-premium p-5">
          <h3 className="font-semibold text-foreground mb-4">Collections vs Pending</h3>
          {isLoading ? (
            <div className="h-56 shimmer rounded-xl bg-muted" />
          ) : revenueData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="collected" name="Collected" fill="var(--color-teal, #14b8a6)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-premium p-5">
          <h3 className="font-semibold text-foreground mb-4">Collection Rate (%)</h3>
          {isLoading ? (
            <div className="h-56 shimmer rounded-xl bg-muted" />
          ) : collectionData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={collectionData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="rate" name="Collection Rate" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

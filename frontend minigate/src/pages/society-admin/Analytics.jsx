import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'
import { formatCurrency, formatMonthLabel } from '../../utils/formatters.js'
import { TrendingUp, Wallet, Users, MessageSquareWarning } from 'lucide-react'

export default function SocietyAnalytics() {
  const society = useSelector(selectSociety)

  const { data, isLoading } = useQuery({
    queryKey: ['society-analytics', society?.id],
    queryFn: () =>
      societyService.getAnalytics(society?.id).then((r) => r.data?.data || r.data),
  })

  const d = data || {}

  const revenueData = (d.monthly_revenue || d.revenue_trend || []).map((item) => ({
    month: formatMonthLabel(item.month || item.label),
    revenue: item.total || item.revenue || item.amount || 0,
    expenses: item.expenses || 0,
  }))

  const complaintData = (d.complaint_trend || d.monthly_complaints || []).map((item) => ({
    month: formatMonthLabel(item.month || item.label),
    count: item.count || item.total || 0,
  }))

  const summaryCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(d.total_revenue || d.revenue_ytd || 0),
      icon: TrendingUp,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'Outstanding Dues',
      value: formatCurrency(d.outstanding_dues || d.pending_dues || 0),
      icon: Wallet,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      title: 'Active Residents',
      value: d.active_residents ?? d.total_residents ?? '—',
      icon: Users,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Open Complaints',
      value: d.open_complaints ?? '—',
      icon: MessageSquareWarning,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Analytics" description="Society performance overview" />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-premium p-5">
          <h3 className="font-semibold text-foreground mb-4">Revenue vs Expenses</h3>
          {isLoading ? (
            <div className="h-56 shimmer rounded-xl bg-muted" />
          ) : revenueData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="var(--color-teal, #14b8a6)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="var(--destructive, #ef4444)" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-premium p-5">
          <h3 className="font-semibold text-foreground mb-4">Complaints Trend</h3>
          {isLoading ? (
            <div className="h-56 shimmer rounded-xl bg-muted" />
          ) : complaintData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={complaintData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Complaints" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {d.occupancy_rate !== undefined && (
        <div className="card-premium p-5">
          <h3 className="font-semibold text-foreground mb-4">Occupancy Rate</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold gradient-text">{d.occupancy_rate}%</div>
            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-primary transition-all duration-500"
                style={{ width: `${d.occupancy_rate}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

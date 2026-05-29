import { useQuery } from '@tanstack/react-query'
import { Home, Receipt, MessageSquareWarning, UserCheck, Bell } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice.js'
import { residentService } from '../../services/resident.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate, formatCurrency } from '../../utils/formatters.js'

export default function ResidentDashboard() {
  const user = useSelector(selectUser)

  const { data, isLoading } = useQuery({
    queryKey: ['resident-dashboard'],
    queryFn: () => residentService.getDashboard().then((r) => r.data?.data || r.data),
  })

  const d = data || {}

  const statCards = [
    {
      title: 'My Flats',
      value: d.total_flats ?? '—',
      icon: Home,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Pending Dues',
      value: formatCurrency(d.pending_dues || d.total_pending || 0),
      icon: Receipt,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      title: 'Open Complaints',
      value: d.open_complaints ?? '—',
      icon: MessageSquareWarning,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    {
      title: 'Upcoming Visitors',
      value: d.upcoming_visitors ?? '—',
      icon: UserCheck,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(' ')[0] || 'Resident'}`}
        description="Your society dashboard"
      />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Notices */}
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Recent Notices</h3>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="shimmer h-10 rounded-xl bg-muted" />
              ))}
            </div>
          ) : (d.recent_notices || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent notices</p>
          ) : (
            <div className="space-y-2">
              {(d.recent_notices || []).slice(0, 5).map((n, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
                  </div>
                  <StatusBadge status={n.priority || 'normal'} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Recent Payments</h3>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="shimmer h-10 rounded-xl bg-muted" />
              ))}
            </div>
          ) : (d.recent_payments || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent payments</p>
          ) : (
            <div className="space-y-2">
              {(d.recent_payments || []).slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.description || p.payment_type || 'Payment'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

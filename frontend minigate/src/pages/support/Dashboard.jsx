import { useQuery } from '@tanstack/react-query'
import { Ticket, Clock, CheckCircle, ArrowUpCircle } from 'lucide-react'
import { supportService } from '../../services/support.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'

export default function SupportDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['support-dashboard'],
    queryFn: () => supportService.getDashboard().then((r) => r.data?.data || r.data),
  })

  const d = data || {}

  const stats = [
    {
      title: 'Open Tickets',
      value: d.open ?? '—',
      icon: Ticket,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      title: 'In Progress',
      value: d.in_progress ?? '—',
      icon: Clock,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Resolved This Week',
      value: d.resolved_this_week ?? '—',
      icon: CheckCircle,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'Avg Rating',
      value: d.avg_rating != null ? `${d.avg_rating}/5` : '—',
      icon: ArrowUpCircle,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
  ]

  const activeTickets = d.active_tickets || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Support Dashboard" description="Your ticket overview" />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      )}

      {!isLoading && activeTickets.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-sm">Active Tickets</h3>
          </div>
          <div className="divide-y">
            {activeTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.resident_name || ''} {t.flat_number ? `· Flat ${t.flat_number}` : ''}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

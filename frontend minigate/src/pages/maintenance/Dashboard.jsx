import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, ListChecks, CheckCircle, Clock } from 'lucide-react'
import { maintenanceService } from '../../services/maintenance.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'

export default function MaintenanceDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-dashboard'],
    queryFn: () => maintenanceService.getDashboard().then((r) => r.data?.data || r.data),
  })

  const d = data || {}

  const stats = [
    {
      title: 'Open Tasks',
      value: d.open ?? '—',
      icon: ListChecks,
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
      title: 'Done This Week',
      value: d.done_this_week ?? '—',
      icon: CheckCircle,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'Total Assigned',
      value: d.total_assigned ?? '—',
      icon: LayoutDashboard,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
  ]

  const activeTasks = d.active_tasks || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Maintenance Dashboard" description="Your task overview" />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      )}

      {!isLoading && activeTasks.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-sm">Active Tasks</h3>
          </div>
          <div className="divide-y">
            {activeTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.location || 'No location'}</p>
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

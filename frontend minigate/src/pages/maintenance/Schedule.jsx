import { useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import { maintenanceService } from '../../services/maintenance.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

export default function MaintenanceSchedule() {
  const today = new Date().toISOString().slice(0, 10)

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-schedule'],
    queryFn: () => maintenanceService.getSchedule().then((r) => r.data?.results || r.data?.data || []),
  })

  const items = data || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Schedule" description="Your upcoming maintenance schedule" />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Calendar className="h-10 w-10 opacity-30" />
          <p>No scheduled tasks.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {items.map((s) => (
            <div key={s.id} className="flex items-start justify-between px-5 py-4 gap-4">
              <div>
                <p className="font-medium text-sm">{s.title || s.task_title || 'Scheduled Task'}</p>
                <p className="text-xs text-muted-foreground">
                  {s.scheduled_date || s.date || ''}
                  {s.time_slot ? ` · ${s.time_slot}` : ''}
                  {s.location ? ` · ${s.location}` : ''}
                </p>
              </div>
              <StatusBadge status={s.status || 'scheduled'} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { maintenanceService } from '../../services/maintenance.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

export default function MaintenanceHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-history'],
    queryFn: () => maintenanceService.getWorkHistory().then((r) => r.data?.data || r.data),
  })

  const results = data?.results || data || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Work History" description="Your completed maintenance tasks" />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : results.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No completed tasks yet.</p>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {results.map((t) => (
            <div key={t.id} className="flex items-start justify-between px-5 py-4 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{t.title}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : ''}
                  {t.location ? ` · ${t.location}` : ''}
                </p>
                {t.completion_note && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{t.completion_note}"</p>
                )}
              </div>
              {t.hours_logged != null && (
                <p className="text-xs text-muted-foreground shrink-0">{t.hours_logged}h</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

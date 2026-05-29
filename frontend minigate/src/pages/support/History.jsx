import { useQuery } from '@tanstack/react-query'
import { supportService } from '../../services/support.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

export default function SupportHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['support-history'],
    queryFn: () => supportService.getServiceHistory().then((r) => r.data?.data || r.data),
  })

  const results = data?.results || data || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Service History" description="Your resolved support tickets" />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : results.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No resolved tickets yet.</p>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {results.map((t) => (
            <div key={t.id} className="flex items-start justify-between px-5 py-4 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{t.subject}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.resident_name || ''} {t.flat_number ? `· Flat ${t.flat_number}` : ''}
                  {t.resolved_at ? ` · ${new Date(t.resolved_at).toLocaleDateString()}` : ''}
                </p>
                {t.resolution_note && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{t.resolution_note}"</p>
                )}
              </div>
              {t.rating != null && (
                <p className="text-xs text-muted-foreground shrink-0">⭐ {t.rating}/5</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

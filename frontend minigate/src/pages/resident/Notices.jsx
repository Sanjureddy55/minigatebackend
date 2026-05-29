import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { residentService } from '../../services/resident.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { EmptyState } from '../../components/shared/EmptyState.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatDate } from '../../utils/formatters.js'

export default function ResidentNotices() {
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['resident-notices', page],
    queryFn: () => residentService.getNotices({ page, page_size: PAGE_SIZE }).then((r) => r.data),
  })

  const notices = data?.results || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Notices" description="Society announcements and updates" />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card-premium p-4 space-y-2">
              <div className="shimmer h-4 w-48 rounded bg-muted" />
              <div className="shimmer h-3 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <EmptyState icon={Megaphone} title="No notices" description="There are no society notices yet." />
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <div key={n.id} className="card-premium p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-foreground text-sm">{n.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={n.priority || 'normal'} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{n.content}</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Posted by {n.created_by || 'Admin'} · {formatDate(n.created_at)}
              </p>
            </div>
          ))}
          {data?.count > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">{data.count} notices total</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
                >Prev</button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data?.next}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

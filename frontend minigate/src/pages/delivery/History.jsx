import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { deliveryService } from '../../services/delivery.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

export default function DeliveryHistory() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-history', search],
    queryFn: () => deliveryService.getHistory({ search }).then((r) => r.data?.data || r.data),
    keepPreviousData: true,
  })

  const d = data || {}
  const s = d.stats || {}
  const results = d.results || []

  const stats = [
    { title: 'Delivered',    value: s.delivered    ?? '—', icon: CheckCircle, iconBg: 'bg-success/10',     iconColor: 'text-success' },
    { title: 'Failed',       value: s.failed       ?? '—', icon: XCircle,     iconBg: 'bg-destructive/10', iconColor: 'text-destructive' },
    { title: 'Returned',     value: s.returned     ?? '—', icon: RotateCcw,   iconBg: 'bg-warning/10',     iconColor: 'text-warning' },
    { title: 'Success Rate', value: s.success_rate != null ? `${s.success_rate}%` : '—', icon: CheckCircle, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  ]

  const STATUS_ICON = {
    delivered: <CheckCircle className="h-5 w-5 text-success" />,
    failed:    <XCircle     className="h-5 w-5 text-destructive" />,
    returned:  <RotateCcw   className="h-5 w-5 text-warning" />,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Delivery History" description="Past deliveries with outcome and notes" />
        <button className="px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1.5 hover:bg-muted">
          ↓ Export
        </button>
      </div>

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      )}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search resident, item, vendor..."
        className="border rounded-lg px-3 py-2 text-sm bg-background w-full max-w-sm"
      />

      {isLoading ? null : results.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No delivery history.</p>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {results.map(item => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4">
              <div className="mt-0.5 shrink-0">{STATUS_ICON[item.status] || <CheckCircle className="h-5 w-5" />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{item.item_name}</p>
                  <StatusBadge status={item.status} />
                  {item.vendor_name && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.vendor_name}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  📍 {item.resident_name} · Flat {item.flat_number}
                  {item.delivered_at
                    ? ` · 🕐 ${new Date(item.delivered_at).toLocaleDateString()} ${new Date(item.delivered_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`
                    : item.failed_at
                    ? ` · 🕐 ${new Date(item.failed_at).toLocaleDateString()}`
                    : ''}
                  {item.delivery_id ? ` · ${item.delivery_id}` : ''}
                </p>
                {(item.delivery_note || item.failure_reason) && (
                  <p className={`text-xs mt-1 ${item.failure_reason ? 'text-destructive' : 'text-muted-foreground'}`}>
                    Notes: {item.delivery_note || item.failure_reason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Clock, CheckCircle, XCircle, Phone } from 'lucide-react'
import { deliveryService } from '../../services/delivery.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'

export default function DeliveryDashboard() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => deliveryService.getDashboard().then((r) => r.data?.data || r.data),
  })

  const deliveredMut = useMutation({
    mutationFn: (id) => deliveryService.markDelivered(id, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-dashboard'] }),
  })

  const failedMut = useMutation({
    mutationFn: (id) => deliveryService.markFailed(id, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-dashboard'] }),
  })

  const d = data || {}
  const stats_d = d.stats || {}
  const active = d.active_deliveries || []
  const delivered = d.delivered_today || []

  const stats = [
    { title: 'Total Today',  value: stats_d.total_today ?? '—', icon: Package,      iconBg: 'bg-blue-500/10',  iconColor: 'text-blue-500' },
    { title: 'Pending',      value: stats_d.pending     ?? '—', icon: Clock,        iconBg: 'bg-warning/10',   iconColor: 'text-warning' },
    { title: 'Delivered',    value: stats_d.delivered   ?? '—', icon: CheckCircle,  iconBg: 'bg-success/10',   iconColor: 'text-success' },
    { title: 'Failed',       value: stats_d.failed      ?? '—', icon: XCircle,      iconBg: 'bg-destructive/10', iconColor: 'text-destructive' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Delivery Dashboard" description="Today's delivery assignments and status" />
        <button onClick={() => qc.invalidateQueries({ queryKey: ['delivery-dashboard'] })} className="px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1.5 hover:bg-muted">
          ↻ Refresh
        </button>
      </div>

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      )}

      {!isLoading && active.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="font-semibold text-sm">Active Deliveries</h3>
            <a href="/delivery-partner/active-deliveries" className="text-xs text-primary hover:underline">View all →</a>
          </div>
          <div className="divide-y">
            {active.map((item) => (
              <div key={item.id} className="flex items-start justify-between px-5 py-3 gap-4">
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5">
                    {item.status === 'failed' ? <XCircle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-warning" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.item_name}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{item.resident_name} · Flat {item.flat_number}{item.vendor_name ? ` · ${item.vendor_name}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="p-1.5 rounded-full border hover:bg-muted">
                    <Phone className="h-3.5 w-3.5 text-teal-600" />
                  </button>
                  {item.status !== 'failed' && (
                    <>
                      <button
                        onClick={() => deliveredMut.mutate(item.id)}
                        disabled={deliveredMut.isPending}
                        className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700"
                      >
                        Delivered
                      </button>
                      <button
                        onClick={() => failedMut.mutate(item.id)}
                        disabled={failedMut.isPending}
                        className="px-2.5 py-1 rounded-lg border border-destructive text-destructive text-xs font-medium hover:bg-destructive/10"
                      >
                        Failed
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && delivered.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-sm">Delivered Today</h3>
          </div>
          <div className="divide-y">
            {delivered.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex gap-3 items-center">
                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">{item.resident_name} · Flat {item.flat_number} · {item.delivered_at ? new Date(item.delivered_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{item.delivery_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && active.length === 0 && delivered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No deliveries assigned today.</p>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Phone, Package, Truck } from 'lucide-react'
import { deliveryService } from '../../services/delivery.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

const TABS = ['All', 'Pending', 'Out for Delivery', 'Delivered', 'Failed']
const TAB_STATUS = { 'Pending': 'pending', 'Out for Delivery': 'out_for_delivery', 'Delivered': 'delivered', 'Failed': 'failed' }

const STATUS_ICON = {
  pending:          <Package className="h-5 w-5 text-warning" />,
  out_for_delivery: <Truck   className="h-5 w-5 text-blue-500" />,
  delivered:        <span className="h-5 w-5 rounded-full bg-success flex items-center justify-center text-white text-xs">✓</span>,
  failed:           <span className="h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center text-destructive text-xs">✗</span>,
}

export default function ActiveDeliveries() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [failId, setFailId] = useState(null)
  const [failReason, setFailReason] = useState('')

  const params = {}
  if (TAB_STATUS[tab]) params.status = TAB_STATUS[tab]

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', tab],
    queryFn: () => deliveryService.getDeliveries(params).then((r) => r.data?.results || r.data?.data || []),
  })

  const pickupMut = useMutation({
    mutationFn: (id) => deliveryService.pickupDelivery(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliveries'] }),
  })

  const deliveredMut = useMutation({
    mutationFn: (id) => deliveryService.markDelivered(id, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliveries'] }),
  })

  const failedMut = useMutation({
    mutationFn: ({ id, reason }) => deliveryService.markFailed(id, { failure_reason: reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliveries'] }); setFailId(null); setFailReason('') },
  })

  const all = data || []
  const filtered = search
    ? all.filter(d =>
        d.resident_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.flat_number?.toLowerCase().includes(search.toLowerCase()) ||
        d.vendor_name?.toLowerCase().includes(search.toLowerCase())
      )
    : all

  const counts = { All: all.length }
  all.forEach(d => {
    const t = TABS.find(t => TAB_STATUS[t] === d.status)
    if (t) counts[t] = (counts[t] || 0) + 1
  })

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Active Deliveries" description="All parcels assigned to you today" />

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t ? 'bg-teal-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t}{counts[t] != null ? ` ${counts[t]}` : ''}
          </button>
        ))}
        <div className="ml-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resident, flat, vendor..."
            className="border rounded-lg px-3 py-1.5 text-sm bg-background w-56"
          />
        </div>
      </div>

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No deliveries found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className={`rounded-xl border bg-card p-4 ${
                item.status === 'failed' ? 'border-destructive/30 bg-destructive/5' :
                item.status === 'out_for_delivery' ? 'border-blue-200 bg-blue-50/30' :
                item.status === 'delivered' ? 'border-success/30 bg-success/5' :
                'border-warning/30 bg-warning/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5">{STATUS_ICON[item.status] || <Package className="h-5 w-5" />}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{item.item_name}</p>
                      <StatusBadge status={item.status} />
                      {item.vendor_name && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.vendor_name}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      📍 {item.resident_name} · Flat {item.flat_number}
                      {item.time_slot ? ` · 🕐 ${item.time_slot}` : ''}
                      {item.tracking_number ? ` · ${item.tracking_number}` : ''}
                    </p>
                    {item.delivery_note && (
                      <p className="text-xs text-teal-700 mt-1">{item.delivery_note}</p>
                    )}
                    {item.failure_reason && (
                      <p className="text-xs text-destructive mt-1">{item.failure_reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{item.delivery_id}</span>
                  <button className="p-1.5 rounded-full border hover:bg-muted">
                    <Phone className="h-3.5 w-3.5 text-teal-600" />
                  </button>
                  {item.status === 'pending' && (
                    <button
                      onClick={() => pickupMut.mutate(item.id)}
                      disabled={pickupMut.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                    >
                      📦 Pick Up
                    </button>
                  )}
                  {item.status === 'out_for_delivery' && (
                    <>
                      <button
                        onClick={() => deliveredMut.mutate(item.id)}
                        disabled={deliveredMut.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700"
                      >
                        ✓ Delivered
                      </button>
                      <button
                        onClick={() => setFailId(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-destructive text-destructive text-xs font-medium hover:bg-destructive/10"
                      >
                        Failed
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fail modal */}
      {failId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-semibold">Mark Delivery Failed</h3>
            <textarea
              value={failReason}
              onChange={e => setFailReason(e.target.value)}
              placeholder="Reason for failure (e.g. Resident not available)"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-[80px] resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setFailId(null); setFailReason('') }} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Cancel</button>
              <button
                onClick={() => failedMut.mutate({ id: failId, reason: failReason })}
                disabled={failedMut.isPending}
                className="px-4 py-2 rounded-lg text-sm bg-destructive text-white font-medium hover:bg-destructive/90"
              >
                Confirm Failed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

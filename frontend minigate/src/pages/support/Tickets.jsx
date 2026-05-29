import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, CheckCircle } from 'lucide-react'
import { supportService } from '../../services/support.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

export default function SupportTickets() {
  const qc = useQueryClient()
  const [resolveId, setResolveId] = useState(null)
  const [note, setNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => supportService.getTickets().then((r) => r.data?.results || r.data?.data || []),
  })

  const pickupMut = useMutation({
    mutationFn: (id) => supportService.pickupTicket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-tickets'] }),
  })

  const resolveMut = useMutation({
    mutationFn: ({ id, note }) => supportService.resolveTicket(id, { resolution_note: note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
      setResolveId(null)
      setNote('')
    },
  })

  const tickets = data || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Tickets" description="Your assigned support tickets" />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : tickets.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No tickets assigned yet.</p>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-start justify-between px-5 py-4 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{t.subject}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.resident_name || ''} {t.flat_number ? `· Flat ${t.flat_number}` : ''}
                  {t.category_display ? ` · ${t.category_display}` : ''}
                </p>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {t.status === 'open' && (
                  <button
                    onClick={() => pickupMut.mutate(t.id)}
                    disabled={pickupMut.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                  >
                    <UserCheck className="h-3 w-3" /> Pick Up
                  </button>
                )}
                {t.status === 'in_progress' && (
                  <button
                    onClick={() => setResolveId(t.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success text-white text-xs font-medium hover:bg-success/90"
                  >
                    <CheckCircle className="h-3 w-3" /> Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {resolveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-semibold">Resolve Ticket</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Resolution note (optional)"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-[80px] resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setResolveId(null); setNote('') }}
                className="px-4 py-2 rounded-lg text-sm border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMut.mutate({ id: resolveId, note })}
                disabled={resolveMut.isPending}
                className="px-4 py-2 rounded-lg text-sm bg-success text-white font-medium hover:bg-success/90"
              >
                Confirm Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

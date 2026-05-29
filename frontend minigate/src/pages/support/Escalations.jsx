import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { supportService } from '../../services/support.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

export default function SupportEscalations() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ ticket: '', reason: '', notes: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['support-escalations'],
    queryFn: () => supportService.getEscalations().then((r) => r.data?.results || r.data?.data || []),
  })

  const createMut = useMutation({
    mutationFn: (d) => supportService.createEscalation(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-escalations'] })
      setOpen(false)
      setForm({ ticket: '', reason: '', notes: '' })
    },
  })

  const escalations = data || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Escalations" description="Tickets escalated to management" />
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Escalate
        </button>
      </div>

      {isLoading ? (
        <CardsSkeleton count={3} />
      ) : escalations.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No escalations yet.</p>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {escalations.map((e) => (
            <div key={e.id} className="flex items-start justify-between px-5 py-4 gap-4">
              <div>
                <p className="font-medium text-sm">{e.reason || 'Escalation'}</p>
                <p className="text-xs text-muted-foreground">
                  Ticket #{e.ticket_id || e.ticket}
                  {e.created_at ? ` · ${new Date(e.created_at).toLocaleDateString()}` : ''}
                </p>
                {e.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{e.notes}"</p>}
              </div>
              <StatusBadge status={e.status || 'pending'} />
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-semibold">Escalate Ticket</h3>
            <div>
              <label className="block text-xs font-medium mb-1">Ticket ID</label>
              <input
                value={form.ticket}
                onChange={(e) => setForm((f) => ({ ...f, ticket: e.target.value }))}
                placeholder="Enter ticket ID"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Reason</label>
              <input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for escalation"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-[70px] resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={() => createMut.mutate(form)}
                disabled={createMut.isPending || !form.ticket || !form.reason}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

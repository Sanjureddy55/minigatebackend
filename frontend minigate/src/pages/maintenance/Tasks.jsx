import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, CheckCircle } from 'lucide-react'
import { maintenanceService } from '../../services/maintenance.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

export default function MaintenanceTasks() {
  const qc = useQueryClient()
  const [completeId, setCompleteId] = useState(null)
  const [note, setNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-tasks'],
    queryFn: () => maintenanceService.getTasks().then((r) => r.data?.results || r.data?.data || []),
  })

  const startMut = useMutation({
    mutationFn: (id) => maintenanceService.startTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance-tasks'] }),
  })

  const completeMut = useMutation({
    mutationFn: ({ id, note }) => maintenanceService.completeTask(id, { completion_note: note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-tasks'] })
      setCompleteId(null)
      setNote('')
    },
  })

  const tasks = data || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Task Queue" description="Your assigned maintenance tasks" />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : tasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No tasks assigned yet.</p>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-start justify-between px-5 py-4 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{t.title}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{t.location || ''}</p>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {t.status === 'open' && (
                  <button
                    onClick={() => startMut.mutate(t.id)}
                    disabled={startMut.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                  >
                    <Play className="h-3 w-3" /> Start
                  </button>
                )}
                {t.status === 'in_progress' && (
                  <button
                    onClick={() => setCompleteId(t.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success text-white text-xs font-medium hover:bg-success/90"
                  >
                    <CheckCircle className="h-3 w-3" /> Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete modal */}
      {completeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-semibold">Mark Task Complete</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Completion note (optional)"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-[80px] resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setCompleteId(null); setNote('') }}
                className="px-4 py-2 rounded-lg text-sm border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => completeMut.mutate({ id: completeId, note })}
                disabled={completeMut.isPending}
                className="px-4 py-2 rounded-lg text-sm bg-success text-white font-medium hover:bg-success/90"
              >
                Confirm Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

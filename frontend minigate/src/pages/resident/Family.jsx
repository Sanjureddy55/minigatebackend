import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { residentService } from '../../services/resident.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { EmptyState } from '../../components/shared/EmptyState.jsx'
import { getErrorMessage } from '../../utils/formatters.js'

function MemberModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    relation: 'spouse',
    mobile: '',
    dob: '',
  })

  const mutation = useMutation({
    mutationFn: (data) => residentService.createFamilyMember(data),
    onSuccess: () => {
      toast.success('Family member added')
      qc.invalidateQueries({ queryKey: ['resident-family'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const RELATIONS = ['spouse', 'child', 'parent', 'sibling', 'grandparent', 'other']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Add Family Member</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Full Name</label>
            <input
              value={form.name} required
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Relation</label>
              <select
                value={form.relation}
                onChange={(e) => setForm((p) => ({ ...p, relation: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {RELATIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Date of Birth</label>
            <input
              type="date" value={form.dob}
              onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
              {mutation.isPending ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResidentFamily() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['resident-family'],
    queryFn: () => residentService.getFamilyMembers().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => residentService.deleteFamilyMember(id),
    onSuccess: () => { toast.success('Member removed'); qc.invalidateQueries({ queryKey: ['resident-family'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const members = data?.results || data || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Family Members"
        description="Manage your registered family members"
        actions={
          <button onClick={() => setModal(true)} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add Member
          </button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-premium p-4 space-y-2">
              <div className="shimmer h-8 w-8 rounded-full bg-muted" />
              <div className="shimmer h-3 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="No family members" description="Add family members for better gate access management." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <div key={m.id} className="card-premium p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">{(m.name || m.full_name || '?').charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{m.name || m.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{m.relation || '—'}</p>
                {m.mobile && <p className="text-xs text-muted-foreground">{m.mobile}</p>}
              </div>
              <button
                onClick={() => { if (window.confirm('Remove this family member?')) deleteMutation.mutate(m.id) }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && <MemberModal onClose={() => setModal(false)} />}
    </div>
  )
}

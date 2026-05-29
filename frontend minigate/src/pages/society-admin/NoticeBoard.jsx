import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { EmptyState } from '../../components/shared/EmptyState.jsx'
import { formatDate, getErrorMessage } from '../../utils/formatters.js'

const PRIORITIES = ['low', 'normal', 'high', 'urgent']

function NoticeModal({ notice, societyId, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!notice
  const [form, setForm] = useState({
    title: notice?.title || '',
    content: notice?.content || '',
    priority: notice?.priority || 'normal',
    is_published: notice?.is_published ?? notice?.is_active ?? true,
    society: societyId,
    notice_type: notice?.notice_type || 'general',
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? societyService.updateNotice(notice.id, data)
        : societyService.createNotice(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Notice updated' : 'Notice posted')
      qc.invalidateQueries({ queryKey: ['society-notices'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Notice' : 'Post Notice'}</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Title</label>
            <input
              value={form.title} required
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Content</label>
            <textarea
              value={form.content} required rows={4}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
                  className="rounded border-input"
                />
                <span className="text-xs font-medium text-muted-foreground">Published</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-teal rounded-xl py-2 text-sm font-semibold disabled:opacity-60">
              {mutation.isPending ? 'Posting…' : isEdit ? 'Update' : 'Post Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SocietyNoticeBoard() {
  const qc = useQueryClient()
  const society = useSelector(selectSociety)
  const [modal, setModal] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['society-notices', society?.id],
    queryFn: () =>
      societyService.getNotices({ society: society?.id, page_size: 50 }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => societyService.deleteNotice(id),
    onSuccess: () => { toast.success('Notice deleted'); qc.invalidateQueries({ queryKey: ['society-notices'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const notices = data?.results || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Notice Board"
        description="Post and manage notices for residents"
        actions={
          <button onClick={() => setModal({ type: 'create' })} className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Post Notice
          </button>
        }
      />

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
        <EmptyState icon={Megaphone} title="No notices posted" description="Post your first notice to inform residents." />
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <div key={n.id} className="card-premium p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-foreground text-sm">{n.title}</h3>
                    <StatusBadge status={n.priority} />
                    {!n.is_active && !n.is_published && <StatusBadge status="inactive" label="Hidden" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                  <div className="text-[11px] text-muted-foreground mt-2">
                    Posted by {n.created_by || 'Admin'} · {formatDate(n.created_at)}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setModal({ type: 'edit', notice: n })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Delete this notice?')) deleteMutation.mutate(n.id) }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.type === 'create' && <NoticeModal societyId={society?.id} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <NoticeModal notice={modal.notice} societyId={society?.id} onClose={() => setModal(null)} />}
    </div>
  )
}

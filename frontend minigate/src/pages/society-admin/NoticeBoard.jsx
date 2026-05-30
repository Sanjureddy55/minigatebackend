import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Megaphone, Wrench, Calendar, HandCoins,
  Users, Trash2, TrendingUp, Archive, ImagePlus, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'
import { formatDate, formatCurrency, getErrorMessage } from '../../utils/formatters.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  return `${d} days ago`
}

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  notice:      { icon: Megaphone, bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200',  label: 'Notice'            },
  event:       { icon: Calendar,  bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', label: 'Event'             },
  fundraiser:  { icon: HandCoins, bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-200',   label: 'Fundraiser'        },
  maintenance: { icon: Wrench,    bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  label: 'Maintenance'       },
}

function CategoryBadge({ category }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.notice
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

function AudienceBadge({ audience, buildingName }) {
  const label = audience === 'tower' && buildingName ? buildingName
    : audience === 'owners' ? 'Owners Only'
    : audience === 'custom' ? 'Custom Group'
    : 'All Residents'
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
      <Users className="h-3 w-3" /> {label}
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
          <Users className="h-4 w-4 text-teal-600" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          <TrendingUp className="h-3 w-3" /> +0%
        </span>
      </div>
      <p className="text-3xl font-extrabold text-foreground">{value ?? '—'}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-3 uppercase tracking-wide">vs last month</p>
    </div>
  )
}

// ── Notice Card ───────────────────────────────────────────────────────────────
function NoticeCard({ notice, onDelete, onArchive }) {
  const cfg = CATEGORY_CONFIG[notice.category] ?? CATEGORY_CONFIG.notice
  const Icon = cfg.icon
  const raised   = Number(notice.raised_amount  || 0)
  const target   = Number(notice.target_amount   || 0)
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Banner image */}
      {notice.image_url && (
        <img
          src={notice.image_url}
          alt={notice.title}
          className="w-full h-44 object-cover"
        />
      )}

      <div className="p-5">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <Icon className={`h-5 w-5 ${cfg.text}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-foreground">{notice.title}</h3>
            <CategoryBadge category={notice.category} />
            <AudienceBadge audience={notice.audience} buildingName={notice.building_name} />
          </div>

          {/* Description */}
          {notice.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{notice.description}</p>
          )}

          {/* Meta */}
          <p className="text-xs text-muted-foreground mt-2">
            {formatDate(notice.event_date || notice.created_at)}
            {' · posted '}
            {timeAgo(notice.created_at)}
            {notice.created_by_name && ` by ${notice.created_by_name} (Society Admin)`}
          </p>

          {/* Fundraiser progress bar */}
          {notice.is_fundraiser && (
            <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
              <p className="text-xs font-semibold text-teal-700 mb-2">
                Resident contribution: {notice.contribution_per_flat
                  ? `₹${Number(notice.contribution_per_flat).toLocaleString()} per flat`
                  : 'See details'}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-semibold text-foreground">
                  ₹{raised.toLocaleString()} raised
                </span>
                {target > 0 && (
                  <span>of ₹{target.toLocaleString()} · {notice.read_count ?? 0} contributors</span>
                )}
              </div>
              {target > 0 && (
                <div className="w-full h-2 rounded-full bg-teal-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => { if (window.confirm(`Delete "${notice.title}"?`)) onDelete(notice.id) }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {notice.status === 'active' && (
            <button
              onClick={() => onArchive(notice.id)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              title="Archive"
            >
              <Archive className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

// ── New Notification Modal ────────────────────────────────────────────────────
function NoticeModal({ onClose, onSaved }) {
  const imgRef = useRef(null)
  const [imgPreview, setImgPreview] = useState(null)
  const [imgFile,    setImgFile]    = useState(null)

  const [form, setForm] = useState({
    title:                '',
    description:          '',
    category:             'notice',
    audience:             'all',
    status:               'active',
    event_date:           '',
    building:             '',
    target_amount:        '',
    contribution_per_flat:'',
    min_contribution:     '',
    max_contribution:     '',
  })
  const [errors, setErrors] = useState({})

  const { data: buildingsData } = useQuery({
    queryKey: ['buildings'],
    queryFn:  () => societyService.getBuildings({ page_size: 100 }).then(r => r.data),
    staleTime: 60_000,
  })
  const buildings = buildingsData?.results ?? []

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setImgFile(file)
    setImgPreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImgFile(null)
    setImgPreview(null)
    if (imgRef.current) imgRef.current.value = ''
  }

  const mutation = useMutation({
    mutationFn: (data) => {
      // If image is attached, send as FormData
      if (imgFile) {
        const fd = new FormData()
        Object.entries(data).forEach(([k, v]) => { if (v !== '' && v != null) fd.append(k, v) })
        fd.append('image', imgFile)
        return societyService.createNotice(fd)
      }
      return societyService.createNotice(data)
    },
    onSuccess: () => {
      toast.success('Notification posted successfully')
      onSaved()
      onClose()
    },
    onError: (err) => {
      const d = err?.response?.data
      if (d && typeof d === 'object') {
        const e = {}
        Object.entries(d).forEach(([k, v]) => { e[k] = Array.isArray(v) ? v[0] : String(v) })
        setErrors(e)
        toast.error(Object.values(e)[0] ?? 'Failed to post notice')
      } else {
        toast.error(getErrorMessage(err))
      }
    },
  })

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.title.trim()) next.title = 'Title is required'
    if (form.audience === 'tower' && !form.building) next.building = 'Select a building'
    if (showCollection && !form.target_amount && !form.contribution_per_flat)
      next.target_amount = 'Enter target amount or contribution per flat'
    if (form.min_contribution && form.max_contribution &&
        Number(form.min_contribution) > Number(form.max_contribution))
      next.max_contribution = 'Max must be ≥ min contribution'
    setErrors(next)
    if (Object.keys(next).length) return

    const payload = { ...form }
    // Remove empty optional fields
    ;['event_date','building','target_amount','contribution_per_flat','min_contribution','max_contribution']
      .forEach(k => { if (!payload[k]) delete payload[k] })
    mutation.mutate(payload)
  }

  const isTower        = form.audience === 'tower'
  const showEventDate  = ['event', 'maintenance'].includes(form.category)
  const showCollection = ['fundraiser', 'event'].includes(form.category)
  const cfg     = CATEGORY_CONFIG[form.category] ?? CATEGORY_CONFIG.notice
  const CatIcon = cfg.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-background border border-border shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background z-10">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
              <CatIcon className={`h-4 w-4 ${cfg.text}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">New Notification</h3>
              <p className="text-xs text-muted-foreground">Broadcast to society residents</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">

          {/* ── Image Upload ── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Banner Image <span className="text-muted-foreground/60">(optional · max 5 MB)</span>
            </label>
            {imgPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={imgPreview} alt="Preview" className="w-full h-40 object-cover" />
                <button type="button" onClick={removeImage}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => imgRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-teal-400 bg-muted/20 hover:bg-teal-50/30 transition-colors py-6 flex flex-col items-center gap-2">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click to upload image</span>
                <span className="text-[11px] text-muted-foreground/60">PNG, JPG, WEBP</span>
              </button>
            )}
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>

          {/* ── Category chips ── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Category *</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'notice',      label: 'Notice',      Icon: Megaphone  },
                { value: 'event',       label: 'Event',       Icon: Calendar   },
                { value: 'fundraiser',  label: 'Fundraiser',  Icon: HandCoins  },
                { value: 'maintenance', label: 'Maintenance', Icon: Wrench     },
              ].map(c => (
                <button key={c.value} type="button"
                  onClick={() => set('category', c.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-medium transition-colors ${
                    form.category === c.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}>
                  <c.Icon className="h-4 w-4" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Title ── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Diwali Celebration Fund"
              autoFocus
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* ── Description ── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Details about this notice..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none" />
          </div>

          {/* ── Audience + Building ── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'all',    label: 'All Residents' },
                { value: 'tower',  label: 'Specific Tower'},
                { value: 'owners', label: 'Owners Only'   },
                { value: 'custom', label: 'Custom Group'  },
              ].map(a => (
                <button key={a.value} type="button"
                  onClick={() => set('audience', a.value)}
                  className={`rounded-xl border py-2 px-3 text-xs font-medium transition-colors ${
                    form.audience === a.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>
            {isTower && (
              <div className="mt-3">
                <select value={form.building} onChange={e => set('building', e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none">
                  <option value="">Select building</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {errors.building && <p className="text-xs text-red-500 mt-1">{errors.building}</p>}
              </div>
            )}
          </div>

          {/* ── Event / Maintenance date ── */}
          {showEventDate && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {form.category === 'event' ? 'Event Date' : 'Maintenance Date'}
              </label>
              <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            </div>
          )}

          {/* ── Collection fields (event + fundraiser) ── */}
          {showCollection && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
              <p className="text-xs font-semibold text-teal-700">
                {form.category === 'fundraiser' ? 'Fundraiser Collection' : 'Event Collection (optional)'}
              </p>

              {/* Target Amount */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Target Amount (₹) {form.category === 'fundraiser' && '*'}
                </label>
                <input type="number" value={form.target_amount} onChange={e => set('target_amount', e.target.value)}
                  placeholder="e.g. 200000 for ₹2 Lakhs"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                {errors.target_amount && <p className="text-xs text-red-500 mt-1">{errors.target_amount}</p>}
                {form.target_amount && (
                  <p className="text-xs text-teal-600 mt-1 font-medium">
                    = ₹{Number(form.target_amount).toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              {/* Fixed contribution per flat */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Fixed Contribution per Flat (₹)</label>
                <input type="number" value={form.contribution_per_flat} onChange={e => set('contribution_per_flat', e.target.value)}
                  placeholder="e.g. 500 — leave blank for flexible"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
              </div>

              {/* Min / Max contribution */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Min Contribution (₹)</label>
                  <input type="number" value={form.min_contribution} onChange={e => set('min_contribution', e.target.value)}
                    placeholder="500"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Max Contribution (₹)</label>
                  <input type="number" value={form.max_contribution} onChange={e => set('max_contribution', e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                  {errors.max_contribution && <p className="text-xs text-red-500 mt-1">{errors.max_contribution}</p>}
                </div>
              </div>

              {/* Live preview of limits */}
              {(form.min_contribution || form.max_contribution) && (
                <div className="rounded-lg bg-teal-100 px-3 py-2 text-xs text-teal-800">
                  Each resident can contribute{' '}
                  {form.min_contribution ? <strong>min ₹{Number(form.min_contribution).toLocaleString()}</strong> : ''}
                  {form.min_contribution && form.max_contribution ? ' – ' : ''}
                  {form.max_contribution ? <strong>max ₹{Number(form.max_contribution).toLocaleString()}</strong> : ''}
                </div>
              )}
            </div>
          )}

          {/* ── Buttons ── */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2.5 text-sm font-semibold disabled:opacity-60 transition-colors">
              {mutation.isPending ? 'Posting…' : 'Post Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SocietyNoticeBoard() {
  const qc      = useQueryClient()
  const society = useSelector(selectSociety)

  const [showModal,   setShowModal]   = useState(false)
  const [catFilter,   setCatFilter]   = useState('')

  // ── Dashboard KPI ─────────────────────────────────────────────────────────
  const { data: dash } = useQuery({
    queryKey: ['notice-dashboard', society?.id],
    queryFn:  () => societyService.getNoticeDashboard().then(r => r.data?.data ?? r.data),
    staleTime: 30_000,
  })

  // ── Notices list ──────────────────────────────────────────────────────────
  const { data: noticesData, isLoading } = useQuery({
    queryKey: ['society-notices', society?.id, catFilter],
    queryFn:  () => societyService.getNotices({
      category:  catFilter || undefined,
      page_size: 50,
    }).then(r => r.data),
    staleTime: 20_000,
  })
  const notices = noticesData?.results ?? []

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['society-notices'] })
    qc.invalidateQueries({ queryKey: ['notice-dashboard'] })
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id) => societyService.deleteNotice(id),
    onSuccess: () => { toast.success('Notice deleted'); invalidate() },
    onError:   (err) => toast.error(getErrorMessage(err)),
  })

  // ── Archive ───────────────────────────────────────────────────────────────
  const archiveMut = useMutation({
    mutationFn: (id) => societyService.updateNotice(id, { status: 'archived' }),
    onSuccess: () => { toast.success('Notice archived'); invalidate() },
    onError:   (err) => toast.error(getErrorMessage(err)),
  })

  const FILTERS = [
    { value: '',            label: 'All'         },
    { value: 'notice',      label: 'Notices'     },
    { value: 'event',       label: 'Events'      },
    { value: 'fundraiser',  label: 'Fundraisers' },
    { value: 'maintenance', label: 'Maintenance' },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notice Board & Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Broadcast events, fundraisers, and announcements to residents.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> New Notification
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active Notices"      value={dash?.active_notices     ?? '—'} />
        <StatCard label="Live Fundraisers"    value={dash?.live_fundraisers   ?? '—'} />
        <StatCard label="Upcoming Events"     value={dash?.upcoming_events    ?? '—'} />
        <StatCard label="Unread by Residents" value={dash?.total_unread       ?? '—'} />
      </div>

      {/* ── Category filter tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setCatFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              catFilter === f.value
                ? 'bg-teal-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Notices list ── */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-48" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && notices.length === 0 && (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <Megaphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No notices yet</p>
          <p className="text-xs text-muted-foreground mt-1">Post your first notification to residents.</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition-colors">
            <Plus className="h-4 w-4" /> New Notification
          </button>
        </div>
      )}

      {!isLoading && notices.length > 0 && (
        <div className="space-y-3">
          {notices.map(n => (
            <NoticeCard
              key={n.id}
              notice={n}
              onDelete={(id) => deleteMut.mutate(id)}
              onArchive={(id) => archiveMut.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <NoticeModal onClose={() => setShowModal(false)} onSaved={invalidate} />
      )}
    </div>
  )
}

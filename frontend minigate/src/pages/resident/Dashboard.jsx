import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Calendar, HandCoins, Megaphone, Receipt, Wallet, Building2, Landmark, X, Loader2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice.js'
import { residentService } from '../../services/resident.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'
import { formatCurrency } from '../../utils/formatters.js'
import { toast } from 'sonner'

export default function ResidentDashboard() {
  const user = useSelector(selectUser)
  const queryClient = useQueryClient()
  const [payModal, setPayModal] = useState(null) // { noticeId, title, defaultAmount }

  const { data, isLoading } = useQuery({
    queryKey: ['resident-dashboard'],
    queryFn: () => residentService.getDashboard().then((r) => r.data?.data || r.data),
  })

  const d = data || {}

  const statCards = [
    {
      title: 'Pending Bills',
      value: formatCurrency(d.pending_bills ?? 0),
      sub: d.pending_bill_due_date ? `Due on ${d.pending_bill_due_date}` : 'No pending bills',
      icon: Receipt,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      title: 'My Maintenance Paid',
      value: formatCurrency(d.maintenance_paid ?? 0),
      sub: d.maintenance_paid_month ?? '—',
      icon: Wallet,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'Society Fund Used',
      value: formatCurrency(d.society_fund_used ?? 0),
      sub: 'Published expenses',
      icon: Building2,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Society Balance',
      value: formatCurrency(d.society_balance ?? 0),
      sub: 'Available balance',
      icon: Landmark,
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
    },
  ]

  const notices = d.recent_notices || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(' ')[0] || 'Resident'}`}
        description="Here's your daily summary."
      />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </div>
      )}

      {/* Recent Notifications */}
      <div>
        <div className="mb-4 border-l-4 border-primary pl-4">
          <h2 className="text-xl font-bold text-foreground">Recent notifications</h2>
          <p className="text-sm text-muted-foreground">Latest updates from your society admin.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer h-20 rounded-xl bg-muted" />
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="card-premium p-6 text-center text-sm text-muted-foreground">
            No recent notices
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice, i) => (
              <NoticeCard
                key={i}
                notice={notice}
                onPayClick={() =>
                  setPayModal({
                    noticeId: notice.id,
                    title: notice.title,
                    defaultAmount: notice.contribution_per_flat ?? '',
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Pay Contribution Modal */}
      {payModal && (
        <PayContributionModal
          noticeId={payModal.noticeId}
          title={payModal.title}
          defaultAmount={payModal.defaultAmount}
          onClose={() => setPayModal(null)}
          onSuccess={() => {
            setPayModal(null)
            queryClient.invalidateQueries({ queryKey: ['resident-dashboard'] })
          }}
        />
      )}
    </div>
  )
}

// ── Notice Card ───────────────────────────────────────────────────────────────

function getIcon(category) {
  if (category === 'fundraiser') return HandCoins
  if (category === 'event') return Calendar
  if (category === 'notice') return Megaphone
  return Bell
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

function NoticeCard({ notice, onPayClick }) {
  const Icon = getIcon(notice.category)
  const isFundraiser = notice.category === 'fundraiser' && notice.target_amount
  const progress = isFundraiser
    ? Math.min(100, (Number(notice.raised_amount) / Number(notice.target_amount)) * 100)
    : 0

  return (
    <div className="card-premium p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{notice.title}</span>
            <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
              New
            </span>
            {isFundraiser && (
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Fund Required
              </span>
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notice.description}</p>

          {isFundraiser && (
            <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
              {notice.contribution_per_flat && (
                <p className="mb-2 text-xs font-medium text-primary">
                  Amount to pay: {formatCurrency(notice.contribution_per_flat)} per flat
                </p>
              )}
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-medium">{formatCurrency(notice.raised_amount)} collected</span>
                <span className="text-muted-foreground">Target {formatCurrency(notice.target_amount)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={onPayClick}
                  className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Pay Contribution
                </button>
                <button className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                  View Event
                </button>
                <button className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
          {timeAgo(notice.created_at)}
        </span>
      </div>
    </div>
  )
}

// ── Pay Contribution Modal ────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'upi',           label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash',          label: 'Cash' },
  { value: 'cheque',        label: 'Cheque' },
]

function PayContributionModal({ noticeId, title, defaultAmount, onClose, onSuccess }) {
  const [amount, setAmount] = useState(String(defaultAmount || ''))
  const [method, setMethod] = useState('upi')
  const [errorMsg, setErrorMsg] = useState('')

  const mutation = useMutation({
    mutationFn: ({ id, body }) => residentService.contributeToFundraiser(id, body),
    onSuccess: (res) => {
      const raised = res.data?.data?.raised_amount
      toast.success('Contribution recorded!', {
        description: raised ? `Total raised: ${formatCurrency(raised)}` : undefined,
      })
      onSuccess()
    },
    onError: (err) => {
      console.error('Contribution error:', err.response?.data || err.message)
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0]?.[0] ||
        'Payment failed. Please try again.'
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
      toast.error(typeof msg === 'string' ? msg : 'Payment failed.')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')
    if (!noticeId) {
      setErrorMsg('Invalid notice. Please refresh the page.')
      return
    }
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      setErrorMsg('Enter a valid amount greater than 0.')
      return
    }
    mutation.mutate({ id: noticeId, body: { amount: parsed, payment_method: method } })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Pay Contribution</h3>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inline error */}
          {errorMsg && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMsg}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrorMsg('') }}
              placeholder="e.g. 500"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mutation.isPending ? 'Processing…' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, Receipt, Wallet, AlertCircle,
  TrendingUp, TrendingDown, ExternalLink, ArrowRight,
} from 'lucide-react'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'

// ── Indian currency formatter ─────────────────────────────────────────────────
function inr(amount) {
  if (amount == null) return '—'
  const n = Number(amount)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

// ── Bone skeleton ─────────────────────────────────────────────────────────────
function Bone({ className = '' }) {
  return <div className={`rounded bg-muted animate-pulse ${className}`} />
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconCls, label, value, isLoading }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <Icon className={`h-5 w-5 ${iconCls}`} />
      </div>
      {isLoading
        ? <Bone className="h-8 w-32 mt-1" />
        : <p className="text-3xl font-extrabold text-foreground tabular-nums">{value}</p>
      }
    </div>
  )
}

// ── Proof link ────────────────────────────────────────────────────────────────
function ProofLink({ url }) {
  if (!url) return <span className="text-muted-foreground text-xs">—</span>
  const isHttp = url.startsWith('http')
  const name   = url.split('/').pop() || url
  if (isHttp) {
    return (
      <a href={url} target="_blank" rel="noreferrer"
        className="text-teal-600 hover:underline text-xs flex items-center gap-0.5 font-medium">
        {name} <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    )
  }
  return (
    <span className="text-teal-600 text-xs font-medium flex items-center gap-0.5">
      {name}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SocietyFundDashboard() {
  const society  = useSelector(selectSociety)
  const navigate = useNavigate()

  // GET /api/society-admin/fund-dashboard/?society=<id>
  const { data: raw, isLoading } = useQuery({
    queryKey:  ['fund-dashboard', society?.id],
    queryFn:   () =>
      societyService.getFundDashboard({ society: society?.id })
        .then(r => r.data?.data ?? r.data),
    enabled:  !!society?.id,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  // API fields: raw.kpi and raw.latest_expenses
  const kpi      = raw?.kpi             ?? {}
  const expenses = raw?.latest_expenses ?? []

  // Usage progress bar
  const usagePct  = Math.min(kpi.usage_pct ?? 0, 100)
  const usageDesc = kpi.usage_description ?? ''

  const KPI_CARDS = [
    {
      icon: IndianRupee, iconCls: 'text-teal-600',
      label: 'Total Maintenance Collected',
      value: inr(kpi.total_collected),
    },
    {
      icon: Receipt, iconCls: 'text-blue-500',
      label: 'Total Expenses Used',
      value: inr(kpi.total_expenses_used),
    },
    {
      icon: Wallet, iconCls: 'text-emerald-600',
      label: 'Remaining Balance',
      value: inr(kpi.remaining_balance),
    },
    {
      icon: AlertCircle, iconCls: 'text-amber-500',
      label: 'Pending Dues',
      value: inr(kpi.pending_dues),
    },
    {
      icon: TrendingUp, iconCls: 'text-teal-500',
      label: 'This Month Collection',
      value: inr(kpi.this_month_collection),
    },
    {
      icon: TrendingDown, iconCls: 'text-red-500',
      label: 'This Month Expenses',
      value: inr(kpi.this_month_expenses),
    },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance Fund Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track collection, expenses, balance and proof documents.
          </p>
        </div>
        <button
          onClick={() => navigate('/society/expenses')}
          className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shrink-0"
        >
          <Receipt className="h-4 w-4" />
          Add / Manage Expenses
        </button>
      </div>

      {/* ── 6 KPI CARDS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPI_CARDS.map(card => (
          <KpiCard key={card.label} {...card} isLoading={isLoading} />
        ))}
      </div>

      {/* ── FUND USAGE PROGRESS BAR ── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Fund usage progress</p>
          {isLoading
            ? <Bone className="h-4 w-16" />
            : <span className="text-sm font-bold text-foreground tabular-nums">
                {kpi.usage_label ?? '—'}
              </span>
          }
        </div>

        {/* Progress bar */}
        <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
          {isLoading ? (
            <Bone className="absolute inset-0 rounded-full" />
          ) : (
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-700"
              style={{ width: `${usagePct}%` }}
            />
          )}
        </div>

        {/* Usage description */}
        {!isLoading && usageDesc && (
          <p className="text-xs text-muted-foreground">{usageDesc}</p>
        )}
      </div>

      {/* ── LATEST PUBLISHED EXPENSES TABLE ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Latest published expenses</h2>
          <button
            onClick={() => navigate('/society/expenses')}
            className="flex items-center gap-1 text-xs text-teal-600 font-medium hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground font-medium">
                <th className="px-6 py-3 text-left">EXPENSE</th>
                <th className="px-6 py-3 text-left hidden sm:table-cell">CATEGORY</th>
                <th className="px-6 py-3 text-left">AMOUNT</th>
                <th className="px-6 py-3 text-left hidden md:table-cell">PROOF</th>
                <th className="px-6 py-3 text-left">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-6 py-4"><Bone className="h-3 w-44" /></td>
                    <td className="px-6 py-4 hidden sm:table-cell"><Bone className="h-3 w-28" /></td>
                    <td className="px-6 py-4"><Bone className="h-3 w-20" /></td>
                    <td className="px-6 py-4 hidden md:table-cell"><Bone className="h-3 w-36" /></td>
                    <td className="px-6 py-4"><Bone className="h-3 w-16" /></td>
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No published expenses yet</p>
                    <button
                      onClick={() => navigate('/society/expenses')}
                      className="mt-2 text-xs text-teal-600 hover:underline"
                    >
                      Add an expense
                    </button>
                  </td>
                </tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">

                    {/* EXPENSE */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{exp.title}</p>
                      {exp.vendor_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{exp.vendor_name}</p>
                      )}
                    </td>

                    {/* CATEGORY */}
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <p className="text-sm text-foreground capitalize">
                        {exp.category_display || exp.category}
                      </p>
                    </td>

                    {/* AMOUNT */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{inr(exp.amount)}</p>
                    </td>

                    {/* PROOF */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <ProofLink url={exp.proof_url} />
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        exp.is_published ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {exp.status_display}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

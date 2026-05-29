import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download, Search, User, Server, ShieldAlert, TriangleAlert, Scroll,
} from 'lucide-react'
import { toast } from 'sonner'
import { platformService } from '../../services/platform.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { downloadBlob, getErrorMessage } from '../../utils/formatters.js'

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m} min ago`
  if (h < 24) return `${h} hr ago`
  if (d === 1) return 'Yesterday'
  return `${d} days ago`
}

function maskIp(ip) {
  if (!ip) return 'Internal'
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.X.X`
  return ip
}

const CATEGORY_META = {
  admin:    { label: 'Admin',    bg: 'bg-blue-100',   text: 'text-blue-700',   icon: User,         iconBg: 'bg-blue-50',   iconColor: 'text-blue-500' },
  system:   { label: 'System',   bg: 'bg-gray-100',   text: 'text-gray-600',   icon: Server,       iconBg: 'bg-gray-100',  iconColor: 'text-gray-500' },
  security: { label: 'Security', bg: 'bg-red-100',    text: 'text-red-700',    icon: ShieldAlert,  iconBg: 'bg-red-50',    iconColor: 'text-red-500' },
  billing:  { label: 'Billing',  bg: 'bg-amber-100',  text: 'text-amber-700',  icon: TriangleAlert,iconBg: 'bg-amber-50',  iconColor: 'text-amber-500' },
}

function getCategoryMeta(log) {
  const key = (log.category || log.action_type || log.event_type || '').toLowerCase()
  for (const [k, v] of Object.entries(CATEGORY_META)) {
    if (key.includes(k)) return { ...v, key: k }
  }
  return { ...CATEGORY_META.system, key: 'system' }
}

function buildSubtitle(log) {
  const parts = [
    log.actor_name || log.actor || log.user,
    log.actor_role || log.role,
    log.target || log.object || log.resource,
    log.location || log.city,
  ].filter(Boolean)
  return parts.join(' · ')
}

// ── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

export default function AuditLogs() {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch]                 = useState('')
  const [page, setPage]                     = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: summaryData } = useQuery({
    queryKey: ['audit-summary'],
    queryFn: () => platformService.getAuditSummary().then((r) => r.data?.data ?? r.data),
    staleTime: 30_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', categoryFilter, debouncedSearch, page],
    queryFn: () =>
      platformService.getAuditLogs({
        page,
        page_size: PAGE_SIZE,
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
      }).then((r) => r.data),
    staleTime: 30_000,
  })

  const logs  = data?.results ?? []
  const total = data?.count   ?? 0

  // Stats — prefer summary endpoint, fallback to counting from page
  const summary = summaryData ?? {}
  const statsTotal    = summary.total          ?? total
  const statsAdmin    = summary.admin          ?? summary.admin_count    ?? 0
  const statsSecurity = summary.security       ?? summary.security_count ?? 0
  const statsSystem   = summary.system         ?? summary.system_count   ?? 0
  const statsBilling  = summary.billing        ?? summary.billing_count  ?? 0

  const TABS = [
    { key: 'all',      label: 'All',      count: statsTotal    },
    { key: 'admin',    label: 'Admin',    count: statsAdmin    },
    { key: 'system',   label: 'System',   count: statsSystem   },
    { key: 'security', label: 'Security', count: statsSecurity },
    { key: 'billing',  label: 'Billing',  count: statsBilling  },
  ]

  async function handleExport() {
    try {
      const { data: blob } = await platformService.exportAuditLogs()
      downloadBlob(blob, 'audit_logs.csv')
      toast.success('Export downloaded')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Immutable record of all platform-level actions"
        actions={
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Events',   value: statsTotal,    border: 'border-border',     bg: 'bg-card',      color: 'text-foreground' },
          { label: 'Admin Actions',  value: statsAdmin,    border: 'border-blue-100',   bg: 'bg-blue-50',   color: 'text-blue-600' },
          { label: 'Security',       value: statsSecurity, border: 'border-red-100',    bg: 'bg-red-50',    color: 'text-red-500' },
          { label: 'System Events',  value: statsSystem,   border: 'border-border',     bg: 'bg-card',      color: 'text-muted-foreground' },
        ].map(({ label, value, border, bg, color }) => (
          <div key={label} className={`rounded-2xl border ${border} ${bg} px-5 py-4`}>
            <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setCategoryFilter(key); setPage(1) }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                categoryFilter === key
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label} <span className="ml-1 text-xs opacity-70">{count}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search actor, action, target…"
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background w-72 focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Log Entries */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-48 rounded bg-muted" />
                <div className="h-2.5 w-64 rounded bg-muted" />
              </div>
              <div className="space-y-1.5 text-right shrink-0">
                <div className="h-2.5 w-16 rounded bg-muted ml-auto" />
                <div className="h-2.5 w-20 rounded bg-muted ml-auto" />
              </div>
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <Scroll className="h-8 w-8 opacity-30" />
            <p className="text-sm">No audit logs found.</p>
          </div>
        ) : (
          logs.map((log, i) => {
            const meta     = getCategoryMeta(log)
            const Icon     = meta.icon
            const subtitle = buildSubtitle(log)
            const action   = log.action_label || log.action || log.event || log.description || 'Action'
            const ip       = log.ip_address || log.ip || ''

            return (
              <div key={log.id ?? i} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                {/* Category icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                  <Icon className={`h-4 w-4 ${meta.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-semibold text-foreground text-sm">{action}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.text}`}>
                      {meta.label}
                    </span>
                  </div>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                  )}
                </div>

                {/* Time + IP */}
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground font-medium">{timeAgo(log.timestamp || log.created_at)}</div>
                  {ip && (
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">{maskIp(ip)}</div>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* Pagination footer */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">Page {page} · {total} total events</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={logs.length < PAGE_SIZE}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

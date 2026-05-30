import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  Users, UserCheck, ClipboardCheck, Shield, Download,
  Zap, TrendingUp, TrendingDown, ChevronRight,
  Building2, Wallet, Wifi,
} from 'lucide-react'
import { selectUser, selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'

// ── helpers ──────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase()
}

function firstName(full = '') { return full.split(' ')[0] || 'there' }

// "2026-05-29" → "Mon" (7D) | "29 May" (30D/90D)
function fmtDay(dateStr, flowDays) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  if (flowDays <= 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

const AVATAR_COLORS = ['bg-teal-500','bg-violet-500','bg-orange-500','bg-pink-500','bg-blue-500','bg-emerald-500']
function avatarColor(str = '') {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

const PRIORITY_CLS = {
  low:    'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-red-100 text-red-700',
  urgent: 'bg-red-100 text-red-700',
}
const VISIT_CLS = {
  guest:    'bg-violet-100 text-violet-700',
  delivery: 'bg-blue-100 text-blue-700',
  cab:      'bg-teal-100 text-teal-700',
  service:  'bg-amber-100 text-amber-700',
}

const TAB_DAYS = { '7D': 7, '30D': 30, '90D': 90 }

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Spark({ color = '#0D9488' }) {
  const pts = [0, 1, 0, 2, 1, 3].map((v, i) => ({ v, i }))
  return (
    <ResponsiveContainer width={80} height={36}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.22} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false}
          fill={`url(#sg${color.replace('#','')})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, value, label, pct, sparkColor }) {
  const up = (pct ?? 0) >= 0
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {pct != null && (
          <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold
            ${up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {up ? '+' : ''}{pct.toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-extrabold text-foreground leading-none tabular-nums">
          {value ?? '—'}
        </div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xs text-muted-foreground">VS LAST MONTH</span>
        <Spark color={sparkColor} />
      </div>
    </div>
  )
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <b>{p.value}</b></p>
      ))}
    </div>
  )
}

// ── Skeleton bone ─────────────────────────────────────────────────────────────
function Bone({ className = '' }) {
  return <div className={`rounded bg-muted animate-pulse ${className}`} />
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const FLOW_TABS = ['7D', '30D', '90D']

export default function SocietyDashboard() {
  const user    = useSelector(selectUser)
  const society = useSelector(selectSociety)
  const [flowTab, setFlowTab] = useState('7D')
  const flowDays = TAB_DAYS[flowTab] ?? 7

  // ── Fetch — correct params: { society: id, flow_days: N } ─────────────────
  const { data: raw, isLoading, isError, error, refetch } = useQuery({
    queryKey:  ['society-dashboard', society?.id, flowDays],
    queryFn:   async () => {
      const r = await societyService.getDashboard({
        society:   society?.id,   // ← sends ?society=11
        flow_days: flowDays,      // ← sends ?flow_days=7
      })
      return r.data?.data ?? r.data
    },
    enabled:         !!society?.id,
    staleTime:       60_000,
    refetchInterval: 60_000,
    retry: 1,
  })

  // ── Map API fields (match backend serializer exactly) ─────────────────────
  const kpis    = raw?.kpis           ?? {}   // active_residents, today_visitors, etc.
  const sec     = raw?.secondary_kpis ?? {}   // collection_rate_pct, occupancy_pct, etc.
  const activity   = raw?.recent_activity   ?? []
  const approvals  = raw?.pending_approvals ?? []
  const liveGate   = raw?.live_visitors     ?? []
  const resChart   = raw?.residents_chart   ?? []   // [{month, count}]

  // visitor_flow: [{date, guest, delivery, cab, service, other, total}]
  // add `day` label for XAxis
  const flowData = (raw?.visitor_flow ?? []).map(d => ({
    ...d,
    day: fmtDay(d.date, flowDays),
  }))

  // secondary_kpis fields
  const collPct   = sec.collection_rate_pct ?? null
  const collPaid  = sec.collection_paid     ?? null
  const collTotal = sec.collection_total    ?? null
  const occPct    = sec.occupancy_pct       ?? null
  const occFlats  = sec.occupied_flats      ?? null
  const totFlats  = sec.total_flats         ?? society?.total_flats ?? null
  const staffCnt  = sec.active_staff        ?? null

  const kpiCards = [
    { icon: Users,          iconBg: 'bg-teal-400',   value: kpis.active_residents,  label: 'Active Residents',  pct: kpis.residents_change_pct,  sparkColor: '#0D9488' },
    { icon: UserCheck,      iconBg: 'bg-blue-400',   value: kpis.today_visitors,    label: "Today's Visitors",  pct: kpis.visitors_change_pct,   sparkColor: '#3B82F6' },
    { icon: ClipboardCheck, iconBg: 'bg-violet-400', value: kpis.pending_approvals, label: 'Pending Approvals', pct: kpis.approvals_change_pct,  sparkColor: '#8B5CF6' },
    { icon: Shield,         iconBg: 'bg-red-400',    value: kpis.security_alerts,   label: 'Security Alerts',   pct: kpis.alerts_change_pct,     sparkColor: '#EF4444' },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-muted-foreground tracking-[0.15em] mb-1">
            {todayLabel()}
          </p>
          <h1 className="text-3xl font-extrabold text-foreground leading-tight">
            {greeting()},{' '}
            <span className="text-teal-500">{firstName(user?.full_name || user?.name)}.</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening at{' '}
            <span className="font-semibold text-foreground">{society?.name || 'your society'}</span>{' '}
            today.{' '}
            <span className="text-teal-500 font-medium">All systems operational.</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
          <button className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Zap className="h-4 w-4" /> Quick Action
          </button>
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-700">Dashboard API error</p>
            <p className="text-xs text-red-500 mt-0.5 font-mono">
              {error?.response?.status
                ? `HTTP ${error.response.status} — ${error.response?.data?.message || error.message}`
                : error?.message || 'Network error — is Django running on port 8000?'}
            </p>
            <p className="text-xs text-red-400 mt-1">Society ID: {society?.id ?? 'missing'}</p>
          </div>
          <button onClick={() => refetch()}
            className="shrink-0 rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
            Retry
          </button>
        </div>
      )}

      {/* ── ROW 1 — KPI CARDS ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex justify-between">
                  <Bone className="w-10 h-10 rounded-xl" />
                  <Bone className="w-14 h-5 rounded-full" />
                </div>
                <Bone className="h-9 w-20" />
                <Bone className="h-3 w-28" />
                <div className="flex justify-between items-end">
                  <Bone className="h-3 w-20" />
                  <Bone className="w-20 h-9" />
                </div>
              </div>
            ))
          : kpiCards.map(c => <KpiCard key={c.label} {...c} />)
        }
      </div>

      {/* ── ROW 2 — SECONDARY METRICS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: Wallet,    bg: 'bg-teal-50',   color: 'text-teal-600',
            value: collPct  != null ? `${collPct}%`  : '—',
            label: 'Collection Rate',
            sub:   collPaid != null ? `${collPaid} of ${collTotal} dues collected` : 'Maintenance dues collected this month',
          },
          {
            icon: Building2, bg: 'bg-blue-50',   color: 'text-blue-600',
            value: occPct   != null ? `${occPct}%`   : '—',
            label: 'Occupancy',
            sub:   occFlats != null ? `${occFlats} of ${totFlats} flats occupied` : 'Flat occupancy rate',
          },
          {
            icon: Users,     bg: 'bg-violet-50', color: 'text-violet-600',
            value: staffCnt ?? '—',
            label: 'Active Staff',
            sub:   'Guards · Maintenance · Support',
          },
        ].map(({ icon: Icon, bg, color, value, label, sub }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground tabular-nums">{value}</div>
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 3 — CHARTS ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

        {/* Visitor Flow — keys: guest, delivery, service (match backend) */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Visitor Flow</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Guests · deliveries · services this week</p>
            </div>
            <div className="flex gap-0.5 bg-muted/40 rounded-lg p-0.5">
              {FLOW_TABS.map(t => (
                <button key={t} onClick={() => setFlowTab(t)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors
                    ${flowTab === t ? 'bg-teal-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <Bone className="h-52 w-full" />
          ) : flowData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
              No visitor data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={flowData} barSize={8} barGap={2}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={v => <span style={{ color: '#6B7280' }}>{v}</span>} />
                {/* dataKey matches API field names exactly */}
                <Bar dataKey="guest"    name="Guests"     fill="#0D9488" radius={[3,3,0,0]} />
                <Bar dataKey="delivery" name="Deliveries" fill="#3B82F6" radius={[3,3,0,0]} />
                <Bar dataKey="service"  name="Services"   fill="#8B5CF6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Residents Growth — key: residents_chart [{month, count}] */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-foreground">Residents</h3>
              <p className="text-xs text-muted-foreground mt-0.5">6-month growth</p>
            </div>
            {kpis.residents_change_pct != null && (
              <span className="flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
                <TrendingUp className="h-3 w-3" />+{kpis.residents_change_pct.toFixed(1)}%
              </span>
            )}
          </div>

          <div className="flex-1">
            {isLoading ? (
              <Bone className="h-40 w-full mt-2" />
            ) : resChart.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={resChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0D9488" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="count" stroke="#0D9488" strokeWidth={2}
                    fill="url(#resGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex gap-6 pt-3 border-t border-border mt-2">
            <div>
              <div className="text-xl font-extrabold text-foreground tabular-nums">
                {kpis.active_residents ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground">Active now</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-foreground tabular-nums">
                {totFlats ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground">Total flats</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 4 — LIVE ACTIVITY + WIDGETS ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

        {/* Live Activity — [{actor, action, subject, time_ago, event_type}] */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Live Activity</h3>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              LIVE
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Bone className="w-7 h-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Bone className="h-3 w-48" />
                    <Bone className="h-2.5 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {activity.slice(0, 8).map((a, i) => {
                const name = a.actor || 'System'
                // split "Guard - Gate 1" → bold "Guard" + muted " - Gate 1"
                const dash = name.indexOf(' - ')
                const bold = dash > -1 ? name.slice(0, dash) : name
                const sub  = dash > -1 ? name.slice(dash)    : ''
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarColor(bold)}`}>
                      {initials(bold)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        <span className="font-semibold">{bold}</span>
                        {sub && <span className="text-muted-foreground">{sub}</span>}
                        {' '}
                        <span className="text-muted-foreground">{a.action}</span>
                        {a.subject && <> <span className="font-medium text-foreground">{a.subject}</span></>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.time_ago}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Pending Approvals — [{id, title, priority, stage, requester, flat_info}] */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Pending Approvals
                {approvals.length > 0 && (
                  <span className="rounded-full bg-violet-100 text-violet-700 text-xs font-bold px-1.5 py-0.5">
                    {approvals.length}
                  </span>
                )}
              </h3>
              <button className="flex items-center gap-0.5 text-xs text-teal-600 font-medium hover:underline">
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <Bone className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5"><Bone className="h-3 w-32" /><Bone className="h-2.5 w-44" /></div>
                  </div>
                ))}
              </div>
            ) : approvals.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No pending approvals</p>
            ) : (
              <div className="space-y-2">
                {approvals.slice(0, 3).map(item => (
                  <div key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(item.requester || item.title)}`}>
                      {initials(item.requester || item.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                        {item.priority && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize shrink-0
                            ${PRIORITY_CLS[item.priority.toLowerCase()] || 'bg-muted text-muted-foreground'}`}>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {[item.requester, item.flat_info, item.stage].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live at Gate — [{id, full_name, visit_type, purpose, flat_info, time, status}] */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Live at Gate
                {liveGate.length > 0 && (
                  <span className="rounded-full bg-teal-100 text-teal-700 text-xs font-bold px-1.5 py-0.5">
                    {liveGate.length}
                  </span>
                )}
              </h3>
              <button className="flex items-center gap-0.5 text-xs text-teal-600 font-medium hover:underline">
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <Bone className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5"><Bone className="h-3 w-28" /><Bone className="h-2.5 w-36" /></div>
                    <Bone className="w-10 h-8 shrink-0" />
                  </div>
                ))}
              </div>
            ) : liveGate.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No active visitors</p>
            ) : (
              <div className="space-y-3">
                {liveGate.slice(0, 5).map((v, i) => {
                  const name    = v.full_name || 'Visitor'
                  const vType   = (v.visit_type || '').toLowerCase()
                  const typeCls = VISIT_CLS[vType] || 'bg-gray-100 text-gray-600'
                  const subLine = [v.purpose, v.flat_info].filter(Boolean).join(' → ') || '—'
                  return (
                    <div key={v.id ?? i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(name)}`}>
                        {initials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{name}</span>
                          {vType && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize shrink-0 ${typeCls}`}>
                              {v.visit_type ? v.visit_type.charAt(0).toUpperCase() + v.visit_type.slice(1) : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{subLine}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-semibold text-foreground">{v.time}</div>
                        <div className="text-[10px] font-semibold text-teal-500 mt-0.5">Live</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

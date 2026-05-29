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
function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  return `${Math.floor(h / 24)} days ago`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
}

function firstName(full = '') {
  return full.split(' ')[0] || 'there'
}

const AVATAR_COLORS = ['bg-teal-500','bg-violet-500','bg-orange-500','bg-pink-500','bg-blue-500','bg-emerald-500']
function avatarColor(str = '') {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(name = '') {
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'
}

const PRIORITY_CLS = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-green-100 text-green-700',
}
const VISIT_CLS = {
  cab:      'bg-teal-100 text-teal-700',
  guest:    'bg-violet-100 text-violet-700',
  delivery: 'bg-blue-100 text-blue-700',
  service:  'bg-amber-100 text-amber-700',
}

// ── Tiny Sparkline ────────────────────────────────────────────────────────────
function Spark({ data = [], color = '#0D9488', positive = true }) {
  const d = data.length ? data : [0,1,0,2,1,3]
  return (
    <ResponsiveContainer width={80} height={36}>
      <AreaChart data={d.map((v,i)=>({v,i}))} margin={{top:2,right:0,bottom:0,left:0}}>
        <defs>
          <linearGradient id={`sg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false}
          fill={`url(#sg${color.replace('#','')})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, value, label, pct, sparkData, sparkColor }) {
  const pos = (pct ?? 0) >= 0
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {pct != null && (
          <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${pos ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {pos ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>}
            {pos?'+':''}{pct?.toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-extrabold text-foreground leading-none">{value ?? '—'}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xs text-muted-foreground">VS LAST MONTH</span>
        <Spark data={sparkData} color={sparkColor || (pos ? '#10B981' : '#EF4444')} positive={pos} />
      </div>
    </div>
  )
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
const VISITOR_TABS = ['7D','30D','90D']

export default function SocietyDashboard() {
  const user    = useSelector(selectUser)
  const society = useSelector(selectSociety)
  const [visitorTab, setVisitorTab] = useState('7D')

  const { data: raw, isLoading } = useQuery({
    queryKey: ['society-dashboard', society?.id],
    queryFn: () => societyService.getDashboard(society?.id).then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  })

  const kpis            = raw?.kpis             ?? {}
  const staff           = raw?.staff_summary    ?? {}
  const occupancy       = raw?.occupancy        ?? {}
  const collection      = raw?.collection_rate  ?? {}
  const recentActivity  = raw?.recent_activity  ?? []
  const pendingApprovals= raw?.pending_approvals ?? []
  const liveVisitors    = raw?.live_visitors     ?? []
  const visitorFlow     = raw?.visitor_flow      ?? []
  const residentGrowth  = raw?.resident_growth   ?? []

  // Fallback sparklines from kpi arrays
  const resSpark  = kpis.residents_trend  ?? [kpis.active_residents ?? 0]
  const visSpark  = kpis.visitors_trend   ?? [kpis.today_visitors ?? 0]
  const appSpark  = kpis.approvals_trend  ?? [kpis.pending_approvals ?? 0]
  const secSpark  = kpis.alerts_trend     ?? [kpis.security_alerts ?? 0]

  const kpiCards = [
    { icon: Users,           iconBg: 'bg-teal-400',   value: kpis.active_residents, label: 'Active Residents', pct: kpis.residents_change_pct,  sparkData: resSpark, sparkColor: '#0D9488' },
    { icon: UserCheck,       iconBg: 'bg-blue-400',   value: kpis.today_visitors,   label: "Today's Visitors", pct: kpis.visitors_change_pct,   sparkData: visSpark, sparkColor: '#3B82F6' },
    { icon: ClipboardCheck,  iconBg: 'bg-violet-400', value: kpis.pending_approvals,label: 'Pending Approvals',pct: kpis.approvals_change_pct,  sparkData: appSpark, sparkColor: '#8B5CF6' },
    { icon: Shield,          iconBg: 'bg-red-400',    value: kpis.security_alerts,  label: 'Security Alerts',  pct: kpis.alerts_change_pct,     sparkData: secSpark, sparkColor: '#EF4444' },
  ]

  const occupied     = occupancy.occupied_flats ?? kpis.occupied_flats
  const totalFlats   = society?.total_flats ?? occupancy.total_flats ?? kpis.total_flats
  const occupancyPct = occupied && totalFlats ? ((occupied / totalFlats) * 100).toFixed(1) : kpis.occupancy_pct ?? '—'
  const collRate     = collection.rate ?? kpis.collection_rate ?? '—'
  const activeStaff  = staff.total_staff ?? kpis.active_staff ?? '—'

  return (
    <div className="p-6 space-y-6">
      {/* ── Hero Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-1">{todayLabel()}</p>
          <h1 className="text-3xl font-extrabold text-foreground leading-tight">
            {greeting()},{' '}
            <span className="text-teal-500">{firstName(user?.full_name || user?.name)}.</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening at{' '}
            <span className="font-semibold text-foreground">{society?.name || 'your society'}</span> today.{' '}
            <span className="text-teal-500 font-medium">All systems operational.</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
          <button className="btn-teal flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Zap className="h-4 w-4" /> Quick Action
          </button>
        </div>
      </div>

      {/* ── Big KPI Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_,i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 h-44 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-muted mb-3"/>
              <div className="h-8 w-20 rounded bg-muted mb-2"/>
              <div className="h-3 w-32 rounded bg-muted"/>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpiCards.map((c) => <KpiCard key={c.label} {...c} />)}
        </div>
      )}

      {/* ── Secondary metrics ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: Wallet, iconBg: 'bg-teal-50', iconColor: 'text-teal-600',
            value: `${collRate}%`, label: 'Collection Rate',
            sub: 'Maintenance dues collected this month',
          },
          {
            icon: Building2, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
            value: `${occupancyPct}%`, label: 'Occupancy',
            sub: occupied && totalFlats ? `${occupied} of ${totalFlats} flats occupied` : 'Flats occupancy',
          },
          {
            icon: Users, iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
            value: activeStaff, label: 'Active Staff',
            sub: `Guards · Maintenance · Support`,
          },
        ].map(({ icon: Icon, iconBg, iconColor, value, label, sub }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground">{value ?? '—'}</div>
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Visitor Flow */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Visitor Flow</h3>
              <p className="text-xs text-muted-foreground">Guests · deliveries · services this week</p>
            </div>
            <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
              {VISITOR_TABS.map((t) => (
                <button key={t} onClick={() => setVisitorTab(t)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${visitorTab===t ? 'bg-teal-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {visitorFlow.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No visitor data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={visitorFlow} barSize={8} barGap={2} margin={{top:5,right:10,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(v) => <span className="text-muted-foreground capitalize">{v}</span>} />
                <Bar dataKey="guests"    name="Guests"    fill="#0D9488" radius={[3,3,0,0]} />
                <Bar dataKey="deliveries" name="Deliveries" fill="#3B82F6" radius={[3,3,0,0]} />
                <Bar dataKey="services"  name="Services"  fill="#8B5CF6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Residents Growth */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-foreground">Residents</h3>
              <p className="text-xs text-muted-foreground">6-month growth</p>
            </div>
            {kpis.residents_change_pct != null && (
              <span className="flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
                <TrendingUp className="h-3 w-3"/>+{kpis.residents_change_pct?.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex-1">
            {residentGrowth.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={residentGrowth} margin={{top:5,right:5,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0D9488" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
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
              <div className="text-xl font-extrabold text-foreground">{kpis.active_residents ?? '—'}</div>
              <div className="text-xs text-muted-foreground">Active now</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-foreground">{totalFlats ?? '—'}</div>
              <div className="text-xs text-muted-foreground">Total flats</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Live Activity */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Live Activity</h3>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-600">
              <Wifi className="h-3.5 w-3.5 animate-pulse" /> LIVE
            </span>
          </div>
          {recentActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.slice(0, 8).map((a, i) => {
                const name  = a.actor || a.user || 'System'
                const color = avatarColor(name)
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${color}`}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        <span className="font-semibold">{name}</span>{' '}
                        {a.action || a.description || a.event}
                        {(a.subject || a.target) && (
                          <> <span className="font-semibold">{a.subject || a.target}</span></>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.time_ago || timeAgo(a.timestamp)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Pending Approvals */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                Pending Approvals
                {pendingApprovals.length > 0 && (
                  <span className="ml-2 rounded-full bg-violet-100 text-violet-700 text-xs font-bold px-1.5">{pendingApprovals.length}</span>
                )}
              </h3>
              <button className="flex items-center gap-0.5 text-xs text-teal-600 font-medium hover:underline">
                View all <ChevronRight className="h-3 w-3"/>
              </button>
            </div>
            {pendingApprovals.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No pending approvals</p>
            ) : (
              <div className="space-y-2">
                {pendingApprovals.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(item.requester || item.title)}`}>
                      {initials(item.requester || item.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{item.title || item.type}</span>
                        {item.priority && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_CLS[item.priority?.toLowerCase()] || 'bg-muted text-muted-foreground'}`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[item.requester, item.flat_info, item.stage].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live at Gate */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                Live at Gate
                {liveVisitors.length > 0 && (
                  <span className="ml-2 rounded-full bg-teal-100 text-teal-700 text-xs font-bold px-1.5">{liveVisitors.length}</span>
                )}
              </h3>
              <button className="flex items-center gap-0.5 text-xs text-teal-600 font-medium hover:underline">
                View all <ChevronRight className="h-3 w-3"/>
              </button>
            </div>
            {liveVisitors.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No active visitors</p>
            ) : (
              <div className="space-y-3">
                {liveVisitors.slice(0, 5).map((v, i) => {
                  const name    = v.full_name || v.name || 'Visitor'
                  const vType   = (v.visit_type || v.type || '').toLowerCase()
                  const typeCls = VISIT_CLS[vType] || 'bg-gray-100 text-gray-600'
                  return (
                    <div key={v.id ?? i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(name)}`}>
                        {initials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{name}</span>
                          {vType && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${typeCls}`}>
                              {v.visit_type || v.type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{v.purpose || v.flat_info || v.destination}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono text-foreground">{v.time || v.check_in_time}</div>
                        <div className="text-[10px] font-semibold text-teal-500">Live</div>
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

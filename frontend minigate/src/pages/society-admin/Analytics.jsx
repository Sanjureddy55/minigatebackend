import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { selectSociety } from '../../store/slices/authSlice.js'
import { societyService } from '../../services/society.service.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
function inrK(v) {
  const n = Number(v)
  if (isNaN(n)) return '0'
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000)    return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

// "Jan 2025" → "Jan"
function shortMonth(str) {
  if (!str) return ''
  return str.split(' ')[0]
}

function Bone({ className = '' }) {
  return <div className={`rounded bg-muted animate-pulse ${className}`} />
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{
            typeof p.value === 'number' && p.value > 999
              ? `₹${inrK(p.value)}`
              : p.value
          }</span>
        </p>
      ))}
    </div>
  )
}

// ── Donut legend ──────────────────────────────────────────────────────────────
function DonutLegend({ data }) {
  return (
    <div className="flex items-center justify-center gap-6 mt-4">
      {data.map(d => (
        <div key={d.name} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
          <span className="text-xs text-muted-foreground">
            {d.name}: <span className="font-semibold text-foreground">{d.value}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Period tabs ───────────────────────────────────────────────────────────────
const PERIODS = [
  { key: '7d',  label: '7D'  },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '1y',  label: '1Y'  },
]

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SocietyAnalytics() {
  const society = useSelector(selectSociety)
  const [period, setPeriod] = useState('30d')

  // Main analytics API — now includes owners/tenants in occupancy
  const { data: raw, isLoading } = useQuery({
    queryKey: ['society-analytics', society?.id, period],
    queryFn: () =>
      societyService.getAnalytics({ society: society?.id, period })
        .then(r => r.data?.data ?? r.data),
    enabled:  !!society?.id,
    staleTime: 60_000,
  })

  // Dashboard for daily visitor flow (Mon–Sun)
  const { data: dashRaw } = useQuery({
    queryKey: ['dashboard-visitor-flow', society?.id],
    queryFn: () =>
      societyService.getDashboard({ society: society?.id, flow_days: 7 })
        .then(r => r.data?.data ?? r.data),
    enabled:  !!society?.id,
    staleTime: 60_000,
  })

  // ── Map API fields ──────────────────────────────────────────────────────────
  const occupancy    = raw?.occupancy        ?? {}
  const collTrend    = raw?.collection_trend ?? []   // [{month:"Jan 2025", amount, count}]

  // Revenue chart — single "Collected" area, short month labels
  const revenueData = collTrend.map(r => ({
    month: shortMonth(r.month),
    collected: r.amount,
  }))

  // Resident split donut — owners/tenants now come from analytics occupancy
  const owners  = occupancy.owners  ?? 0
  const tenants = occupancy.tenants ?? 0
  const donutData = (owners + tenants) > 0
    ? [
        { name: 'Owners',  value: owners,  color: '#1D4ED8' },
        { name: 'Tenants', value: tenants, color: '#22D3EE' },
      ]
    : []

  // Visitor trend — daily breakdown from dashboard visitor_flow
  const visitorFlow = (dashRaw?.visitor_flow ?? []).map(d => {
    const date = new Date(d.date + 'T00:00:00')
    const day  = date.toLocaleDateString('en-US', { weekday: 'short' })
    return {
      day,
      Guests:     d.guest    ?? 0,
      Deliveries: d.delivery ?? 0,
      Services:   d.service  ?? 0,
    }
  })

  return (
    <div className="p-6 space-y-5">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operational insights across the platform
          </p>
        </div>
        {/* Period tabs */}
        <div className="flex gap-0.5 bg-muted/40 rounded-xl p-1">
          {PERIODS.map(({ key, label }) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors
                ${period === key ? 'bg-teal-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ROW 1: Revenue chart + Resident split ── */}
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">

        {/* Maintenance Revenue — single area (Collected) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground text-sm">Maintenance revenue (₹k)</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Monthly maintenance collection
          </p>
          {isLoading ? (
            <Bone className="h-56 w-full" />
          ) : revenueData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              No collection data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => inrK(v)}
                />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fill="url(#gradRevenue)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Resident split donut */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
          <h3 className="font-semibold text-foreground text-sm">Resident split</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">Owners vs tenants</p>

          <div className="flex-1 flex flex-col items-center justify-center">
            {isLoading ? (
              <Bone className="h-44 w-44 rounded-full" />
            ) : donutData.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8">No resident data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [val, name]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <DonutLegend data={donutData} />
              </>
            )}
          </div>

          {/* Occupancy summary */}
          {!isLoading && occupancy.total_flats > 0 && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
              {[
                { label: 'Total Flats',  value: occupancy.total_flats    },
                { label: 'Occupied',     value: occupancy.occupied_flats  },
                { label: 'Vacant',       value: occupancy.vacant_flats    },
                { label: 'Residents',    value: occupancy.total_residents },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 2: Visitor Trend (full width) ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground text-sm">Visitor trend</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Daily breakdown — guests, deliveries, services (last 7 days)
        </p>

        {isLoading ? (
          <Bone className="h-56 w-full" />
        ) : visitorFlow.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
            No visitor data for this week
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={visitorFlow} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTip />} />
              <Line type="monotone" dataKey="Guests"     stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Deliveries" stroke="#22D3EE" strokeWidth={2} dot={{ r: 3, fill: '#22D3EE' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Services"   stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── ROW 3: Complaint breakdown (only if data exists) ── */}
      {!isLoading && (raw?.complaint_chart?.by_category?.length > 0 || raw?.complaint_chart?.monthly?.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {raw.complaint_chart.by_category.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">Complaints by category</h3>
              <div className="space-y-2.5">
                {raw.complaint_chart.by_category.map(({ category, count }) => {
                  const max = Math.max(...raw.complaint_chart.by_category.map(c => c.count))
                  const pct = max > 0 ? Math.round((count / max) * 100) : 0
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize text-foreground font-medium">{category}</span>
                        <span className="text-muted-foreground tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {raw.complaint_chart.monthly.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">Monthly complaints</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={raw.complaint_chart.monthly.map(d => ({ ...d, month: shortMonth(d.month) }))}
                  margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradComplaints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="count" name="Complaints"
                    stroke="#F59E0B" strokeWidth={2} fill="url(#gradComplaints)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

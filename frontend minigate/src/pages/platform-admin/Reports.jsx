import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Download, CreditCard, Building2, Users, Globe, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { platformService } from '../../services/platform.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'

const PLAN_COLORS = {
  enterprise: '#8B5CF6',
  pro:        '#3B82F6',
  starter:    '#A855F7',
  free:       '#F59E0B',
  trial:      '#F59E0B',
}

function fmt(n) {
  if (n == null) return '—'
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toLocaleString('en-IN')}`
}

function KpiCard({ icon: Icon, iconBg, iconColor, value, label, sub, subColor }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-foreground leading-tight">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {sub && <div className={`text-xs mt-0.5 font-medium ${subColor || 'text-muted-foreground'}`}>{sub}</div>}
      </div>
    </div>
  )
}

const CustomBar = (props) => {
  const { x, y, width, height } = props
  return <rect x={x} y={y} width={width} height={height} fill="#0D9488" rx={4} ry={4} />
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-teal-600 font-bold">{fmt(payload[0]?.value)}</p>
    </div>
  )
}

export default function PlatformReports() {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: () => platformService.getReportsDashboard().then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  })

  const kpi   = raw?.kpi              ?? {}
  const chart = raw?.mrr_chart        ?? []
  const plans = raw?.plan_distribution ?? []
  const topSocieties = raw?.top_societies ?? []

  const mrrGrowthPos = (kpi.mrr_growth_pct ?? 0) >= 0

  const kpiCards = [
    {
      icon: CreditCard, iconBg: 'bg-teal-50', iconColor: 'text-teal-600',
      value: isLoading ? '…' : fmt(kpi.mrr),
      label: 'MRR',
      sub: isLoading ? null : `${mrrGrowthPos ? '+' : ''}${(kpi.mrr_growth_pct ?? 0).toFixed(1)}% vs last month`,
      subColor: mrrGrowthPos ? 'text-teal-600' : 'text-destructive',
    },
    {
      icon: Building2, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
      value: isLoading ? '…' : kpi.active_societies ?? '—',
      label: 'Active Societies',
      sub: isLoading ? null : `${kpi.new_this_quarter ?? 0} new this quarter`,
    },
    {
      icon: Users, iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
      value: isLoading ? '…' : (kpi.total_users ?? '—').toLocaleString?.() ?? kpi.total_users,
      label: 'Total Users',
      sub: isLoading ? null : `${kpi.active_users ?? 0} active`,
    },
    {
      icon: Globe, iconBg: 'bg-gray-100', iconColor: 'text-gray-600',
      value: isLoading ? '…' : kpi.cities ?? '—',
      label: 'Cities',
      sub: 'across 8 states',
    },
  ]

  const maxPlanCount = Math.max(...plans.map((p) => p.count), 1)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Global Reports"
        description="Cross-tenant analytics and platform usage"
        actions={
          <button
            onClick={() => toast.info('Export started')}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((c) => <KpiCard key={c.label} {...c} />)}
      </div>

      {/* MRR Chart + Plan Distribution */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* MRR Growth Bar Chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-foreground">MRR Growth (₹L)</h3>
          </div>
          {chart.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart} barSize={40} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="mrr" shape={<CustomBar />} radius={[4, 4, 0, 0]}>
                  {chart.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={i === chart.length - 1 ? '#0D9488' : '#99F6E4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Plan Distribution */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-5">Plan Distribution</h3>
          {plans.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <div className="space-y-4">
              {plans.map((p) => {
                const color = PLAN_COLORS[p.plan] || '#6B7280'
                const pct   = ((p.count / maxPlanCount) * 100).toFixed(0)
                return (
                  <div key={p.plan}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.count} societies</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    {p.est_mrr > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{fmt(p.est_mrr)} est. MRR</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Revenue Societies */}
      {topSocieties.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Top Revenue Societies</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-3 text-left font-medium">Society</th>
                  <th className="px-5 py-3 text-left font-medium hidden sm:table-cell">City</th>
                  <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Flats</th>
                  <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Plan</th>
                  <th className="px-5 py-3 text-left font-medium">Monthly Revenue</th>
                  <th className="px-5 py-3 text-left font-medium hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {topSocieties.map((s, i) => (
                  <tr key={s.id ?? i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground">{s.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{s.city || '—'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{s.total_flats ?? '—'}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium capitalize">
                        {s.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-teal-600">{fmt(s.monthly_revenue)}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

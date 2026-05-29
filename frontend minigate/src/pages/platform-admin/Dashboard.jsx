import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Users, Ticket, DollarSign, Download, RefreshCw } from 'lucide-react'
import { platformService } from '../../services/platform.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { DataTable } from '../../components/shared/DataTable.jsx'
import { StatusBadge } from '../../components/shared/StatusBadge.jsx'
import { formatCurrency } from '../../utils/formatters.js'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'

function formatCompact(n) {
  if (n == null) return '—'
  const num = Number(n)
  if (num >= 10_000_000) return `${(num / 100_000).toFixed(1)}Cr`
  if (num >= 100_000) return `${(num / 100_000).toFixed(1)}L`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

export default function PlatformDashboard() {
  const qc = useQueryClient()

  const { data: statsData, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => platformService.getDashboardStats().then((r) => r.data.data || r.data),
  })

  const { data: societiesData, isLoading: socsLoading } = useQuery({
    queryKey: ['platform-societies'],
    queryFn: () => platformService.getDashboardSocieties({ page_size: 8 }).then((r) => r.data),
  })

  const stats = statsData || {}
  const societies = societiesData?.results || []

  const statCards = [
    {
      title: 'Total Societies',
      value: stats.total_societies ?? '—',
      sub: stats.new_societies_this_month != null
        ? `${stats.new_societies_this_month >= 0 ? '+' : ''}${stats.new_societies_this_month} this month`
        : `${stats.active_societies ?? 0} active`,
      icon: Building2,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Active Users',
      value: formatCompact(stats.active_users),
      sub: stats.users_mom_change != null
        ? `${stats.users_mom_change >= 0 ? '+' : ''}${formatCompact(stats.users_mom_change)} MoM`
        : 'Active users',
      icon: Users,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Open Tickets',
      value: stats.open_tickets ?? '—',
      sub: stats.societies_with_tickets != null
        ? `Across ${stats.societies_with_tickets} societies`
        : undefined,
      icon: Ticket,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      title: 'MRR',
      value: formatCurrency(stats.mrr),
      sub: stats.mrr_mom_pct != null
        ? `${stats.mrr_mom_pct >= 0 ? '+' : ''}${stats.mrr_mom_pct}% MoM`
        : undefined,
      icon: DollarSign,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
  ]

  const columns = [
    { header: 'Society', accessor: 'name', render: (v) => <span className="font-medium text-foreground">{v}</span> },
    { header: 'City',    accessor: 'city_name', render: (v) => v || '—' },
    { header: 'Plan',    accessor: 'plan_display', render: (v) => v || '—' },
    { header: 'Users',   accessor: 'user_count' },
    { header: 'Status',  accessor: 'status', render: (v) => <StatusBadge status={v} /> },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Global Dashboard"
        description="Platform-wide health, activity, and society KPIs."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['platform-stats'] })}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        }
      />

      {statsLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={societies}
        loading={socsLoading}
        emptyTitle="No societies yet"
        emptyDescription="Create your first society to get started."
        searchable
        searchPlaceholder="Search global dashboard…"
      />
    </div>
  )
}

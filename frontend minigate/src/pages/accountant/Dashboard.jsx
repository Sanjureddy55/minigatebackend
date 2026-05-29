import { useQuery } from '@tanstack/react-query'
import { Wallet, Receipt, TrendingUp, AlertCircle, Users, FileText } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { accountantService } from '../../services/accountant.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'
import { formatCurrency } from '../../utils/formatters.js'

export default function AccountantDashboard() {
  const society = useSelector(selectSociety)

  const { data, isLoading } = useQuery({
    queryKey: ['accountant-dashboard', society?.id],
    queryFn: () => accountantService.getDashboard(society?.id).then((r) => r.data?.data || r.data),
  })

  const d = data || {}

  const statCards = [
    {
      title: 'Collected This Month',
      value: formatCurrency(d.collected_this_month || 0),
      icon: TrendingUp,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'Outstanding Dues',
      value: formatCurrency(d.outstanding || 0),
      icon: AlertCircle,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      title: 'Avg Collection',
      value: d.avg_collection_pct != null ? `${d.avg_collection_pct}%` : '—',
      icon: Wallet,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Defaulters (Flats)',
      value: d.defaulters ?? '—',
      icon: Users,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    {
      title: 'Receipts',
      value: d.receipts_count ?? '—',
      icon: Receipt,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Statements',
      value: d.statements_count ?? '—',
      icon: FileText,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Accounts Dashboard"
        description={`${society?.name || 'Society'} · Financial overview`}
      />
      {isLoading ? (
        <CardsSkeleton count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      )}
    </div>
  )
}

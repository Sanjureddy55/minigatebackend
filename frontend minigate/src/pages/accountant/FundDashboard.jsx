import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { selectSociety } from '../../store/slices/authSlice.js'
import { accountantService } from '../../services/accountant.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { StatCard } from '../../components/shared/StatCard.jsx'
import { CardsSkeleton } from '../../components/shared/LoadingSkeleton.jsx'
import { formatCurrency, formatDate } from '../../utils/formatters.js'
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'

export default function AccountantFundDashboard() {
  const society = useSelector(selectSociety)

  const { data, isLoading } = useQuery({
    queryKey: ['accountant-fund-dashboard', society?.id],
    queryFn: () =>
      accountantService.getFundDashboard(society?.id).then((r) => r.data?.data || r.data),
  })

  const kpi = data?.kpi || {}
  const latestExpenses = data?.latest_expenses || []
  const monthlyTrend = data?.monthly_trend || []

  const statCards = [
    {
      title: 'Total Collected',
      value: formatCurrency(kpi.total_collected || 0),
      icon: PiggyBank,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'This Month Income',
      value: formatCurrency(kpi.this_month_collection || 0),
      icon: TrendingUp,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'This Month Expenses',
      value: formatCurrency(kpi.this_month_expenses || 0),
      icon: TrendingDown,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    {
      title: 'Remaining Balance',
      value: formatCurrency(kpi.remaining_balance || 0),
      icon: Wallet,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Fund Dashboard" description="Society fund overview and health" />

      {isLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Usage summary */}
          {kpi.usage_pct != null && (
            <div className="card-premium p-5">
              <h3 className="font-semibold text-foreground mb-3">{kpi.usage_label || 'Fund Usage'}</h3>
              <div className="flex items-center gap-4 mb-2">
                <div className="text-3xl font-bold gradient-text">{kpi.usage_pct}%</div>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-primary transition-all duration-500"
                    style={{ width: `${Math.min(kpi.usage_pct, 100)}%` }}
                  />
                </div>
              </div>
              {kpi.usage_description && (
                <p className="text-xs text-muted-foreground">{kpi.usage_description}</p>
              )}
              <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
                <span className="text-muted-foreground">Pending Dues</span>
                <span className="font-semibold text-warning">{formatCurrency(kpi.pending_dues || 0)}</span>
              </div>
            </div>
          )}

          {/* Latest Expenses */}
          {latestExpenses.length > 0 && (
            <div className="card-premium p-5">
              <h3 className="font-semibold text-foreground mb-4">Latest Expenses</h3>
              <div className="space-y-2">
                {latestExpenses.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{e.category_display || e.category} · {formatDate(e.expense_date)}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(e.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Trend */}
          {monthlyTrend.length > 0 && (
            <div className="card-premium p-5 lg:col-span-2">
              <h3 className="font-semibold text-foreground mb-4">Monthly Trend</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left pb-2">Month</th>
                      <th className="text-right pb-2">Collected</th>
                      <th className="text-right pb-2">Expenses</th>
                      <th className="text-right pb-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyTrend.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2 text-foreground">{row.month}</td>
                        <td className="py-2 text-right text-success font-medium">{formatCurrency(row.collected)}</td>
                        <td className="py-2 text-right text-destructive">{formatCurrency(row.expenses)}</td>
                        <td className={`py-2 text-right font-semibold ${row.net >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!latestExpenses.length && !monthlyTrend.length && (
            <div className="lg:col-span-2 card-premium p-8 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">Fund data not available</p>
              <p className="text-sm text-muted-foreground mt-1">Fund details will appear here once configured.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

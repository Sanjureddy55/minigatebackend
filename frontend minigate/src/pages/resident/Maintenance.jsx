import { useQuery } from '@tanstack/react-query'
import { TrendingUp, CheckCircle2, Info } from 'lucide-react'
import { residentService } from '../../services/resident.service.js'
import { PageHeader } from '../../components/shared/PageHeader.jsx'
import { formatCurrency, formatDate } from '../../utils/formatters.js'

export default function ResidentMaintenance() {
  const { data, isLoading } = useQuery({
    queryKey: ['resident-maintenance'],
    queryFn: () => residentService.getMaintenanceTransparency().then((r) => r.data?.data || r.data),
  })

  const d = data || {}

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Maintenance Transparency"
        description="See how your maintenance funds are being used"
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium p-4 space-y-2">
              <div className="shimmer h-4 w-48 rounded bg-muted" />
              <div className="shimmer h-3 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card-premium p-5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Collected</p>
              <p className="text-2xl font-bold gradient-text">{formatCurrency(d.total_collected || 0)}</p>
            </div>
            <div className="card-premium p-5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(d.total_spent || 0)}</p>
            </div>
            <div className="card-premium p-5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className="text-2xl font-bold text-success">{formatCurrency((d.total_collected || 0) - (d.total_spent || 0))}</p>
            </div>
          </div>

          {/* Expense breakdown */}
          {(d.expenses || []).length > 0 && (
            <div className="card-premium p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Recent Expenses
              </h3>
              <div className="space-y-2">
                {d.expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{e.category} · {formatDate(e.expense_date || e.created_at)}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(e.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects / Initiatives */}
          {(d.projects || d.initiatives || []).length > 0 && (
            <div className="card-premium p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Ongoing Projects
              </h3>
              <div className="space-y-3">
                {(d.projects || d.initiatives).map((p, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{p.name || p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.progress || 0}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${p.progress || 0}%` }}
                      />
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!d.total_collected && !d.expenses?.length && (
            <div className="card-premium p-8 text-center">
              <Info className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">No data available</p>
              <p className="text-sm text-muted-foreground mt-1">Maintenance transparency data will appear here once published by the admin.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

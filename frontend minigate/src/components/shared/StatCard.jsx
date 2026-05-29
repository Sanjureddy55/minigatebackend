import { cn } from '../../utils/cn.js'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  trend,
  trendLabel,
  loading,
  className,
}) {
  const trendUp = trend > 0
  const trendNeutral = trend === 0 || trend == null

  return (
    <div className={cn('card-premium p-5', className)}>
      {loading ? (
        <div className="space-y-3">
          <div className="shimmer h-3 w-24 rounded bg-muted" />
          <div className="shimmer h-7 w-16 rounded bg-muted" />
          <div className="shimmer h-3 w-32 rounded bg-muted" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {title}
              </p>
              <p className="mt-1.5 text-2xl font-bold text-foreground tracking-tight">{value}</p>
              {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
            </div>
            {Icon && (
              <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', iconBg)}>
                <Icon className={cn('h-5 w-5', iconColor)} />
              </div>
            )}
          </div>

          {trend != null && (
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              {trendNeutral ? (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              ) : trendUp ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span
                className={cn(
                  'font-semibold',
                  trendNeutral
                    ? 'text-muted-foreground'
                    : trendUp
                    ? 'text-success'
                    : 'text-destructive'
                )}
              >
                {trendNeutral ? '—' : `${trendUp ? '+' : ''}${trend}%`}
              </span>
              {trendLabel && (
                <span className="text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

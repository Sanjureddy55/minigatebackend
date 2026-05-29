import { cn } from '../../utils/cn.js'

const STATUS_STYLES = {
  // General
  active:    'bg-success/15 text-success border-success/25',
  inactive:  'bg-muted text-muted-foreground border-border',
  pending:   'bg-warning/15 text-warning border-warning/25',
  approved:  'bg-success/15 text-success border-success/25',
  rejected:  'bg-destructive/15 text-destructive border-destructive/25',
  suspended: 'bg-destructive/15 text-destructive border-destructive/25',
  // Payment / Dues
  paid:      'bg-success/15 text-success border-success/25',
  unpaid:    'bg-destructive/15 text-destructive border-destructive/25',
  overdue:   'bg-destructive/15 text-destructive border-destructive/25',
  partial:   'bg-warning/15 text-warning border-warning/25',
  // Complaints
  open:      'bg-warning/15 text-warning border-warning/25',
  resolved:  'bg-success/15 text-success border-success/25',
  closed:    'bg-muted text-muted-foreground border-border',
  // Expense
  published: 'bg-success/15 text-success border-success/25',
  draft:     'bg-muted text-muted-foreground border-border',
  // Priority
  urgent:    'bg-destructive/15 text-destructive border-destructive/25',
  high:      'bg-warning/15 text-warning border-warning/25',
  medium:    'bg-info/15 text-info border-info/25',
  low:       'bg-muted text-muted-foreground border-border',
  normal:    'bg-muted text-muted-foreground border-border',
}

export function StatusBadge({ status, label, className }) {
  const key = (status || '').toLowerCase()
  const style = STATUS_STYLES[key] || 'bg-muted text-muted-foreground border-border'
  const text = label || status || '—'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize',
        style,
        className
      )}
    >
      {text}
    </span>
  )
}

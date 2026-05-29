import { useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '../../utils/cn.js'
import { EmptyState } from './EmptyState.jsx'
import { TableSkeleton } from './LoadingSkeleton.jsx'

export function DataTable({
  columns,
  data = [],
  loading,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyIcon,
  searchable,
  searchPlaceholder = 'Search…',
  actions,
  pagination,
  onPageChange,
  className,
}) {
  const [search, setSearch] = useState('')

  const filtered = searchable
    ? data.filter((row) => {
        const q = search.toLowerCase()
        return columns.some((col) => {
          const val = col.accessor ? row[col.accessor] : ''
          return String(val || '').toLowerCase().includes(q)
        })
      })
    : data

  return (
    <div className={cn('card-premium overflow-hidden', className)}>
      {/* Toolbar */}
      {(searchable || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          {searchable && (
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col) => (
                <th
                  key={col.key || col.accessor}
                  className={cn(
                    'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <TableSkeleton rows={6} cols={columns.length} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={row.id || i}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key || col.accessor}
                      className={cn('px-4 py-3 text-sm text-foreground', col.cellClassName)}
                    >
                      {col.render ? col.render(row[col.accessor], row) : row[col.accessor] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-semibold text-foreground">{(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span>{' '}
            of <span className="font-semibold text-foreground">{pagination.total}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-xs font-medium text-foreground">
              {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize) || 1}
            </span>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

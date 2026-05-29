import type { ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Download, Filter, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export interface ModuleStat {
  label: string;
  value: string | number;
  hint?: string;
}

export interface ModuleColumn {
  key: string;
  label: string;
  badge?: boolean;
}

export interface ModulePageProps {
  title: string;
  description?: string;
  primaryAction?: string;
  stats?: ModuleStat[];
  columns?: ModuleColumn[];
  rows?: Array<Record<string, string | number>>;
  children?: ReactNode;
}

export function ModulePage({
  title,
  description,
  primaryAction = "Create",
  stats = [],
  columns = [],
  rows = [],
  children,
}: ModulePageProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> {primaryAction}
            </Button>
          </>
        }
      />
      <div className="space-y-6 p-6">
        {stats.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{s.value}</div>
                {s.hint && <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>}
              </div>
            ))}
          </div>
        )}

        {children}

        {columns.length > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border p-3">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-background px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder={`Search ${title.toLowerCase()}…`}
                />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Filter
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    {columns.map((c) => (
                      <th key={c.key} className="px-4 py-2.5 font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      {columns.map((c) => {
                        const v = String(row[c.key] ?? "");
                        return (
                          <td key={c.key} className="px-4 py-3">
                            {c.badge ? <StatusBadge status={v} /> : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No records yet. Click <span className="font-medium text-foreground">{primaryAction}</span> to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

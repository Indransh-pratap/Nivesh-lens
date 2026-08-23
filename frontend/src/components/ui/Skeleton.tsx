import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-[var(--radius-sm)] bg-accent border border-border/60", className)}
      {...props}
    />
  );
}

/** Mirrors a KPI stat card's real layout (label, big number, delta line) instead of a plain box. */
export function KPICardSkeleton() {
  return (
    <div className="p-5 rounded-[var(--radius-lg)] border border-border bg-card space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Mirrors a chart card's real layout (title + bars/axis) instead of a plain box. */
export function ChartSkeleton({ bars = 6 }: { bars?: number }) {
  return (
    <div className="p-5 rounded-[var(--radius-lg)] border border-border bg-card space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-14" />
      </div>
      <div className="flex items-end gap-2 h-32">
        {Array.from({ length: bars }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${35 + ((i * 17) % 60)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Mirrors a table row's real layout (avatar/label + a couple of numeric columns). */
export function TableRowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

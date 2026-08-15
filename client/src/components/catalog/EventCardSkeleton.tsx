export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)]">
      <div className="h-48 w-full animate-pulse bg-[#262626]" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#262626]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#1e1e1e]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#1e1e1e]" />
        <div className="mt-3 h-8 w-24 animate-pulse rounded-full bg-[#262626]" />
      </div>
    </div>
  );
}

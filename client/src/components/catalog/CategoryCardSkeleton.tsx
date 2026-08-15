export function CategoryCardSkeleton() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6"
      style={{ minWidth: '200px', minHeight: '200px' }}
    >
      <div className="size-12 animate-pulse rounded-full bg-[#262626]" />
      <div className="h-4 w-28 animate-pulse rounded bg-[#262626]" />
      <div className="h-3 w-20 animate-pulse rounded bg-[#1e1e1e]" />
    </div>
  );
}

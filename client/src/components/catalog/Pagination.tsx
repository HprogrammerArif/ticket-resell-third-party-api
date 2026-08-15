'use client';

import { useRouter } from '@/libs/I18nNavigation';

export function Pagination(props: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string>;
}) {
  const router = useRouter();

  function goTo(page: number) {
    const params = new URLSearchParams({ ...props.searchParams, page: String(page) });
    router.push(`${props.basePath}?${params.toString()}`);
  }

  if (props.totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => goTo(props.currentPage - 1)}
        disabled={props.currentPage <= 1}
        className="rounded-full border border-[var(--color-surface-border)] px-4 py-2 text-[14px] text-white disabled:opacity-40 hover:bg-[var(--color-surface-raised)]"
      >
        ← Prev
      </button>

      <span className="text-[14px] text-[var(--color-text-secondary)]">
        {props.currentPage} / {props.totalPages}
      </span>

      <button
        type="button"
        onClick={() => goTo(props.currentPage + 1)}
        disabled={props.currentPage >= props.totalPages}
        className="rounded-full border border-[var(--color-surface-border)] px-4 py-2 text-[14px] text-white disabled:opacity-40 hover:bg-[var(--color-surface-raised)]"
      >
        Next →
      </button>
    </div>
  );
}

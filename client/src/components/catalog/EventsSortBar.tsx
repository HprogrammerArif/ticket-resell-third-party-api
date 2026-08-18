'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, usePathname } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';
import type { EventFilters } from './EventsFilterSidebar';

/* ─── Sort options mapped to TN API sort values ──────────────────────────────── */

const SORT_OPTIONS = [
  { key: 'date_asc', value: 'date/date asc' },
  { key: 'date_desc', value: 'date/date desc' },
  { key: 'price_asc', value: 'pricingInfo/lowPrice/value asc' },
  { key: 'price_desc', value: 'pricingInfo/lowPrice/value desc' },
  { key: 'name_asc', value: 'text/name asc' },
  { key: 'popularity', value: 'salesRank desc' },
] as const;

/* ─── Category label lookup (for active filter chips) ────────────────────────── */

const CATEGORY_LABELS: Record<string, string> = {
  concerts: 'cat_concerts',
  sports: 'cat_sports',
  theatre: 'cat_theatre',
  comedy: 'cat_comedy',
  family: 'cat_family',
  festivals: 'cat_festivals',
};

/* ─── Time of day label lookup ───────────────────────────────────────────────── */

const TOD_LABELS: Record<string, string> = {
  before_12pm: 'time_morning',
  after_12pm: 'time_afternoon',
  after_6pm: 'time_evening',
  after_9pm: 'time_night',
};

/* ─── Types ──────────────────────────────────────────────────────────────────── */

type Props = {
  totalCount: number;
  currentSort: string;
  currentView: 'grid' | 'list';
  activeFilters: EventFilters;
  onToggleFilters: () => void;
};

/* ─── Component ──────────────────────────────────────────────────────────────── */

export function EventsSortBar({ totalCount, currentSort, currentView, activeFilters, onToggleFilters }: Props) {
  const t = useTranslations('EventsPage');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState(currentView);

  useEffect(() => {
    setView(currentView);
  }, [currentView]);

  /* Build URL preserving existing filters + adding sort/view */
  const buildUrl = useCallback((overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (activeFilters.keyword) params.set('keyword', activeFilters.keyword);
    if (activeFilters.categoryPath) params.set('categoryPath', activeFilters.categoryPath);
    if (activeFilters.city) params.set('city', activeFilters.city);
    if (activeFilters.dateFrom) params.set('dateFrom', activeFilters.dateFrom);
    if (activeFilters.dateTo) params.set('dateTo', activeFilters.dateTo);
    if (activeFilters.timeOfDay) params.set('timeOfDay', activeFilters.timeOfDay);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [activeFilters, pathname]);

  const changeSort = useCallback((sortValue: string) => {
    startTransition(() => {
      router.push(buildUrl({ sort: sortValue, view: view }));
    });
  }, [buildUrl, router, view]);

  const toggleView = useCallback(() => {
    const next = view === 'grid' ? 'list' : 'grid';
    setView(next);
    startTransition(() => {
      router.push(buildUrl({ view: next }));
    });
  }, [view, buildUrl, router]);

  /* Remove a single filter */
  const removeFilter = useCallback((key: keyof EventFilters) => {
    const params = new URLSearchParams();
    if (key !== 'keyword' && activeFilters.keyword) params.set('keyword', activeFilters.keyword);
    if (key !== 'categoryPath' && activeFilters.categoryPath) params.set('categoryPath', activeFilters.categoryPath);
    if (key !== 'city' && activeFilters.city) params.set('city', activeFilters.city);
    if (key !== 'dateFrom' && activeFilters.dateFrom) params.set('dateFrom', activeFilters.dateFrom);
    if (key !== 'dateTo' && activeFilters.dateTo) params.set('dateTo', activeFilters.dateTo);
    if (key !== 'timeOfDay' && activeFilters.timeOfDay) params.set('timeOfDay', activeFilters.timeOfDay);
    // Also remove dateTo if removing dateFrom (they're a pair)
    if (key === 'dateFrom') params.delete('dateTo');
    if (key === 'dateTo') params.delete('dateFrom');
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [activeFilters, pathname, router]);

  const activeFilterChips: { key: keyof EventFilters; label: string }[] = [];
  if (activeFilters.keyword) activeFilterChips.push({ key: 'keyword', label: `"${activeFilters.keyword}"` });
  if (activeFilters.categoryPath) {
    const labelKey = CATEGORY_LABELS[activeFilters.categoryPath];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeFilterChips.push({ key: 'categoryPath', label: labelKey ? t(labelKey as any) : activeFilters.categoryPath });
  }
  if (activeFilters.city) activeFilterChips.push({ key: 'city', label: activeFilters.city });
  if (activeFilters.dateFrom || activeFilters.dateTo) {
    const label = [activeFilters.dateFrom, activeFilters.dateTo].filter(Boolean).join(' → ');
    activeFilterChips.push({ key: 'dateFrom', label });
  }
  if (activeFilters.timeOfDay) {
    const labelKey = TOD_LABELS[activeFilters.timeOfDay];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeFilterChips.push({ key: 'timeOfDay', label: labelKey ? t(labelKey as any) : activeFilters.timeOfDay });
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Top bar: result count + sort + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: mobile filter button + result count */}
        <div className="flex items-center gap-3">
          {/* Mobile filter toggle */}
          <button
            type="button"
            onClick={onToggleFilters}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5
              text-[13px] font-medium text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {t('filters')}
          </button>

          <p className="text-[14px] text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-jakarta)' }}>
            <span className="font-semibold text-white">{totalCount.toLocaleString()}</span>{' '}
            {totalCount === 1 ? 'event' : 'events'} found
          </p>
        </div>

        {/* Right: sort + view toggle */}
        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={currentSort || 'date/date asc'}
              onChange={e => changeSort(e.target.value)}
              className="appearance-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-4 pr-10
                text-[13px] text-[var(--color-text-secondary)] outline-none cursor-pointer
                transition-colors hover:bg-white/10 focus:border-[var(--color-brand-muted)]"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.value} className="bg-[#1a1a1a] text-white">
                  {t(`sort_${opt.key}`)}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* View toggle */}
          <div className="hidden items-center rounded-xl border border-white/10 sm:flex">
            <button
              type="button"
              onClick={() => { if (view !== 'grid') toggleView(); }}
              title={t('view_grid')}
              className={`rounded-l-xl p-2.5 transition-colors ${view === 'grid' ? 'bg-white/10 text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => { if (view !== 'list') toggleView(); }}
              title={t('view_list')}
              className={`rounded-r-xl p-2.5 transition-colors ${view === 'list' ? 'bg-white/10 text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {t('active_filters')}:
          </span>
          {activeFilterChips.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeFilter(chip.key)}
              className="group flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/30
                bg-[var(--color-brand)]/10 px-3 py-1 text-[12px] font-medium text-[var(--color-brand)]
                transition-all hover:border-[var(--color-brand)]/60 hover:bg-[var(--color-brand)]/20"
            >
              {chip.label}
              <svg
                className="size-3 opacity-60 transition-opacity group-hover:opacity-100"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              startTransition(() => { router.push(pathname); });
            }}
            className="text-[11px] font-medium text-[var(--color-text-muted)] hover:text-white transition-colors"
          >
            {t('clear_filters')}
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
          <div className="size-3 animate-spin rounded-full border border-white/20 border-t-[var(--color-brand)]" />
          Updating...
        </div>
      )}
    </div>
  );
}

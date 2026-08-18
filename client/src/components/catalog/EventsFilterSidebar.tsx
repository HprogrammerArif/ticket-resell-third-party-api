'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, usePathname } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';

/* ─── Category pill definitions ──────────────────────────────────────────────── */

const CATEGORIES = [
  { key: 'all', path: '', emoji: '🎟️' },
  { key: 'concerts', path: 'concerts', emoji: '🎵' },
  { key: 'sports', path: 'sports', emoji: '🏟️' },
  { key: 'theatre', path: 'theatre', emoji: '🎭' },
  { key: 'comedy', path: 'comedy', emoji: '😂' },
  { key: 'family', path: 'family', emoji: '🎪' },
  { key: 'festivals', path: 'festivals', emoji: '🎉' },
] as const;

/* ─── Time of day options ────────────────────────────────────────────────────── */

const TIME_OF_DAY = [
  { key: 'morning', value: 'before_12pm', icon: '🌅' },
  { key: 'afternoon', value: 'after_12pm', icon: '☀️' },
  { key: 'evening', value: 'after_6pm', icon: '🌆' },
  { key: 'night', value: 'after_9pm', icon: '🌙' },
] as const;

/* ─── Date preset helper ─────────────────────────────────────────────────────── */

function getDatePreset(preset: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (preset) {
    case 'today':
      return { from: fmt(now), to: fmt(now) };
    case 'weekend': {
      const day = now.getDay();
      const satOffset = day === 0 ? 6 : 6 - day;
      const sat = new Date(now);
      sat.setDate(now.getDate() + satOffset);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      return { from: fmt(sat), to: fmt(sun) };
    }
    case 'week': {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      return { from: fmt(now), to: fmt(endOfWeek) };
    }
    case 'month': {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: fmt(now), to: fmt(endOfMonth) };
    }
    default:
      return { from: '', to: '' };
  }
}

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export type EventFilters = {
  keyword: string;
  categoryPath: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  timeOfDay: string;
};

type City = {
  id: number;
  name: string;
  eventCount: number;
};

type Props = {
  initialFilters: EventFilters;
  cities: City[];
  isOpen: boolean;
  onToggle: () => void;
};

/* ─── Component ──────────────────────────────────────────────────────────────── */

export function EventsFilterSidebar({ initialFilters, cities, isOpen, onToggle }: Props) {
  const t = useTranslations('EventsPage');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [datePreset, setDatePreset] = useState<string>('');

  // Sync state whenever initialFilters props change (e.g. from URL changes or chip removals)
  useEffect(() => {
    setFilters(initialFilters);
  }, [
    initialFilters.keyword,
    initialFilters.categoryPath,
    initialFilters.city,
    initialFilters.dateFrom,
    initialFilters.dateTo,
    initialFilters.timeOfDay,
  ]);

  const updateFilter = useCallback(<K extends keyof EventFilters>(key: K, value: EventFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  /* Apply filters → push URL search params */
  const applyFilters = useCallback((overrideFilters?: Partial<EventFilters>) => {
    const f = { ...filters, ...overrideFilters };
    const params = new URLSearchParams();
    if (f.keyword?.trim()) params.set('keyword', f.keyword.trim());
    if (f.categoryPath?.trim()) params.set('categoryPath', f.categoryPath.trim());
    if (f.city?.trim()) params.set('city', f.city.trim());
    if (f.dateFrom?.trim()) params.set('dateFrom', f.dateFrom.trim());
    if (f.dateTo?.trim()) params.set('dateTo', f.dateTo.trim());
    if (f.timeOfDay?.trim()) params.set('timeOfDay', f.timeOfDay.trim());

    if (typeof window !== 'undefined') {
      const currentParams = new URLSearchParams(window.location.search);
      const sort = currentParams.get('sort');
      const view = currentParams.get('view');
      if (sort) params.set('sort', sort);
      if (view) params.set('view', view);
    }

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [filters, pathname, router]);

  const clearFilters = useCallback(() => {
    const empty: EventFilters = { keyword: '', categoryPath: '', city: '', dateFrom: '', dateTo: '', timeOfDay: '' };
    setFilters(empty);
    setDatePreset('');
    startTransition(() => {
      router.push(pathname);
    });
  }, [pathname, router]);

  /* Select category → toggle or clear */
  const selectCategory = useCallback((path: string) => {
    const nextPath = filters.categoryPath === path ? '' : path;
    setFilters(prev => ({ ...prev, categoryPath: nextPath }));
    applyFilters({ categoryPath: nextPath });
  }, [filters.categoryPath, applyFilters]);

  /* Select date preset → apply immediately */
  const selectDatePreset = useCallback((preset: string) => {
    if (datePreset === preset) {
      setDatePreset('');
      setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
      applyFilters({ dateFrom: '', dateTo: '' });
    } else {
      const { from, to } = getDatePreset(preset);
      setDatePreset(preset);
      setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to }));
      applyFilters({ dateFrom: from, dateTo: to });
    }
  }, [datePreset, applyFilters]);

  /* Select city → toggle or apply */
  const selectCity = useCallback((cityName: string) => {
    const next = filters.city === cityName ? '' : cityName;
    setFilters(prev => ({ ...prev, city: next }));
    applyFilters({ city: next });
  }, [filters.city, applyFilters]);

  /* Select time of day → toggle or apply */
  const selectTimeOfDay = useCallback((value: string) => {
    const next = filters.timeOfDay === value ? '' : value;
    setFilters(prev => ({ ...prev, timeOfDay: next }));
    applyFilters({ timeOfDay: next });
  }, [filters.timeOfDay, applyFilters]);

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed left-0 top-0 z-50 h-full w-[300px] max-w-[85vw] overflow-y-auto bg-[#0e0e11]/95 backdrop-blur-xl
          border-r border-white/5 p-6 pt-20 transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:translate-x-0 lg:w-full lg:overflow-visible lg:rounded-2xl lg:border lg:border-[var(--color-surface-border)]
          lg:bg-[var(--color-surface-raised)] lg:p-5 lg:pt-5 lg:backdrop-blur-none
          lg:h-fit lg:sticky lg:top-24
        `}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-4 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3
              className="text-[18px] font-semibold text-white"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {t('filters')}
            </h3>
            {isPending && (
              <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-brand)]" />
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] font-medium text-[var(--color-brand)] hover:text-[#ff3b55] transition-colors"
            >
              {t('clear_filters')}
            </button>
          )}
        </div>

        {/* ── Keyword Search ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Keyword
          </label>
          <form
            onSubmit={(e) => { e.preventDefault(); applyFilters(); }}
            className="relative"
          >
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filters.keyword}
              onChange={e => updateFilter('keyword', e.target.value)}
              onBlur={() => applyFilters()}
              placeholder={t('filter_keyword')}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-[13px] text-white
                placeholder:text-[var(--color-text-muted)] outline-none transition-colors
                focus:border-[var(--color-brand-muted)] focus:bg-white/[0.08]"
            />
          </form>
        </div>

        {/* ── Category ───────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {t('filter_category')}
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const isActive = filters.categoryPath === cat.path;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => selectCategory(cat.path)}
                  className={`
                    flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium
                    transition-all duration-200 border
                    ${isActive
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-[var(--color-brand)] shadow-sm shadow-[var(--color-brand)]/20'
                      : 'border-white/10 bg-white/5 text-[var(--color-text-secondary)] hover:border-white/20 hover:bg-white/10'
                    }
                  `}
                >
                  <span className="text-[14px]">{cat.emoji}</span>
                  {t(`cat_${cat.key}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Date Range ─────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {t('date_range')}
          </label>
          {/* Quick presets */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(['today', 'weekend', 'week', 'month'] as const).map(preset => {
              const isActive = datePreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => selectDatePreset(preset)}
                  className={`
                    rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-200 border
                    ${isActive
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-[var(--color-brand)]'
                      : 'border-white/10 bg-white/5 text-[var(--color-text-secondary)] hover:border-white/20 hover:bg-white/10'
                    }
                  `}
                >
                  {t(`date_${preset}`)}
                </button>
              );
            })}
          </div>
          {/* Custom date inputs */}
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => {
                updateFilter('dateFrom', e.target.value);
                setDatePreset('custom');
              }}
              onBlur={() => applyFilters()}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-[var(--color-text-secondary)]
                outline-none transition-colors focus:border-[var(--color-brand-muted)]
                [color-scheme:dark]"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => {
                updateFilter('dateTo', e.target.value);
                setDatePreset('custom');
              }}
              onBlur={() => applyFilters()}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-[var(--color-text-secondary)]
                outline-none transition-colors focus:border-[var(--color-brand-muted)]
                [color-scheme:dark]"
            />
          </div>
        </div>

        {/* ── City ───────────────────────────────────────────────────────────── */}
        {cities.length > 0 && (
          <div className="mb-5">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {t('city_label')}
            </label>
            <div className="space-y-1">
              {cities.slice(0, 5).map(c => {
                const isActive = filters.city === c.name;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCity(c.name)}
                    className={`
                      flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[13px]
                      transition-all duration-200
                      ${isActive
                        ? 'bg-[var(--color-brand)]/10 text-[var(--color-brand)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
                      {c.eventCount.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Time of Day ────────────────────────────────────────────────────── */}
        <div className="mb-2">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {t('time_of_day')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_OF_DAY.map(tod => {
              const isActive = filters.timeOfDay === tod.value;
              return (
                <button
                  key={tod.key}
                  type="button"
                  onClick={() => selectTimeOfDay(tod.value)}
                  className={`
                    flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium
                    transition-all duration-200 border
                    ${isActive
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-[var(--color-brand)]'
                      : 'border-white/10 bg-white/5 text-[var(--color-text-secondary)] hover:border-white/20 hover:bg-white/10'
                    }
                  `}
                >
                  <span>{tod.icon}</span>
                  {t(`time_${tod.key}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Apply Button (mobile) ──────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => { applyFilters(); onToggle(); }}
          className="w-full rounded-xl bg-[var(--color-brand)] py-3 text-[14px] font-semibold text-white
            transition-colors hover:bg-[#d41e37] lg:hidden"
        >
          {t('apply_filters')}
        </button>
      </aside>
    </>
  );
}

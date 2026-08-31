import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCategoryByPath, getEvents, searchEvents, getPerformers, getCategories } from '@/libs/CachedCatalogApi';
import { ApiError } from '@/libs/ApiClient';
import { EventCard } from '@/components/catalog/EventCard';
import { EventCardSkeleton } from '@/components/catalog/EventCardSkeleton';
import { Pagination } from '@/components/catalog/Pagination';
import { CategoryHeroBanner } from '@/components/catalog/CategoryHeroBanner';
import { Link } from '@/libs/I18nNavigation';
import type { TnCategory, TnPerformer } from '@/types/Catalog';
import { getEventImages } from '@/libs/EventImage';

type CategoriesPageProps = {
  params: Promise<{ locale: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveCategory(categoryPath: string): Promise<{ category: TnCategory; resolvedPath: string }> {
  // If it is already a dot path, try TN API directly
  if (categoryPath.startsWith('.')) {
    try {
      const category = await getCategoryByPath(categoryPath);
      return { category, resolvedPath: categoryPath };
    } catch {
      // Fall through if not found
    }
  }

  // If it's a slug (e.g. "concerts", "sports", "theater", "theatre"), try matching against all categories
  try {
    const allCategories = await getCategories({ pageSize: 100, hasEvents: true });
    const normalized = categoryPath.toLowerCase().replace(/s$/, ''); // e.g. "concert", "sport", "theater"
    const match = allCategories.results.find((c) => {
      const name = c.text?.name?.toLowerCase() || '';
      const uri = c.uriComponent?.toLowerCase() || '';
      return name.includes(normalized) || uri.includes(normalized) || normalized.includes(name);
    });

    if (match) {
      return { category: match, resolvedPath: match.path };
    }
  } catch {
    // ignore
  }

  // Friendly title from slug
  const title = categoryPath
    .split('/')
    .pop()!
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const fallbackCategory: TnCategory = {
    path: categoryPath,
    depth: 0,
    text: { name: title },
    _metadata: { hasEvents: true, eventCount: 0, hasTickets: true, ticketCount: 0 },
  };

  return { category: fallbackCategory, resolvedPath: categoryPath };
}

export async function generateMetadata(props: CategoriesPageProps): Promise<Metadata> {
  const { locale, path } = await props.params;
  const categoryPath = path.join('/');
  try {
    const { category } = await resolveCategory(categoryPath);
    const t = await getTranslations({ locale, namespace: 'CategoriesPage' });
    return {
      title: t('meta_title', { name: category.text.name }),
      description: t('meta_description', { name: category.text.name }),
    };
  } catch {
    const t = await getTranslations({ locale, namespace: 'CategoriesPage' });
    return { title: t('meta_title_fallback') };
  }
}

// ─── Top Performers Section ───────────────────────────────────────────────────

async function TopPerformers(props: { categoryPath: string; locale: string }) {
  let performers: TnPerformer[] = [];
  try {
    const result = await getPerformers({ categoryPath: props.categoryPath, pageSize: 8 });
    performers = result.results.filter((p) => (p._metadata?.hasEvents ?? false));
  } catch {
    return null;
  }
  if (performers.length === 0) return null;

  return (
    <div className="mb-10">
      <p className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        Top Performers
      </p>
      <div className="flex flex-wrap gap-2">
        {performers.map((p) => (
          <Link
            key={p.id}
            href={`/artists/${p.id}`}
            className="group flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-[13px] transition-all hover:border-[var(--color-brand-muted)] hover:bg-[var(--color-brand-subtle)] hover:text-white"
          >
            <span className="text-base">🎤</span>
            <span className="text-[var(--color-text-secondary)] group-hover:text-white transition-colors">
              {p.text.name}
            </span>
            {p._metadata?.eventCount !== undefined && p._metadata.eventCount > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]">
                {p._metadata.eventCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Subcategory Chips ────────────────────────────────────────────────────────

async function SubcategoryChips(props: { parentPath: string; currentPath: string }) {
  let subcategories: TnCategory[] = [];
  try {
    const result = await getCategories({ pageSize: 50, hasEvents: true });
    const depthOfCurrent = props.currentPath.split('.').filter(Boolean).length;
    subcategories = result.results.filter((c) => {
      if (c.path === props.currentPath) return false;
      if (!c.path.startsWith(props.currentPath)) return false;
      const depth = c.path.split('.').filter(Boolean).length;
      return depth === depthOfCurrent + 1;
    });
  } catch {
    return null;
  }
  if (subcategories.length === 0) return null;

  return (
    <div className="mb-8">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        Browse Subcategories
      </p>
      <div className="flex flex-wrap gap-2">
        {subcategories.map((c) => (
          <Link
            key={c.path}
            href={`/categories/${c.path}`}
            className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-1.5 text-[13px] text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-brand-muted)] hover:text-white"
          >
            {c.text.name}
            {c._metadata?.eventCount !== undefined && c._metadata.eventCount > 0 && (
              <span className="ml-1.5 text-[11px] text-[var(--color-text-muted)]">
                ({c._metadata.eventCount})
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Events Grid ──────────────────────────────────────────────────────────────

async function CategoryEvents(props: {
  categoryPath: string;
  categoryName: string;
  locale: string;
  page: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  const t = await getTranslations({ locale: props.locale, namespace: 'CategoriesPage' });
  const pageSize = 12;

  let result;
  try {
    if (props.categoryPath.startsWith('.')) {
      result = await getEvents({
        categoryPath: props.categoryPath,
        pageNumber: props.page,
        pageSize,
        dateFrom: props.dateFrom,
        dateTo: props.dateTo,
      });
    } else {
      result = await searchEvents({
        keyword: props.categoryName,
        pageNumber: props.page,
        pageSize,
        dateFrom: props.dateFrom,
        dateTo: props.dateTo,
      });
    }
  } catch {
    result = await getEvents({
      pageNumber: props.page,
      pageSize,
      dateFrom: props.dateFrom,
      dateTo: props.dateTo,
    });
  }

  if (!result || result.results.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-5xl mb-4">🎫</p>
        <p className="text-[var(--color-text-muted)]">{t('no_events')}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(result.totalCount / pageSize);
  const images = await getEventImages(result.results);
  const searchParamsToForward: Record<string, string> = {};
  if (props.dateFrom) searchParamsToForward.dateFrom = props.dateFrom;
  if (props.dateTo) searchParamsToForward.dateTo = props.dateTo;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-[var(--color-text-muted)]">
          {result.totalCount.toLocaleString()} events
        </p>
      </div>
      <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {result.results.map((ev, i) => (
          <EventCard key={ev.id} event={ev} locale={props.locale} image={images[i] ?? null} />
        ))}
      </div>
      <Pagination
        currentPage={props.page}
        totalPages={totalPages}
        basePath={`/categories/${props.categoryPath}`}
        searchParams={searchParamsToForward}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoryBrowsePage(props: CategoriesPageProps) {
  const { locale, path } = await props.params;
  setRequestLocale(locale);
  const sp = await props.searchParams;
  const categoryPath = path.join('/');
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;
  const dateFrom = typeof sp.dateFrom === 'string' ? sp.dateFrom : undefined;
  const dateTo = typeof sp.dateTo === 'string' ? sp.dateTo : undefined;

  let category: TnCategory;
  let resolvedPath: string;

  try {
    const res = await resolveCategory(categoryPath);
    category = res.category;
    resolvedPath = res.resolvedPath;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const parentPath = path.slice(0, -1).join('/');

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-10 max-md:px-4">
      {/* Hero banner */}
      <CategoryHeroBanner category={category} />

      {/* Subcategories */}
      <Suspense fallback={null}>
        <SubcategoryChips parentPath={parentPath} currentPath={resolvedPath} />
      </Suspense>

      {/* Top Performers */}
      <Suspense fallback={null}>
        <TopPerformers categoryPath={resolvedPath} locale={locale} />
      </Suspense>

      {/* Filter bar */}
      <form
        method="GET"
        className="mb-8 flex flex-wrap items-center gap-3"
      >
        <p className="mr-1 text-[13px] font-medium text-[var(--color-text-muted)]">Filter:</p>
        <input
          type="date"
          name="dateFrom"
          defaultValue={dateFrom}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-[13px] text-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand-muted)]"
        />
        <span className="text-[var(--color-text-muted)] text-sm">to</span>
        <input
          type="date"
          name="dateTo"
          defaultValue={dateTo}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-[13px] text-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand-muted)]"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-muted)] px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-brand)] cursor-pointer"
        >
          Apply
        </button>
        {(dateFrom || dateTo) && (
          <Link
            href={`/categories/${categoryPath}`}
            className="text-[13px] text-[var(--color-text-muted)] hover:text-white transition-colors"
          >
            Clear filters ×
          </Link>
        )}
      </form>

      {/* Events list */}
      <Suspense
        key={`${resolvedPath}-${page}-${dateFrom}-${dateTo}`}
        fallback={
          <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <CategoryEvents
          categoryPath={resolvedPath}
          categoryName={category.text.name}
          locale={locale}
          page={page}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      </Suspense>
    </div>
  );
}

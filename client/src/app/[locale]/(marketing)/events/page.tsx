import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { getEvents, searchEvents, getCities } from '@/libs/CachedCatalogApi';
import { EventCard } from '@/components/catalog/EventCard';
import { EventCardSkeleton } from '@/components/catalog/EventCardSkeleton';
import { Pagination } from '@/components/catalog/Pagination';
import { EventsPageClient } from '@/components/catalog/EventsPageClient';
import type { EventFilters } from '@/components/catalog/EventsFilterSidebar';
import { getEventImages } from '@/libs/EventImage';

type EventsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: EventsPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'EventsPage' });
  return { title: t('meta_title'), description: t('meta_description') };
}

/* ─── Server: Events Grid ────────────────────────────────────────────────────── */

async function EventsGrid(props: {
  locale: string;
  keyword?: string;
  city?: string;
  categoryPath?: string;
  dateFrom?: string;
  dateTo?: string;
  view?: string;
  page: number;
}) {
  const t = await getTranslations({ locale: props.locale, namespace: 'EventsPage' });
  const pageSize = 12;

  // TN's /events/search requires a keyword — browsing with no search term
  // must hit the plain /events list endpoint instead.
  const result = props.keyword
    ? await searchEvents({
        keyword: props.keyword,
        city: props.city,
        categoryPath: props.categoryPath,
        dateFrom: props.dateFrom,
        dateTo: props.dateTo,
        pageNumber: props.page,
        pageSize,
      })
    : await getEvents({
        city: props.city,
        categoryPath: props.categoryPath,
        dateFrom: props.dateFrom,
        dateTo: props.dateTo,
        pageNumber: props.page,
        pageSize,
      });

  if (result.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 text-6xl opacity-40">🎭</div>
        <p className="mb-2 text-[18px] font-semibold text-white">{t('no_events')}</p>
        <p className="mb-6 text-[14px] text-[var(--color-text-muted)]">{t('no_events_subtitle')}</p>
        <Link
          href="/events"
          className="rounded-full bg-[var(--color-brand)] px-6 py-2.5 text-[14px] font-medium text-white
            transition-colors hover:bg-[#d41e37]"
        >
          {t('browse_all')}
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(result.totalCount / pageSize);
  const searchParamsObj: Record<string, string> = {};
  if (props.keyword) searchParamsObj.keyword = props.keyword;
  if (props.city) searchParamsObj.city = props.city;
  if (props.categoryPath) searchParamsObj.categoryPath = props.categoryPath;
  if (props.dateFrom) searchParamsObj.dateFrom = props.dateFrom;
  if (props.dateTo) searchParamsObj.dateTo = props.dateTo;

  const isListView = props.view === 'list';

  const images = await getEventImages(result.results);

  return (
    <>
      <div
        className={
          isListView
            ? 'flex flex-col gap-4'
            : 'grid grid-cols-3 gap-6 max-xl:grid-cols-2 max-sm:grid-cols-1'
        }
      >
        {result.results.map((ev, i) => (
          <div
            key={ev.id}
            className="animate-[fadeInUp_0.4s_ease-out_both]"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <EventCard event={ev} locale={props.locale} image={images[i] ?? null} />
          </div>
        ))}
      </div>
      <Pagination
        currentPage={props.page}
        totalPages={totalPages}
        basePath="/events"
        searchParams={searchParamsObj}
      />
    </>
  );
}

/* ─── Server: Grid Skeleton ──────────────────────────────────────────────────── */

function EventsGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-6 max-xl:grid-cols-2 max-sm:grid-cols-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ─── Page Component ─────────────────────────────────────────────────────────── */

export default async function EventsPage(props: EventsPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'EventsPage' });
  const sp = await props.searchParams;

  // Parse search params
  const keyword = typeof sp.keyword === 'string' ? sp.keyword : undefined;
  const city = typeof sp.city === 'string' ? sp.city : undefined;
  const categoryPath = typeof sp.categoryPath === 'string' ? sp.categoryPath : undefined;
  const dateFrom = typeof sp.dateFrom === 'string' ? sp.dateFrom : undefined;
  const dateTo = typeof sp.dateTo === 'string' ? sp.dateTo : undefined;
  const timeOfDay = typeof sp.timeOfDay === 'string' ? sp.timeOfDay : undefined;
  const sort = typeof sp.sort === 'string' ? sp.sort : undefined;
  const view = typeof sp.view === 'string' ? (sp.view as 'grid' | 'list') : 'grid';
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  // Initial filters for client components
  const initialFilters: EventFilters = {
    keyword: keyword ?? '',
    categoryPath: categoryPath ?? '',
    city: city ?? '',
    dateFrom: dateFrom ?? '',
    dateTo: dateTo ?? '',
    timeOfDay: timeOfDay ?? '',
  };

  // Fetch cities for the sidebar (cities with events)
  let cities: { id: number; name: string; eventCount: number }[] = [];
  try {
    const citiesResult = await getCities({ hasEvents: true, pageSize: 20 });
    console.log({citiesResult})
    cities = citiesResult.results.map(c => ({
      id: c.id,
      name: c.text.name,
      eventCount: c._metadata?.eventCount ?? 0,
    })).sort((a, b) => b.eventCount - a.eventCount);
  } catch {
    // Cities loading is non-critical — proceed without them
  }

  // Get total count using the same query as the grid
  let totalCount = 0;
  try {
    const countResult = keyword
      ? await searchEvents({ keyword, city, categoryPath, dateFrom, dateTo, pageNumber: 1, pageSize: 1 })
      : await getEvents({ city, categoryPath, dateFrom, dateTo, pageNumber: 1, pageSize: 1 });
    totalCount = countResult.totalCount;
  } catch {
    // Non-critical — sort bar will show 0
  }

  console.log({totalCount , view, cities})

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-10 max-md:px-4">
      {/* Page hero */}
      <div className="mb-8">
        <p
          className="mb-1 text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand)]"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {t('page_subtitle')}
        </p>
        <h1
          className="text-[36px] font-bold text-white max-sm:text-[28px]"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          {t('page_title')}
        </h1>
      </div>

      {/* Main layout: sidebar + content */}
      <EventsPageClient
        initialFilters={initialFilters}
        cities={cities}
        totalCount={totalCount}
        currentSort={sort ?? ''}
        currentView={view}
      >
        <Suspense
          key={`${keyword || ''}-${city || ''}-${categoryPath || ''}-${dateFrom || ''}-${dateTo || ''}-${view || ''}-${page}`}
          fallback={<EventsGridSkeleton />}
        >
          <EventsGrid
            locale={locale}
            keyword={keyword}
            city={city}
            categoryPath={categoryPath}
            dateFrom={dateFrom}
            dateTo={dateTo}
            view={view}
            page={page}
          />
        </Suspense>
      </EventsPageClient>

      {/* CSS animation keyframe */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

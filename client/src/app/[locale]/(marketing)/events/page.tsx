import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { searchEvents } from '@/libs/CatalogApi';
import { EventCard } from '@/components/catalog/EventCard';
import { EventCardSkeleton } from '@/components/catalog/EventCardSkeleton';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { Pagination } from '@/components/catalog/Pagination';

type EventsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: EventsPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'EventsPage' });
  return { title: t('meta_title'), description: t('meta_description') };
}

async function EventsGrid(props: {
  locale: string;
  keyword?: string;
  city?: string;
  categoryPath?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}) {
  const t = await getTranslations({ locale: props.locale, namespace: 'EventsPage' });
  const pageSize = 12;
  const result = await searchEvents({
    keyword: props.keyword,
    city: props.city,
    categoryPath: props.categoryPath,
    dateFrom: props.dateFrom,
    dateTo: props.dateTo,
    pageNumber: props.page,
    pageSize,
  });

  if (result.results.length === 0) {
    return (
      <p className="py-12 text-center text-[var(--color-text-muted)]">{t('no_events')}</p>
    );
  }

  const totalPages = Math.ceil(result.totalCount / pageSize);
  const searchParamsObj: Record<string, string> = {};
  if (props.keyword) searchParamsObj.keyword = props.keyword;
  if (props.city) searchParamsObj.city = props.city;
  if (props.categoryPath) searchParamsObj.categoryPath = props.categoryPath;
  if (props.dateFrom) searchParamsObj.dateFrom = props.dateFrom;
  if (props.dateTo) searchParamsObj.dateTo = props.dateTo;

  return (
    <>
      <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {result.results.map((ev) => (
          <EventCard key={ev.id} event={ev} locale={props.locale} />
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

function EventsGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function EventsPage(props: EventsPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'EventsPage' });
  const sp = await props.searchParams;

  const keyword = typeof sp.keyword === 'string' ? sp.keyword : undefined;
  const city = typeof sp.city === 'string' ? sp.city : undefined;
  const categoryPath = typeof sp.categoryPath === 'string' ? sp.categoryPath : undefined;
  const dateFrom = typeof sp.dateFrom === 'string' ? sp.dateFrom : undefined;
  const dateTo = typeof sp.dateTo === 'string' ? sp.dateTo : undefined;
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading title={t('page_title')} />

      {/* Filter bar */}
      <form method="GET" className="mb-8 flex flex-wrap gap-3">
        <input
          name="keyword"
          defaultValue={keyword}
          placeholder={t('filter_keyword')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <input
          name="city"
          defaultValue={city}
          placeholder={t('filter_city')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <input
          type="date"
          name="dateFrom"
          defaultValue={dateFrom}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-[var(--color-text-muted)] outline-none"
        />
        <input
          type="date"
          name="dateTo"
          defaultValue={dateTo}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-[var(--color-text-muted)] outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
        >
          {t('apply_filters')}
        </button>
      </form>

      <Suspense fallback={<EventsGridSkeleton />}>
        <EventsGrid
          locale={locale}
          keyword={keyword}
          city={city}
          categoryPath={categoryPath}
          dateFrom={dateFrom}
          dateTo={dateTo}
          page={page}
        />
      </Suspense>
    </div>
  );
}

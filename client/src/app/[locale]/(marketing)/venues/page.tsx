import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getVenues } from '@/libs/CachedCatalogApi';
import { VenueCard } from '@/components/catalog/VenueCard';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { Pagination } from '@/components/catalog/Pagination';

type VenuesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: VenuesPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'VenuesPage' });
  return { title: t('meta_title'), description: t('meta_description') };
}

async function VenuesGrid(props: { locale: string; city?: string; stateProvince?: string; page: number }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'VenuesPage' });
  const pageSize = 24;
  const result = await getVenues({ city: props.city, stateProvince: props.stateProvince, pageNumber: props.page, pageSize });

  if (result.results.length === 0) {
    return <p className="py-12 text-center text-[var(--color-text-muted)]">{t('no_venues')}</p>;
  }

  const totalPages = Math.ceil(result.totalCount / pageSize);
  const searchParamsObj: Record<string, string> = {};
  if (props.city) searchParamsObj.city = props.city;
  if (props.stateProvince) searchParamsObj.stateProvince = props.stateProvince;

  return (
    <>
      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {result.results.map((v) => (
          <VenueCard key={v.id} venue={v} />
        ))}
      </div>
      <Pagination currentPage={props.page} totalPages={totalPages} basePath="/venues" searchParams={searchParamsObj} />
    </>
  );
}

function VenuesGridSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)]" />
      ))}
    </div>
  );
}

export default async function VenuesPage(props: VenuesPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'VenuesPage' });
  const sp = await props.searchParams;

  const city = typeof sp.city === 'string' ? sp.city : undefined;
  const stateProvince = typeof sp.stateProvince === 'string' ? sp.stateProvince : undefined;
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading title={t('page_title')} />

      <form method="GET" className="mb-8 flex flex-wrap gap-3">
        <input
          name="city"
          defaultValue={city}
          placeholder={t('filter_city')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <input
          name="stateProvince"
          defaultValue={stateProvince}
          placeholder={t('filter_state')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
        >
          {t('apply_filters')}
        </button>
      </form>

      <Suspense fallback={<VenuesGridSkeleton />}>
        <VenuesGrid locale={locale} city={city} stateProvince={stateProvince} page={page} />
      </Suspense>
    </div>
  );
}

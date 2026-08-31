import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPerformers, getPerformerImage } from '@/libs/CachedCatalogApi';
import { ArtistCard } from '@/components/catalog/ArtistCard';
import { ArtistCardSkeleton } from '@/components/catalog/ArtistCardSkeleton';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { Pagination } from '@/components/catalog/Pagination';

type ArtistsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: ArtistsPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'ArtistsPage' });
  return { title: t('meta_title'), description: t('meta_description') };
}

async function ArtistsGrid(props: {
  locale: string;
  keyword?: string;
  categoryPath?: string;
  page: number;
}) {
  const t = await getTranslations({ locale: props.locale, namespace: 'ArtistsPage' });
  const pageSize = 24;
  const result = await getPerformers({
    keyword: props.keyword,
    categoryPath: props.categoryPath,
    pageNumber: props.page,
    pageSize,
  });

  // Promise.all rather than a loop: one slow Wikimedia lookup should not
  // serialise the rest of the grid.
  const images = await Promise.all(
    result.results.map((p) =>
      getPerformerImage(p.text.name, p.defaultCategory?.text.name),
    ),
  );

  if (result.results.length === 0) {
    return (
      <p className="py-12 text-center text-[var(--color-text-muted)]">{t('no_artists')}</p>
    );
  }

  const totalPages = Math.ceil(result.totalCount / pageSize);
  const searchParamsObj: Record<string, string> = {};
  if (props.keyword) searchParamsObj.keyword = props.keyword;
  if (props.categoryPath) searchParamsObj.categoryPath = props.categoryPath;

  return (
    <>
      <div className="grid grid-cols-6 gap-4 max-xl:grid-cols-4 max-md:grid-cols-2">
        {result.results.map((p, i) => (
          <ArtistCard key={p.id} performer={p} locale={props.locale} image={images[i]} />
        ))}
      </div>
      <Pagination
        currentPage={props.page}
        totalPages={totalPages}
        basePath="/artists"
        searchParams={searchParamsObj}
      />
    </>
  );
}

function ArtistsGridSkeleton() {
  return (
    <div className="grid grid-cols-6 gap-4 max-xl:grid-cols-4 max-md:grid-cols-2">
      {Array.from({ length: 24 }).map((_, i) => (
        <ArtistCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function ArtistsPage(props: ArtistsPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ArtistsPage' });
  const sp = await props.searchParams;

  const keyword = typeof sp.keyword === 'string' ? sp.keyword : undefined;
  const categoryPath = typeof sp.categoryPath === 'string' ? sp.categoryPath : undefined;
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading title={t('page_title')} />

      <form method="GET" className="mb-8 flex flex-wrap gap-3">
        <input
          name="keyword"
          defaultValue={keyword}
          placeholder={t('filter_keyword')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
        >
          {t('filter_submit')}
        </button>
      </form>

      <Suspense fallback={<ArtistsGridSkeleton />}>
        <ArtistsGrid locale={locale} keyword={keyword} categoryPath={categoryPath} page={page} />
      </Suspense>
    </div>
  );
}

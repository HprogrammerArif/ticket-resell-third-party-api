import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCategoryByPath, getEvents } from '@/libs/CatalogApi';
import { ApiError } from '@/libs/ApiClient';
import { EventCard } from '@/components/catalog/EventCard';
import { EventCardSkeleton } from '@/components/catalog/EventCardSkeleton';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { Pagination } from '@/components/catalog/Pagination';
import { Link } from '@/libs/I18nNavigation';

type CategoriesPageProps = {
  params: Promise<{ locale: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: CategoriesPageProps): Promise<Metadata> {
  const { locale, path } = await props.params;
  const categoryPath = path.join('/');
  try {
    const category = await getCategoryByPath(categoryPath);
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

async function CategoryEvents(props: {
  categoryPath: string;
  locale: string;
  page: number;
}) {
  const t = await getTranslations({ locale: props.locale, namespace: 'CategoriesPage' });
  const pageSize = 12;
  const result = await getEvents({ categoryPath: props.categoryPath, pageNumber: props.page, pageSize });

  if (result.results.length === 0) {
    return (
      <p className="py-12 text-center text-[var(--color-text-muted)]">{t('no_events')}</p>
    );
  }

  const totalPages = Math.ceil(result.totalCount / pageSize);

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
        basePath={`/categories/${props.categoryPath}`}
        searchParams={{}}
      />
    </>
  );
}

export default async function CategoryBrowsePage(props: CategoriesPageProps) {
  const { locale, path } = await props.params;
  setRequestLocale(locale);
  const sp = await props.searchParams;
  const categoryPath = path.join('/');
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const t = await getTranslations({ locale, namespace: 'CategoriesPage' });

  let category;
  try {
    category = await getCategoryByPath(categoryPath);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <nav className="mb-6 flex items-center gap-2 text-[14px] text-[var(--color-text-muted)]">
        <Link href="/" className="hover:text-white">{t('breadcrumb_home')}</Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{category.text.name}</span>
      </nav>

      <SectionHeading title={category.text.name} />

      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <CategoryEvents categoryPath={categoryPath} locale={locale} page={page} />
      </Suspense>
    </div>
  );
}

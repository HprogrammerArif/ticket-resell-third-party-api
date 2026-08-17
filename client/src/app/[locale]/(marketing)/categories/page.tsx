import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCategories } from '@/libs/CachedCatalogApi';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { CategoryCardSkeleton } from '@/components/catalog/CategoryCardSkeleton';
import { Link } from '@/libs/I18nNavigation';

type CategoriesIndexPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: CategoriesIndexPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'CategoriesPage' });
  return {
    title: t('all_categories_meta_title'),
    description: t('all_categories_meta_description'),
  };
}

async function CategoriesGrid(props: { locale: string; q?: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'CategoriesPage' });
  const result = await getCategories({ pageSize: 100, hasEvents: true });

  let categories = result.results;
  if (props.q) {
    const query = props.q.toLowerCase().trim();
    categories = categories.filter((c) => c.text.name.toLowerCase().includes(query));
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] py-16 text-center">
        <p className="text-lg text-[var(--color-text-muted)]">{t('no_categories')}</p>
        <Link
          href="/categories"
          className="mt-4 inline-block rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] text-white hover:bg-[var(--color-brand)]"
        >
          {t('try_again')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {categories.map((category) => (
        <div key={category.path} className="flex justify-center">
          <CategoryCard category={category} locale={props.locale} />
        </div>
      ))}
    </div>
  );
}

function CategoriesGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="flex justify-center">
          <CategoryCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export default async function CategoriesIndexPage(props: CategoriesIndexPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'CategoriesPage' });
  const sp = await props.searchParams;
  const q = typeof sp.q === 'string' ? sp.q : undefined;

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-12 max-md:px-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
        <Link href="/" className="hover:text-white transition-colors">
          {t('breadcrumb_home')}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{t('breadcrumb_categories')}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1
            className="text-[36px] font-bold text-white max-md:text-[28px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {t('all_categories_title')}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {t('all_categories_subtitle')}
          </p>
        </div>

        {/* Search filter form */}
        <form method="GET" className="flex w-full max-w-sm gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder={t('filter_search')}
            className="w-full rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-2.5 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand)]"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--color-brand-muted)] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[var(--color-brand)]"
          >
            Search
          </button>
        </form>
      </div>

      {/* Grid */}
      <Suspense fallback={<CategoriesGridSkeleton />}>
        <CategoriesGrid locale={locale} q={q} />
      </Suspense>
    </div>
  );
}

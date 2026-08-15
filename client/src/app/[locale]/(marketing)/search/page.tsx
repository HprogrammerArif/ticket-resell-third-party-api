import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { globalSuggest } from '@/libs/CatalogApi';
import { EventCard } from '@/components/catalog/EventCard';
import { EventCardSkeleton } from '@/components/catalog/EventCardSkeleton';
import { ArtistCard } from '@/components/catalog/ArtistCard';
import { VenueCard } from '@/components/catalog/VenueCard';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { Link } from '@/libs/I18nNavigation';

type SearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: SearchPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'SearchPage' });
  return { title: t('meta_title') };
}

async function SearchResults(props: { q: string; locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'SearchPage' });
  const suggest = await globalSuggest(props.q);

  const hasResults =
    suggest.events.length > 0 || suggest.performers.length > 0 || suggest.venues.length > 0;

  if (!hasResults) {
    return (
      <p className="py-12 text-center text-[var(--color-text-muted)]">
        {t('no_results', { q: props.q })}
      </p>
    );
  }

  return (
    <div className="space-y-12">
      {suggest.events.length > 0 && (
        <section>
          <SectionHeading title={t('events_heading')} />
          <div className="flex gap-4 overflow-x-auto pb-4">
            {suggest.events.map((ev) => (
              <div key={ev.id} className="min-w-[280px]">
                <EventCard event={ev} locale={props.locale} />
              </div>
            ))}
          </div>
          <Link
            href={`/events?keyword=${encodeURIComponent(props.q)}`}
            className="mt-4 inline-block text-[14px] text-[var(--color-text-secondary)] hover:text-white"
          >
            {t('see_all_events')}
          </Link>
        </section>
      )}

      {suggest.performers.length > 0 && (
        <section>
          <SectionHeading title={t('artists_heading')} />
          <div className="flex gap-4 overflow-x-auto pb-4">
            {suggest.performers.map((p) => (
              <div key={p.id} className="min-w-[160px]">
                <ArtistCard performer={p} locale={props.locale} />
              </div>
            ))}
          </div>
        </section>
      )}

      {suggest.venues.length > 0 && (
        <section>
          <SectionHeading title={t('venues_heading')} />
          <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
            {suggest.venues.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default async function SearchPage(props: SearchPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'SearchPage' });
  const sp = await props.searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      {!q ? (
        <p className="py-24 text-center text-[var(--color-text-muted)]">{t('prompt')}</p>
      ) : (
        <Suspense
          fallback={
            <div className="space-y-12">
              <div className="flex gap-4 overflow-x-auto pb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-[280px]">
                    <EventCardSkeleton />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <SearchResults q={q} locale={locale} />
        </Suspense>
      )}
    </div>
  );
}

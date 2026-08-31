import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { searchEvents, globalSuggest } from '@/libs/CachedCatalogApi';
import { EventCard } from '@/components/catalog/EventCard';
import { EventCardSkeleton } from '@/components/catalog/EventCardSkeleton';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { Link } from '@/libs/I18nNavigation';
import { getEventImages } from '@/libs/EventImage';

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

  // Fetch real events via search + suggest data for performers/venues/cities
  const [eventsResult, suggest] = await Promise.all([
    searchEvents({ keyword: props.q, pageSize: 8 }),
    globalSuggest(props.q),
  ]);

  const events = eventsResult.results;
  const performers = suggest.performers.results;
  const venues = suggest.venues.results;
  const cities = suggest.cities.results;

  const hasResults = events.length > 0 || performers.length > 0 || venues.length > 0;
  const images = await getEventImages(events);

  if (!hasResults) {
    return (
      <p className="py-12 text-center text-[var(--color-text-muted)]">
        {t('no_results', { q: props.q })}
      </p>
    );
  }

  return (
    <div className="space-y-12">
      {/* Events — full cards from searchEvents */}
      {events.length > 0 && (
        <section>
          <SectionHeading title={`${t('events_heading')} (${eventsResult.totalCount})`} />
          <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {events.map((ev, i) => (
              <EventCard key={ev.id} event={ev} locale={props.locale} image={images[i] ?? null} />
            ))}
          </div>
          {eventsResult.totalCount > 8 && (
            <Link
              href={`/events?keyword=${encodeURIComponent(props.q)}`}
              className="mt-4 inline-block text-[14px] text-[var(--color-brand)] hover:underline"
            >
              {t('see_all_events')} →
            </Link>
          )}
        </section>
      )}

      {/* Performers — from suggest (compact cards) */}
      {performers.length > 0 && (
        <section>
          <SectionHeading title={`${t('artists_heading')} (${suggest.performers.totalResultCount})`} />
          <div className="flex flex-wrap gap-3">
            {performers.map((p) => (
              <Link
                key={p.id}
                href={`/artists/${p.id}`}
                className="group flex items-center gap-3 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-3 transition-all hover:border-[var(--color-brand-muted)] hover:shadow-lg"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-brand)] text-[14px] font-bold text-white">
                  {p.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
                <span className="text-[14px] font-medium text-white transition-colors group-hover:text-[var(--color-brand)]">
                  {p.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Venues — from suggest (compact cards) */}
      {venues.length > 0 && (
        <section>
          <SectionHeading title={`${t('venues_heading')} (${suggest.venues.totalResultCount})`} />
          <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {venues.map((v) => (
              <Link
                key={v.id}
                href={`/venues/${v.id}`}
                className="group rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-4 transition-all hover:border-[var(--color-brand-muted)] hover:shadow-lg"
              >
                <p className="text-[14px] font-semibold text-white transition-colors group-hover:text-[var(--color-brand)]">
                  {v.name}
                </p>
                {(v.city || v.state) && (
                  <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                    {[v.city, v.state, v.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cities — from suggest */}
      {cities.length > 0 && (
        <section>
          <SectionHeading title={`Cities (${suggest.cities.totalResultCount})`} />
          <div className="flex flex-wrap gap-3">
            {cities.map((c) => (
              <Link
                key={c.id}
                href={`/events?city=${encodeURIComponent(c.name)}`}
                className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[13px] text-white transition-all hover:border-[var(--color-brand-muted)] hover:text-[var(--color-brand)]"
              >
                {c.name}{c.state ? `, ${c.state}` : ''}{c.country ? ` · ${c.country}` : ''}
              </Link>
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
              <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <EventCardSkeleton key={i} />
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

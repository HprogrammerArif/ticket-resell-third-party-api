import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getVenueById, getEvents } from '@/libs/CatalogApi';
import { ApiError } from '@/libs/ApiClient';
import { EventCard } from '@/components/catalog/EventCard';
import { EventCardSkeleton } from '@/components/catalog/EventCardSkeleton';
import { SectionHeading } from '@/components/catalog/SectionHeading';

type VenueDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata(props: VenueDetailPageProps): Promise<Metadata> {
  const { locale, id } = await props.params;
  try {
    const venue = await getVenueById(Number(id));
    const t = await getTranslations({ locale, namespace: 'VenueDetailPage' });
    return { title: t('meta_title', { name: venue.text.name }) };
  } catch {
    const t = await getTranslations({ locale, namespace: 'VenueDetailPage' });
    return { title: t('meta_title_fallback') };
  }
}

async function VenueEvents(props: { city: string; locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'VenueDetailPage' });
  const { results } = await getEvents({ city: props.city, pageSize: 8 });

  if (results.length === 0) {
    return <p className="text-[var(--color-text-muted)]">{t('no_events')}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {results.map((ev) => (
        <EventCard key={ev.id} event={ev} locale={props.locale} />
      ))}
    </div>
  );
}

export default async function VenueDetailPage(props: VenueDetailPageProps) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'VenueDetailPage' });

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) { notFound(); }

  let venue;
  try {
    venue = await getVenueById(numericId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <h1
        className="mb-2 text-[40px] font-semibold text-[var(--color-text-primary)] max-md:text-[28px]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {venue.text.name}
      </h1>

      {(venue.city || venue.stateProvince) && (
        <p className="mb-12 text-[16px] text-[var(--color-text-secondary)]">
          {[venue.city, venue.stateProvince, venue.country].filter(Boolean).join(', ')}
        </p>
      )}

      <SectionHeading title={t('upcoming_events')} />

      {venue.city ? (
        <Suspense
          fallback={
            <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <VenueEvents city={venue.city} locale={locale} />
        </Suspense>
      ) : (
        <p className="text-[var(--color-text-muted)]">{t('no_events')}</p>
      )}
    </div>
  );
}

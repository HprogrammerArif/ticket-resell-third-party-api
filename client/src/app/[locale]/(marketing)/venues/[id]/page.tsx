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

  // Build location from nested objects
  const locationParts: string[] = [];
  if (venue.city?.text.name) locationParts.push(venue.city.text.name);
  if (venue.stateProvince?.text.abbr) locationParts.push(venue.stateProvince.text.abbr);
  else if (venue.stateProvince?.text.name) locationParts.push(venue.stateProvince.text.name);
  if (venue.country?.text.name) locationParts.push(venue.country.text.name);
  const location = locationParts.join(', ');
  const cityName = venue.city?.text.name ?? '';

  const eventCount = venue._metadata?.eventCount ?? 0;
  const ticketCount = venue._metadata?.ticketCount ?? 0;

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <h1
        className="mb-2 text-[40px] font-semibold text-[var(--color-text-primary)] max-md:text-[28px]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {venue.text.name}
      </h1>

      {location && (
        <div className="mb-4 flex items-center gap-2 text-[16px] text-[var(--color-text-secondary)]">
          <svg className="size-4 text-[var(--color-text-muted)]" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5C2.5 10.65 8 16 8 16s5.5-5.35 5.5-10.5A5.53 5.53 0 0 0 8 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
          </svg>
          <span>{location}</span>
        </div>
      )}

      {/* Stats */}
      <div className="mb-12 flex flex-wrap gap-4">
        {venue.capacity && (
          <span className="rounded-full bg-white/5 px-4 py-1.5 text-[13px] text-[var(--color-text-secondary)]">
            Capacity: {venue.capacity.toLocaleString()}
          </span>
        )}
        {eventCount > 0 && (
          <span className="rounded-full bg-white/5 px-4 py-1.5 text-[13px] text-[var(--color-text-secondary)]">
            {eventCount} upcoming events
          </span>
        )}
        {ticketCount > 0 && (
          <span className="rounded-full bg-white/5 px-4 py-1.5 text-[13px] text-[var(--color-text-secondary)]">
            {ticketCount.toLocaleString()} tickets available
          </span>
        )}
      </div>

      <SectionHeading title={t('upcoming_events')} />

      {cityName ? (
        <Suspense
          fallback={
            <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <VenueEvents city={cityName} locale={locale} />
        </Suspense>
      ) : (
        <p className="text-[var(--color-text-muted)]">{t('no_events')}</p>
      )}
    </div>
  );
}

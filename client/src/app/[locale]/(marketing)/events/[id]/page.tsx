import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEventById, getEvents } from '@/libs/CatalogApi';
import { ApiError } from '@/libs/ApiClient';
import { EventCard } from '@/components/catalog/EventCard';
import { SectionHeading } from '@/components/catalog/SectionHeading';

type EventDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata(props: EventDetailPageProps): Promise<Metadata> {
  const { locale, id } = await props.params;
  try {
    const event = await getEventById(Number(id));
    const t = await getTranslations({ locale, namespace: 'EventDetailPage' });
    return { title: t('meta_title', { name: event.text.name }) };
  } catch {
    const t = await getTranslations({ locale, namespace: 'EventDetailPage' });
    return { title: t('meta_title_fallback') };
  }
}

async function SimilarEvents(props: { categoryPath?: string; locale: string; currentId: number }) {
  if (!props.categoryPath) return null;
  const { results } = await getEvents({ categoryPath: props.categoryPath, pageSize: 4 });
  const filtered = results.filter((e) => e.id !== props.currentId);
  if (filtered.length === 0) return null;

  const t = await getTranslations({ locale: props.locale, namespace: 'EventDetailPage' });

  return (
    <section className="mt-12">
      <SectionHeading title={t('similar_events')} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {filtered.map((ev) => (
          <div key={ev.id} className="min-w-[280px]">
            <EventCard event={ev} locale={props.locale} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function EventDetailPage(props: EventDetailPageProps) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'EventDetailPage' });

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) { notFound(); }

  let event;
  try {
    event = await getEventById(numericId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const dateStr = event.date.datetime
    ? new Date(event.date.datetime).toLocaleString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : event.date.date;

  // Build location string from nested objects
  const locationParts: string[] = [];
  if (event.venue?.text.name) locationParts.push(event.venue.text.name);
  if (event.city?.text.name) locationParts.push(event.city.text.name);
  if (event.stateProvince?.text.abbr) locationParts.push(event.stateProvince.text.abbr);
  else if (event.stateProvince?.text.name) locationParts.push(event.stateProvince.text.name);
  if (event.country?.text.name) locationParts.push(event.country.text.name);
  const location = locationParts.join(', ');

  const categoryPath = event.defaultCategory?.path;
  const categoryName = event.defaultCategory?.text.name;
  const parentCategory = event.defaultCategory?.ancestors?.[0]?.text.name;
  const lowPrice = event.pricingInfo?.lowPrice?.value;
  const highPrice = event.pricingInfo?.highPrice?.value;
  const ticketCount = event._metadata?.ticketCount ?? 0;
  const hasTickets = event._metadata?.hasTickets ?? false;

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <div className="flex gap-12 max-lg:flex-col">
        {/* Left column */}
        <div className="flex-1">
          {/* Category breadcrumb */}
          {(parentCategory || categoryName) && (
            <div className="mb-4 flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
              {parentCategory && (
                <>
                  <span>{parentCategory}</span>
                  <span className="text-[var(--color-text-muted)]">›</span>
                </>
              )}
              {categoryName && <span className="text-[var(--color-brand)]">{categoryName}</span>}
            </div>
          )}

          <h1
            className="mb-4 text-[40px] font-semibold text-[var(--color-text-primary)] max-md:text-[28px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {event.text.name}
          </h1>

          {/* Date & time */}
          {dateStr && (
            <div className="mb-2 flex items-center gap-2 text-[14px] text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-jakarta)' }}>
              <svg className="size-4 text-[var(--color-brand)]" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 0a1 1 0 0 0-1 1v1H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-1V1a1 1 0 1 0-2 0v1H5V1a1 1 0 0 0-1-1zm7 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
              </svg>
              <span>{dateStr}</span>
            </div>
          )}

          {/* Schedule status */}
          {event.scheduleStatus && event.scheduleStatus !== 'On Schedule' && (
            <div className="mb-2 inline-block rounded-full bg-yellow-500/20 px-3 py-1 text-[13px] font-medium text-yellow-400">
              ⚠️ {event.scheduleStatus}
            </div>
          )}

          {/* Location */}
          {location && (
            <div className="mb-2 flex items-center gap-2 text-[14px] text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-jakarta)' }}>
              <svg className="size-4 text-[var(--color-text-muted)]" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5C2.5 10.65 8 16 8 16s5.5-5.35 5.5-10.5A5.53 5.53 0 0 0 8 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
              </svg>
              <span>{location}</span>
            </div>
          )}

          {/* Performers list */}
          {event.performers && event.performers.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-[13px] font-medium text-[var(--color-text-muted)]">Performers</p>
              <div className="flex flex-wrap gap-2">
                {event.performers.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full bg-white/5 px-4 py-1.5 text-[13px] text-[var(--color-text-secondary)]"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Event info cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-4">
              <p className="text-[12px] text-[var(--color-text-muted)]">Category</p>
              <p className="text-[14px] font-medium text-white">{categoryName ?? 'General'}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-4">
              <p className="text-[12px] text-[var(--color-text-muted)]">Available Tickets</p>
              <p className="text-[14px] font-medium text-white">
                {hasTickets ? `${ticketCount.toLocaleString()} tickets` : 'Check availability'}
              </p>
            </div>
            {event.isMultiDayEvent && (
              <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-4">
                <p className="text-[12px] text-[var(--color-text-muted)]">Type</p>
                <p className="text-[14px] font-medium text-white">Multi-day Event</p>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="mt-8 space-y-4">
            {[
              { q: t('faq_delivery_q'), a: t('faq_delivery_a') },
              { q: t('faq_refund_q'), a: t('faq_refund_a') },
              { q: t('faq_accessible_q'), a: t('faq_accessible_a') },
            ].map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-5"
              >
                <p className="font-medium text-white">{faq.q}</p>
                <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-80 shrink-0 max-lg:w-full">
          <div className="sticky top-24 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
            {/* Pricing */}
            {lowPrice !== undefined ? (
              <div className="mb-4">
                <p className="text-[24px] font-semibold text-[var(--color-text-primary)]">
                  {t('from_price', { price: lowPrice.toFixed(0) })}
                </p>
                {highPrice !== undefined && highPrice !== lowPrice && (
                  <p className="text-[13px] text-[var(--color-text-muted)]">
                    up to ${highPrice.toFixed(0)}
                  </p>
                )}
              </div>
            ) : (
              <p className="mb-4 text-[18px] font-semibold text-[var(--color-text-primary)]">
                {hasTickets ? 'Tickets Available' : 'Coming Soon'}
              </p>
            )}

            <p className="mb-6 text-[13px] text-[var(--color-text-muted)]">
              {hasTickets && ticketCount > 0
                ? `${ticketCount.toLocaleString()} tickets available`
                : t('people_viewing', { count: 42 }).replace('42 ', '')}
            </p>

            <button
              type="button"
              disabled
              aria-label={t('get_tickets_coming_soon')}
              className="w-full cursor-not-allowed rounded-full bg-[var(--color-brand)] py-3 text-[16px] font-medium text-white opacity-60"
            >
              {t('get_tickets')}
            </button>

            {/* Event quick facts */}
            <div className="mt-6 space-y-3 border-t border-[var(--color-surface-border)] pt-6">
              {event.venue?.text.name && (
                <div className="flex items-start gap-3">
                  <span className="text-[var(--color-text-muted)]">🏟️</span>
                  <div>
                    <p className="text-[13px] font-medium text-white">{event.venue.text.name}</p>
                    {event.city?.text.name && (
                      <p className="text-[12px] text-[var(--color-text-muted)]">
                        {event.city.text.name}
                        {event.stateProvince?.text.abbr ? `, ${event.stateProvince.text.abbr}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {event.date.text && (
                <div className="flex items-start gap-3">
                  <span className="text-[var(--color-text-muted)]">📅</span>
                  <div>
                    <p className="text-[13px] font-medium text-white">{event.date.text.date}</p>
                    <p className="text-[12px] text-[var(--color-text-muted)]">{event.date.text.time}</p>
                  </div>
                </div>
              )}
              {event.country?.text.name && (
                <div className="flex items-start gap-3">
                  <span className="text-[var(--color-text-muted)]">🌍</span>
                  <p className="text-[13px] font-medium text-white">{event.country.text.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Similar events */}
      <Suspense
        fallback={<div className="mt-12 h-64 animate-pulse rounded-2xl bg-[#1a1a1a]" />}
      >
        <SimilarEvents
          categoryPath={categoryPath}
          locale={locale}
          currentId={event.id}
        />
      </Suspense>
    </div>
  );
}

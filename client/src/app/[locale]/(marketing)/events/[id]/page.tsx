import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEventById, getEvents } from '@/libs/CatalogApi';
import { ApiError } from '@/libs/ApiClient';
import { EventCard, EventCardSkeleton } from '@/components/catalog/EventCard';
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
    return { title: 'Event — TicketLove.net' };
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

  let event;
  try {
    event = await getEventById(Number(id));
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

  const categoryPath = event.performers?.[0]?.categoryPath;

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <div className="flex gap-12 max-lg:flex-col">
        {/* Left column */}
        <div className="flex-1">
          <h1
            className="mb-4 text-[40px] font-semibold text-[var(--color-text-primary)] max-md:text-[28px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {event.text.name}
          </h1>

          {dateStr && (
            <p
              className="mb-2 text-[14px] text-white/60"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              {dateStr}
            </p>
          )}

          {event.venue && (
            <p
              className="mb-6 text-[14px] text-white/60"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              {event.venue.text.name}
              {event.venue.city ? `, ${event.venue.city}` : ''}
              {event.venue.stateProvince ? `, ${event.venue.stateProvince}` : ''}
            </p>
          )}

          {/* Ticket details */}
          <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
            <p className="mb-4 text-[16px] font-semibold text-white">{t('tab_details')}</p>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              {t('view_tickets_cta')}
            </p>
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
            {event.minPrice !== undefined && (
              <p className="mb-2 text-[24px] font-semibold text-[var(--color-text-primary)]">
                From ${event.minPrice.toFixed(0)}
              </p>
            )}
            <p className="mb-6 text-[13px] text-[var(--color-text-muted)]">
              42 {t('people_viewing')}
            </p>

            <button
              type="button"
              disabled
              aria-label={t('get_tickets_coming_soon')}
              className="w-full cursor-not-allowed rounded-full bg-[var(--color-brand)] py-3 text-[16px] font-medium text-white opacity-60"
            >
              {t('get_tickets')}
            </button>

            {/* Ad Zone placeholders */}
            <div className="mt-6 space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex h-24 items-center justify-center rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]"
                >
                  <span className="text-[13px] text-[var(--color-text-muted)]">
                    {t('ad_zone')}
                  </span>
                </div>
              ))}
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

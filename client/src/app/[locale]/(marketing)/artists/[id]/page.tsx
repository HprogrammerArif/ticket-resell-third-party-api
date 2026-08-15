import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPerformerById, getPerformers, searchEvents } from '@/libs/CatalogApi';
import { ApiError } from '@/libs/ApiClient';
import { ArtistCard, ArtistCardSkeleton } from '@/components/catalog/ArtistCard';
import { EventCard, EventCardSkeleton } from '@/components/catalog/EventCard';
import { SectionHeading } from '@/components/catalog/SectionHeading';

type ArtistDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata(props: ArtistDetailPageProps): Promise<Metadata> {
  const { locale, id } = await props.params;
  try {
    const performer = await getPerformerById(Number(id));
    const t = await getTranslations({ locale, namespace: 'ArtistDetailPage' });
    return { title: t('meta_title', { name: performer.text.name }) };
  } catch {
    const t = await getTranslations({ locale, namespace: 'ArtistDetailPage' });
    return { title: t('meta_title_fallback') };
  }
}

async function ArtistTourDates(props: { performerName: string; locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'ArtistDetailPage' });
  const { results } = await searchEvents({ keyword: props.performerName, pageSize: 12 });

  if (results.length === 0) {
    return <p className="text-[var(--color-text-muted)]">{t('no_events')}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
      {results.map((ev) => (
        <EventCard key={ev.id} event={ev} locale={props.locale} />
      ))}
    </div>
  );
}

async function SimilarArtists(props: {
  categoryPath?: string;
  currentId: number;
  locale: string;
}) {
  if (!props.categoryPath) return null;
  const t = await getTranslations({ locale: props.locale, namespace: 'ArtistDetailPage' });
  const { results } = await getPerformers({ categoryPath: props.categoryPath, pageSize: 7 });
  const filtered = results.filter((p) => p.id !== props.currentId).slice(0, 6);
  if (filtered.length === 0) return null;

  return (
    <section className="mt-12">
      <SectionHeading title={t('similar_artists')} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {filtered.map((p) => (
          <div key={p.id} className="min-w-[160px]">
            <ArtistCard performer={p} locale={props.locale} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ArtistDetailPage(props: ArtistDetailPageProps) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ArtistDetailPage' });

  let performer;
  try {
    performer = await getPerformerById(Number(id));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const initials = performer.text.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      {/* Artist header */}
      <div className="mb-12 flex items-center gap-8 max-md:flex-col max-md:text-center">
        <div className="relative size-[120px] shrink-0 overflow-hidden rounded-full">
          {performer.imageUrl ? (
            <Image
              src={performer.imageUrl}
              alt={performer.text.name}
              fill
              className="object-cover"
              sizes="120px"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-[var(--color-brand)] text-[36px] font-semibold text-white">
              {initials}
            </div>
          )}
        </div>

        <div>
          <h1
            className="text-[40px] font-semibold text-[var(--color-text-primary)] max-md:text-[28px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {performer.text.name}
          </h1>
          {performer.upcomingEventCount !== undefined && (
            <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">
              {performer.upcomingEventCount} {t('upcoming_events')}
            </p>
          )}
        </div>
      </div>

      {/* Tour dates */}
      <section>
        <SectionHeading title={t('tab_tour_dates')} />
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <ArtistTourDates performerName={performer.text.name} locale={locale} />
        </Suspense>
      </section>

      {/* About */}
      <section className="mt-12">
        <SectionHeading title={t('tab_about')} />
        <p className="text-[14px] text-[var(--color-text-secondary)]">{t('bio_placeholder')}</p>
      </section>

      {/* Similar artists */}
      <Suspense
        fallback={
          <div className="mt-12 flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="min-w-[160px]">
                <ArtistCardSkeleton />
              </div>
            ))}
          </div>
        }
      >
        <SimilarArtists
          categoryPath={performer.categoryPath}
          currentId={performer.id}
          locale={locale}
        />
      </Suspense>
    </div>
  );
}

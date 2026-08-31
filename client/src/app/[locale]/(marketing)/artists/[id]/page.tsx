import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPerformerById, getPerformers, searchEvents, getPerformerImage } from '@/libs/CachedCatalogApi';
import { PerformerImage } from '@/components/catalog/PerformerImage';
import { ApiError } from '@/libs/ApiClient';
import { ArtistCard } from '@/components/catalog/ArtistCard';
import { ArtistCardSkeleton } from '@/components/catalog/ArtistCardSkeleton';
import { EventCard } from '@/components/catalog/EventCard';
import { EventCardSkeleton } from '@/components/catalog/EventCardSkeleton';
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

  // Promise.all rather than a loop: one slow Wikimedia lookup should not
  // serialise the rest of the row.
  const images = await Promise.all(
    filtered.map((p) => getPerformerImage(p.text.name, p.defaultCategory?.text.name)),
  );

  return (
    <section className="mt-12">
      <SectionHeading title={t('similar_artists')} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {filtered.map((p, i) => (
          <div key={p.id} className="min-w-[160px]">
            <ArtistCard performer={p} locale={props.locale} image={images[i]} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Generate a deterministic HSL color from performer name. */
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 40%)`;
}

export default async function ArtistDetailPage(props: ArtistDetailPageProps) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ArtistDetailPage' });

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) { notFound(); }

  let performer;
  try {
    performer = await getPerformerById(numericId);
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

  const bgColor = nameToColor(performer.text.name);
  const eventCount = performer._metadata?.eventCount ?? 0;
  const ticketCount = performer._metadata?.ticketCount ?? 0;
  const hasEvents = performer._metadata?.hasEvents ?? false;
  const categoryName = performer.defaultCategory?.text.name;
  const parentCategory = performer.defaultCategory?.ancestors?.[0]?.text.name;
  const categoryPath = performer.defaultCategory?.path;

  const image = await getPerformerImage(performer.text.name, categoryName);

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      {/* Category breadcrumb */}
      {(parentCategory || categoryName) && (
        <div className="mb-4 flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
          {parentCategory && (
            <>
              <span>{parentCategory}</span>
              <span>›</span>
            </>
          )}
          {categoryName && <span className="text-[var(--color-brand)]">{categoryName}</span>}
        </div>
      )}

      {/* Artist header */}
      <div className="mb-12 flex items-center gap-8 max-md:flex-col max-md:text-center">
        <div className="relative size-[120px] shrink-0 overflow-hidden rounded-full ring-4 ring-[var(--color-surface-border)]">
          {image
            ? (
                <PerformerImage
                  image={image}
                  name={performer.text.name}
                  className="absolute inset-0"
                  sizes="120px"
                />
              )
            : (
                <div
                  className="flex size-full items-center justify-center text-[36px] font-semibold text-white"
                  style={{ backgroundColor: bgColor }}
                >
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

          {/* Stats row */}
          <div className="mt-2 flex flex-wrap items-center gap-4 max-md:justify-center">
            {hasEvents && eventCount > 0 && (
              <span className="flex items-center gap-1.5 text-[14px] text-[var(--color-text-secondary)]">
                <svg className="size-4 text-[var(--color-brand)]" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 0a1 1 0 0 0-1 1v1H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-1V1a1 1 0 1 0-2 0v1H5V1a1 1 0 0 0-1-1zm7 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                {t('upcoming_events', { count: eventCount })}
              </span>
            )}
            {ticketCount > 0 && (
              <span className="flex items-center gap-1.5 text-[14px] text-[var(--color-text-muted)]">
                🎟️ {ticketCount.toLocaleString()} tickets available
              </span>
            )}
            {categoryName && (
              <span className="rounded-full bg-white/5 px-3 py-0.5 text-[12px] text-[var(--color-text-muted)]">
                {categoryName}
              </span>
            )}
          </div>
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
          categoryPath={categoryPath}
          currentId={performer.id}
          locale={locale}
        />
      </Suspense>
    </div>
  );
}

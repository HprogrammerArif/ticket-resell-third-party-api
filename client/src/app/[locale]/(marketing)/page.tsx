import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import { getTranslations, getFormatter, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { getEvents, getCategories, getPerformers, getPerformerImage, getCities } from '@/libs/CachedCatalogApi';
import { EventCard } from '@/components/catalog/EventCard';
import { EventCardSkeleton } from '@/components/catalog/EventCardSkeleton';
import { ArtistCard } from '@/components/catalog/ArtistCard';
import { ArtistCardSkeleton } from '@/components/catalog/ArtistCardSkeleton';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { CategoryCardSkeleton } from '@/components/catalog/CategoryCardSkeleton';
import { SearchBar } from '@/components/catalog/SearchBar';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { HeroSlider } from '@/components/catalog/HeroSlider';
import { DragScrollContainer } from '@/components/catalog/DragScrollContainer';
import { CityEventsTabs } from '@/components/catalog/CityEventsTabs';
import { GiftCardBanner } from '@/components/catalog/GiftCardBanner';
import { HowItWorksSection } from '@/components/catalog/HowItWorksSection';
import { StatsSection } from '@/components/catalog/StatsSection';
import { getEventImages } from '@/libs/EventImage';

type HomePageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata(props: HomePageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'HomePage' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export async function HeroSection(props: { locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'HomePage' });
  const format = await getFormatter({ locale: props.locale });
  const { results: events } = await getEvents({ pageSize: 5 });
  const featured = events[0];

  return (
    <section className="relative min-h-[600px] bg-gradient-to-br from-[#0f0f0f] to-[#1a0a0d] px-[107px] py-20 max-md:px-4">
      {/* Background concert image slider */}
      <HeroSlider />

      <div className="relative z-30 mx-auto max-w-[1440px]">
        {featured && (
          <div className="max-w-2xl">
            <h1
              className="mb-4 text-[60px] font-semibold leading-[75px] tracking-[-1.5px] text-white max-md:text-[36px] max-md:leading-tight"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {featured.text.name}
            </h1>
            <div
              className="mb-2 flex gap-4 text-[14px] text-white/60"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              {featured.date.datetime && (
                <span>
                  {format.dateTime(new Date(featured.date.datetime), { dateStyle: 'medium' })}
                </span>
              )}
              {featured.venue && (
                <span>
                  {featured.venue.text.name}
                  {featured.city?.text.name ? `, ${featured.city.text.name}` : ''}
                  {featured.stateProvince?.text.abbr ? `, ${featured.stateProvince.text.abbr}` : ''}
                </span>
              )}
            </div>
            <Link
              href={`/events/${featured.id}`}
              className="mt-6 inline-block rounded-full bg-[var(--color-brand-muted)] px-8 py-3 text-[18px] font-medium text-white hover:bg-[var(--color-brand)]"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {t('hero_get_tickets')}
            </Link>
          </div>
        )}

        {/* SearchBar overlay */}
        <div className="mt-12 max-w-3xl">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}

export async function SponsorSection() {
  const sponsors = [
    { name: 'Google', src: '/sponsors/google.svg', width: 95, height: 40 },
    { name: 'Spotify', src: '/sponsors/spotify.svg', width: 117, height: 40 },
    { name: 'Canva', src: '/sponsors/canva.svg', width: 84, height: 40 },
    { name: 'Zoom', src: '/sponsors/zoom.svg', width: 82, height: 40 },
    { name: 'Slack', src: '/sponsors/slack.svg', width: 101, height: 40 },
  ];

  // Repeat items to ensure seamless infinite looping on all screen sizes
  const repeatedSponsors = [...sponsors, ...sponsors, ...sponsors, ...sponsors];

  return (
    <section className="relative w-full overflow-hidden border-y border-[#262626]/50 bg-[#160a0e] py-4 md:py-6">
      {/* Edge gradient fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0f0f0f] to-transparent max-md:w-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0f0f0f] to-transparent max-md:w-10" />

      <div className="flex w-max animate-marquee items-center gap-12 sm:gap-16 md:gap-20">
        {repeatedSponsors.map((sponsor, index) => (
          <div key={index} className="flex flex-shrink-0 items-center justify-center">
            <Image
              src={sponsor.src}
              alt={sponsor.name}
              width={sponsor.width}
              height={sponsor.height}
              className="h-6 sm:h-7 w-auto object-contain opacity-70 transition-opacity duration-300 hover:opacity-100"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export async function CategoriesSection(props: { locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'HomePage' });
  const { results: categories } = await getCategories({ pageSize: 50, hasEvents: true });

  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading
        title={t('browse_by_category')}
        seeAllHref="/categories"
        seeAllLabel={t('see_all_categories')}
      />
      <DragScrollContainer>
        {categories.map((cat) => (
          <CategoryCard key={cat.path} category={cat} locale={props.locale} />
        ))}
        <Link
          href="/categories"
          draggable={false}
          className="group flex h-[200px] w-[200px] shrink-0 select-none flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-surface-border)] bg-[var(--color-surface-raised)]/60 p-6 text-center transition-all hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)]"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-white/5 text-xl text-white transition-all group-hover:scale-110 group-hover:bg-[var(--color-brand)]">
            →
          </div>
          <p
            className="text-[15px] font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-white"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {t('see_all_categories')}
          </p>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Explore directory
          </span>
        </Link>
      </DragScrollContainer>
    </section>
  );
}

function CategoriesSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-[#262626]" />
      <DragScrollContainer>
        {Array.from({ length: 6 }).map((_, i) => (
          <CategoryCardSkeleton key={i} />
        ))}
      </DragScrollContainer>
    </section>
  );
}

export async function WeekendEventsSection(props: { locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'HomePage' });
  const today = new Date().toISOString().split('T')[0]!;
  const sunday = new Date();
  sunday.setDate(sunday.getDate() + (7 - sunday.getDay()));
  const dateToStr = sunday.toISOString().split('T')[0]!;
  const { results: events } = await getEvents({ dateFrom: today, dateTo: dateToStr, pageSize: 12 });
  const eventImages = await getEventImages(events);

  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading
        title={t('happening_this_weekend')}
        seeAllHref="/events"
        seeAllLabel={t('see_all_events')}
      />
      <DragScrollContainer autoStep={true} stepInterval={3000} stepDistance={346}>
        {events.map((ev, i) => (
          <div key={ev.id} className="w-[300px] shrink-0 sm:w-[330px]">
            <EventCard event={ev} locale={props.locale} image={eventImages[i] ?? null} />
          </div>
        ))}
      </DragScrollContainer>
    </section>
  );
}

function WeekendEventsSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <div className="mb-6 h-8 w-72 animate-pulse rounded bg-[#262626]" />
      <DragScrollContainer>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-[300px] shrink-0 sm:w-[330px]">
            <EventCardSkeleton />
          </div>
        ))}
      </DragScrollContainer>
    </section>
  );
}

export async function ArtistsSection(props: { locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'HomePage' });
  const { results: performers } = await getPerformers({ pageSize: 12 });

  // Promise.all rather than a loop: one slow Wikimedia lookup should not
  // serialise the rest of the row.
  const images = await Promise.all(
    performers.map((p) =>
      getPerformerImage(p.text.name, p.defaultCategory?.text.name),
    ),
  );

  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading
        title={t('popular_artists')}
        seeAllHref="/artists"
        seeAllLabel={t('see_all_artists')}
      />
      <DragScrollContainer>
        {performers.map((p, i) => (
          <div key={p.id} className="w-[180px] shrink-0">
            <ArtistCard performer={p} locale={props.locale} image={images[i] ?? null} />
          </div>
        ))}
      </DragScrollContainer>
    </section>
  );
}

function ArtistsSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-[#262626]" />
      <DragScrollContainer>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-[180px] shrink-0">
            <ArtistCardSkeleton />
          </div>
        ))}
      </DragScrollContainer>
    </section>
  );
}

export async function CityEventsSection(props: { locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'HomePage' });
  const { results: cities } = await getCities({ pageSize: 8, hasEvents: true });
  if (cities.length === 0) return null;

  const cityGroups = await Promise.all(
    cities.slice(0, 6).map(async (city) => {
      const { results: events } = await getEvents({ city: city.text.name, pageSize: 6 });
      return {
        cityName: city.text.name,
        state: city.stateProvince?.text.abbr ?? '',
        events,
        images: await getEventImages(events),
      };
    }),
  );

  const validGroups = cityGroups.filter((g) => g.events.length > 0);
  if (validGroups.length === 0) return null;


  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading
        title={t('city_electric')}
        seeAllHref="/events"
        seeAllLabel={t('see_all_events')}
      />
      <CityEventsTabs
        cityGroups={validGroups}
        locale={props.locale}
        seeAllLabel={t('see_all_events')}
      />
    </section>
  );
}

function CityEventsSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <div className="mb-6 h-8 w-80 animate-pulse rounded bg-[#262626]" />
      <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-32 shrink-0 animate-pulse rounded-full bg-[#262626]" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

function GiftCardSection(props: { locale: string; t: Awaited<ReturnType<typeof getTranslations>> }) {
  const { t } = props;
  return (
    <GiftCardBanner
      heading={t('gift_card_heading')}
      subheading={t('gift_card_subheading')}
      description={t('gift_card_description')}
      cta={t('gift_card_cta')}
      cardLabel={t('gift_card_label')}
    />
  );
}

export default async function HomePage(props: HomePageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return (
    <>
      <Suspense fallback={<div className="h-[600px] animate-pulse bg-[#1a0a0d]" />}>
        <HeroSection locale={locale} />
      </Suspense>

      <Suspense>
        <SponsorSection />
      </Suspense>

      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesSection locale={locale} />
      </Suspense>

      <Suspense fallback={<WeekendEventsSkeleton />}>
        <WeekendEventsSection locale={locale} />
      </Suspense>

      <Suspense fallback={<ArtistsSkeleton />}>
        <ArtistsSection locale={locale} />
      </Suspense>

      <Suspense fallback={<CityEventsSkeleton />}>
        <CityEventsSection locale={locale} />
      </Suspense>

      <GiftCardSection locale={locale} t={t} />
      <HowItWorksSection locale={locale} />
      <StatsSection
        stat1Value={t('stat_1_value')}
        stat1Label={t('stat_1_label')}
        stat2Value={t('stat_2_value')}
        stat2Label={t('stat_2_label')}
        stat3Value={t('stat_3_value')}
        stat3Label={t('stat_3_label')}
        stat4Value={t('stat_4_value')}
        stat4Label={t('stat_4_label')}
      />
    </>
  );
}

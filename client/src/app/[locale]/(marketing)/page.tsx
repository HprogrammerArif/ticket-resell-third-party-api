import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import { getTranslations, getFormatter, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { getEvents, getCategories, getPerformers, getCities } from '@/libs/CachedCatalogApi';
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
      <SectionHeading title={t('browse_by_category')} />
      <DragScrollContainer>
        {categories.map((cat) => (
          <CategoryCard key={cat.path} category={cat} locale={props.locale} />
        ))}
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
  const { results: events } = await getEvents({ dateFrom: today, dateTo: dateToStr, pageSize: 6 });

  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading
        title={t('happening_this_weekend')}
        seeAllHref="/events"
        seeAllLabel={t('see_all_events')}
      />
      <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {events.map((ev) => (
          <EventCard key={ev.id} event={ev} locale={props.locale} />
        ))}
      </div>
    </section>
  );
}

function WeekendEventsSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <div className="mb-6 h-8 w-72 animate-pulse rounded bg-[#262626]" />
      <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export async function ArtistsSection(props: { locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'HomePage' });
  const { results: performers } = await getPerformers({ pageSize: 12 });

  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading
        title={t('popular_artists')}
        seeAllHref="/artists"
        seeAllLabel={t('see_all_artists')}
      />
      <DragScrollContainer>
        {performers.map((p) => (
          <div key={p.id} className="w-[180px] shrink-0">
            <ArtistCard performer={p} locale={props.locale} />
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
  const { results: cities } = await getCities({ pageSize: 5, hasEvents: true });
  const defaultCity = cities[0]?.text.name ?? '';
  if (!defaultCity) return null;
  const { results: events } = await getEvents({ city: defaultCity, pageSize: 6 });

  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading
        title={t('city_electric')}
        seeAllHref={`/events?city=${encodeURIComponent(defaultCity)}`}
        seeAllLabel={t('see_all_events')}
      />
      <p className="mb-4 text-[14px] text-[var(--color-text-muted)]">
        {defaultCity}
      </p>
      <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {events.map((ev) => (
          <EventCard key={ev.id} event={ev} locale={props.locale} />
        ))}
      </div>
    </section>
  );
}

function CityEventsSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <div className="mb-6 h-8 w-80 animate-pulse rounded bg-[#262626]" />
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
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0d] to-[#0f0f0f] p-12 max-md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(234,42,67,0.15),transparent_60%)]" />
        <div className="relative grid grid-cols-2 gap-8 max-md:grid-cols-1">
          <div>
            <p className="mb-2 text-[14px] font-medium text-[var(--color-brand)]">
              {t('gift_card_heading')}
            </p>
            <h2
              className="mb-4 text-[40px] font-semibold leading-tight text-white max-md:text-[28px]"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {t('gift_card_subheading')}
            </h2>
            <p className="mb-6 text-[var(--color-text-secondary)]">
              {t('gift_card_description')}
            </p>
            {/* TODO: update href when /gift-cards route exists */}
            <Link
              href="/gift-cards"
              className="inline-block rounded-full bg-[var(--color-brand)] px-8 py-3 font-medium text-white hover:bg-[#c41e33]"
            >
              {t('gift_card_cta')}
            </Link>
          </div>
          {/* Static gift card visual */}
          <div className="flex items-center justify-center">
            <div className="w-64 rounded-2xl border border-[var(--color-brand-muted)] bg-[var(--color-surface-raised)] p-6 text-center">
              <p className="mb-2 text-[14px] text-[var(--color-text-muted)]">{t('gift_card_label')}</p>
              <p className="text-[48px] font-semibold text-[var(--color-brand)]">$100</p>
              <p className="mt-2 text-[13px] tracking-widest text-[var(--color-text-muted)]">
                8472
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection(props: { locale: string; t: Awaited<ReturnType<typeof getTranslations>> }) {
  const { t } = props;
  const steps = [
    { title: t('step_1_title'), description: t('step_1_description'), icon: '🔍' },
    { title: t('step_2_title'), description: t('step_2_description'), icon: '🎫' },
    { title: t('step_3_title'), description: t('step_3_description'), icon: '🎉' },
  ] as const;

  return (
    <section className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
      <SectionHeading title={t('how_it_works_heading')} />
      <div className="grid grid-cols-3 gap-8 max-md:grid-cols-1">
        {steps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-8 text-center">
            <div className="mb-4 text-5xl">{step.icon}</div>
            <h3
              className="mb-3 text-[20px] font-semibold text-[var(--color-text-primary)]"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {step.title}
            </h3>
            <p className="text-[14px] text-[var(--color-text-secondary)]">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsSection(props: { locale: string; t: Awaited<ReturnType<typeof getTranslations>> }) {
  const { t } = props;
  const stats = [
    { value: t('stat_1_value'), label: t('stat_1_label') },
    { value: t('stat_2_value'), label: t('stat_2_label') },
    { value: t('stat_3_value'), label: t('stat_3_label') },
    { value: t('stat_4_value'), label: t('stat_4_label') },
  ] as const;

  return (
    <section className="bg-[var(--color-surface-raised)] px-[107px] py-16 max-md:px-4">
      <div className="mx-auto grid max-w-[1440px] grid-cols-4 gap-8 max-md:grid-cols-2">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p
              className="text-[48px] font-semibold text-[var(--color-brand)]"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {stat.value}
            </p>
            <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
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
        <SponsorSection/>
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
      <HowItWorksSection locale={locale} t={t} />
      <StatsSection locale={locale} t={t} />
    </>
  );
}

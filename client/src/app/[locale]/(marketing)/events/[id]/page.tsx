import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEventById, getEvents, getVenueById } from '@/libs/CachedCatalogApi';
import { ApiError } from '@/libs/ApiClient';
import { EventCard } from '@/components/catalog/EventCard';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { EventDetailTabs } from '@/components/catalog/EventDetailTabs';
import { MapWidgetEmbed } from '@/components/catalog/MapWidgetEmbed';
import { Link } from '@/libs/I18nNavigation';
import type { TnEvent, TnVenue } from '@/types/Catalog';

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

// ─── Similar Events ───────────────────────────────────────────────────────────

async function SimilarEvents(props: { categoryPath?: string; locale: string; currentId: number }) {
  if (!props.categoryPath) return null;
  const { results } = await getEvents({ categoryPath: props.categoryPath, pageSize: 4 });
  const filtered = results.filter((e) => e.id !== props.currentId);
  if (filtered.length === 0) return null;

  const t = await getTranslations({ locale: props.locale, namespace: 'EventDetailPage' });

  return (
    <section className="mt-16 border-t border-[var(--color-surface-border)] pt-12">
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

// ─── Tab: Lineup ──────────────────────────────────────────────────────────────

function LineupTab(props: { event: TnEvent }) {
  const performers = props.event.performers ?? [];

  if (performers.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--color-text-muted)]">
        <p className="text-4xl mb-3">🎤</p>
        <p className="text-[15px]">Lineup not announced yet.</p>
      </div>
    );
  }

  // Separate headliners (isPerformance=true or first) from support
  const headliners = performers.filter((p) => p.isPerformance !== false);
  const support = performers.filter((p) => p.isPerformance === false);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {headliners.map((p, i) => (
          <Link
            key={p.id}
            href={`/artists/${p.id}`}
            className="group flex items-center gap-4 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-4 transition-all hover:border-[var(--color-brand-muted)] hover:shadow-md hover:shadow-[var(--color-brand-subtle)]"
          >
            {/* Avatar placeholder */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[#ff6b6b] text-[18px]">
              {i === 0 ? '⭐' : '🎤'}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white transition-colors group-hover:text-[var(--color-brand)]">
                {p.name}
              </p>
              {p.role && (
                <p className="text-[12px] text-[var(--color-text-muted)]">{p.role}</p>
              )}
            </div>
            <svg className="size-4 text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-brand)]" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </Link>
        ))}
      </div>

      {support.length > 0 && (
        <>
          <p className="text-[12px] font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
            Supporting Acts
          </p>
          <div className="flex flex-wrap gap-2">
            {support.map((p) => (
              <Link
                key={p.id}
                href={`/artists/${p.id}`}
                className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-[13px] text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-brand-muted)] hover:text-white"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Venue ───────────────────────────────────────────────────────────────

function VenueTab(props: { event: TnEvent; venue?: TnVenue | null }) {
  const ev = props.event;
  const venue = props.venue;
  const venueName = venue?.text.name ?? ev.venue?.text.name;
  const formerNames = venue?.text.formerNames ?? [];
  const address = venue?.address?.text?.address1;
  const postalCode = venue?.address?.postalCode;
  const capacity = venue?.capacity;
  const geo = venue?.geoLocation ?? ev.geoLocation;

  const cityName = venue?.city?.text.name ?? ev.city?.text.name;
  const stateName = venue?.stateProvince?.text.abbr ?? venue?.stateProvince?.text.name ?? ev.stateProvince?.text.abbr ?? ev.stateProvince?.text.name;
  const countryName = venue?.country?.text.name ?? ev.country?.text.name;

  const mapsUrl = geo
    ? `https://www.google.com/maps?q=${geo.latitude},${geo.longitude}`
    : venueName
      ? `https://www.google.com/maps/search/${encodeURIComponent(venueName + (cityName ? ` ${cityName}` : ''))}`
      : null;

  if (!venueName) {
    return (
      <div className="py-12 text-center text-[var(--color-text-muted)]">
        <p className="text-4xl mb-3">🏟️</p>
        <p className="text-[15px]">Venue information not available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Main venue card */}
      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Venue</p>
            <h3 className="text-[22px] font-bold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
              {venueName}
            </h3>
            {formerNames.length > 0 && (
              <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                Formerly: {formerNames.join(', ')}
              </p>
            )}
          </div>
          <span className="text-3xl">🏟️</span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          {(address || postalCode) && (
            <div>
              <p className="text-[11px] text-[var(--color-text-muted)]">Address</p>
              <p className="text-[14px] text-white">
                {address ?? ''}
                {postalCode ? ` ${postalCode}` : ''}
              </p>
            </div>
          )}
          {(cityName || stateName || countryName) && (
            <div>
              <p className="text-[11px] text-[var(--color-text-muted)]">Location</p>
              <p className="text-[14px] text-white">
                {[cityName, stateName, countryName].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
          {capacity && capacity > 0 && (
            <div>
              <p className="text-[11px] text-[var(--color-text-muted)]">Capacity</p>
              <p className="text-[14px] font-semibold text-white">
                {capacity.toLocaleString()} seats
              </p>
            </div>
          )}
          {geo && (
            <div>
              <p className="text-[11px] text-[var(--color-text-muted)]">Coordinates</p>
              <p className="text-[13px] text-[var(--color-text-secondary)] font-mono">
                {geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)}
              </p>
            </div>
          )}
        </div>

        {/* Capacity bar */}
        {capacity && capacity > 0 && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>Venue Size</span>
              <span>
                {capacity >= 50000 ? 'Stadium' : capacity >= 20000 ? 'Arena' : capacity >= 5000 ? 'Theatre' : 'Club'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-[var(--color-brand)] to-[#ff9f43]"
                style={{ width: `${Math.min(100, (capacity / 80000) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Map link button */}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] py-3 text-[14px] font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-brand-muted)] hover:text-white"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          View on Google Maps
        </a>
      )}
    </div>
  );
}

// ─── Tab: FAQ ─────────────────────────────────────────────────────────────────

function FaqTab(props: { faqs: { q: string; a: string }[] }) {
  return (
    <div className="space-y-3">
      {props.faqs.map((faq, i) => (
        <details
          key={i}
          className="group rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-5 transition-colors open:border-[var(--color-brand-muted)]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">
            <span>{faq.q}</span>
            <svg
              className="size-5 shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            {faq.a}
          </p>
        </details>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default async function EventDetailPage(props: EventDetailPageProps) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'EventDetailPage' });

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) { notFound(); }

  let event: TnEvent;
  try {
    event = await getEventById(numericId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // Fetch full venue details for the Venue tab
  let fullVenue: TnVenue | null = null;
  if (event.venue?.id) {
    try {
      fullVenue = await getVenueById(event.venue.id);
    } catch {
      // graceful degradation — venue tab will still show embedded data
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const categoryPath = event.defaultCategory?.path;
  const categoryName = event.defaultCategory?.text.name;
  const ancestors = event.defaultCategory?.ancestors ?? [];
  const meta = event._metadata;
  const hasTickets = meta?.hasTickets ?? false;
  const ticketCount = meta?.ticketCount ?? 0;

  const dateStr = event.date.datetime
    ? new Date(event.date.datetime).toLocaleString(locale, {
        weekday: 'long', month: 'long', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : event.date.text?.date ?? event.date.date;

  const timeStr = event.date.text?.time ?? event.date.time;
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayLabel = typeof event.date.weekday === 'number' ? weekdayNames[event.date.weekday] : undefined;

  const venueName = fullVenue?.text.name ?? event.venue?.text.name;
  const cityName = fullVenue?.city?.text.name ?? event.city?.text.name;
  const stateAbbr = fullVenue?.stateProvince?.text.abbr ?? event.stateProvince?.text.abbr ?? event.stateProvince?.text.name;
  const countryName = fullVenue?.country?.text.name ?? event.country?.text.name;

  const faqs = [
    { q: t('faq_delivery_q'), a: t('faq_delivery_a') },
    { q: t('faq_refund_q'), a: t('faq_refund_a') },
    { q: t('faq_accessible_q'), a: t('faq_accessible_a') },
  ];

  // Category visual for the hero gradient
  function heroStyle(name?: string) {
    if (!name) return 'from-[#1a1a2e] to-[#16213e]';
    const lower = name.toLowerCase();
    if (lower.includes('concert') || lower.includes('music') || lower.includes('rock') || lower.includes('pop') || lower.includes('alternative') || lower.includes('indie') || lower.includes('r&b') || lower.includes('hip hop')) return 'from-[#2d1b69] via-[#3b1f7a] to-[#1a0a3e]';
    if (lower.includes('sport') || lower.includes('basketball') || lower.includes('football') || lower.includes('hockey') || lower.includes('baseball') || lower.includes('soccer') || lower.includes('nfl') || lower.includes('nba') || lower.includes('mlb') || lower.includes('nhl')) return 'from-[#0d3b2e] via-[#0f4838] to-[#1a2e1a]';
    if (lower.includes('theatre') || lower.includes('theater') || lower.includes('broadway') || lower.includes('comedy') || lower.includes('musical')) return 'from-[#3b1a1a] via-[#4a2020] to-[#2e1a0d]';
    if (lower.includes('family') || lower.includes('kids') || lower.includes('cirque')) return 'from-[#1a2e3b] via-[#1e3848] to-[#0d1a2e]';
    return 'from-[#1a1a2e] via-[#1e1e38] to-[#16213e]';
  }
  const heroGradient = heroStyle(categoryName);

  // Category emoji
  function categoryEmoji(name?: string) {
    if (!name) return '🎟️';
    const lower = name.toLowerCase();
    if (lower.includes('concert') || lower.includes('music')) return '🎵';
    if (lower.includes('rock') || lower.includes('metal')) return '🎸';
    if (lower.includes('pop') || lower.includes('r&b') || lower.includes('hip hop')) return '🎤';
    if (lower.includes('sport') || lower.includes('nfl') || lower.includes('football')) return '🏈';
    if (lower.includes('nba') || lower.includes('basketball')) return '🏀';
    if (lower.includes('nhl') || lower.includes('hockey')) return '🏒';
    if (lower.includes('mlb') || lower.includes('baseball')) return '⚾';
    if (lower.includes('soccer') || lower.includes('mls')) return '⚽';
    if (lower.includes('theatre') || lower.includes('theater') || lower.includes('broadway')) return '🎭';
    if (lower.includes('comedy')) return '😂';
    if (lower.includes('family') || lower.includes('kids')) return '🎪';
    if (lower.includes('festival')) return '🎉';
    return '🎟️';
  }
  const heroEmoji = categoryEmoji(categoryName);

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-10 max-md:px-4">

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <div className={`relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br ${heroGradient}`}>
        {/* Decorative background emoji */}
        <div className="pointer-events-none absolute -right-6 -top-6 text-[200px] opacity-[0.07] select-none" aria-hidden="true">
          {heroEmoji}
        </div>
        {/* Glow */}
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--color-brand)] opacity-10 blur-3xl" />

        <div className="relative z-10 p-8 max-sm:p-5">
          {/* Breadcrumb */}
          <nav className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-white/50">
            <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
            {ancestors.map((a) => (
              <span key={a.path} className="flex items-center gap-2">
                <span>/</span>
                <Link href={`/categories/${a.path}`} className="hover:text-white/80 transition-colors">
                  {a.text.name}
                </Link>
              </span>
            ))}
            {categoryName && (
              <span className="flex items-center gap-2">
                <span>/</span>
                <Link href={`/categories/${categoryPath}`} className="hover:text-white/80 transition-colors">
                  {categoryName}
                </Link>
              </span>
            )}
          </nav>

          {/* Status badges */}
          <div className="mb-3 flex flex-wrap gap-2">
            {event.scheduleStatus && event.scheduleStatus !== 'On Schedule' && (
              <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-[12px] font-medium text-yellow-400 border border-yellow-500/30">
                ⚠️ {event.scheduleStatus}
              </span>
            )}
            {event.isMultiDayEvent && (
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[12px] font-medium text-blue-400 border border-blue-500/30">
                📅 Multi-day Event
              </span>
            )}
            {hasTickets && ticketCount > 0 && ticketCount < 50 && (
              <span className="rounded-full bg-[var(--color-brand)]/20 px-3 py-1 text-[12px] font-medium text-[var(--color-brand)] border border-[var(--color-brand)]/30">
                🔥 Selling Fast
              </span>
            )}
          </div>

          {/* Event title */}
          <h1
            className="mb-5 text-[38px] font-bold text-white leading-tight max-md:text-[28px] max-sm:text-[22px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {event.text.name}
          </h1>

          {/* Meta strip */}
          <div className="flex flex-wrap items-center gap-5 text-[14px]">
            {dateStr && (
              <div className="flex items-center gap-2 text-white/80">
                <svg className="size-4 shrink-0 text-[var(--color-brand)]" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 0a1 1 0 0 0-1 1v1H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-1V1a1 1 0 1 0-2 0v1H5V1a1 1 0 0 0-1-1zm7 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                <span>
                  {weekdayLabel ? `${weekdayLabel}, ` : ''}{dateStr}
                  {timeStr && timeStr !== dateStr ? ` · ${timeStr}` : ''}
                </span>
              </div>
            )}
            {(venueName || cityName) && (
              <div className="flex items-center gap-2 text-white/70">
                <svg className="size-4 shrink-0 text-white/40" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5C2.5 10.65 8 16 8 16s5.5-5.35 5.5-10.5A5.53 5.53 0 0 0 8 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                </svg>
                <span>
                  {[venueName, cityName, stateAbbr].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Layout ───────────────────────────────────────────────── */}
      <div className="flex gap-10 max-lg:flex-col">

        {/* Left: Tabs */}
        <div className="flex-1 min-w-0">
          <EventDetailTabs
            tabs={[
              { id: 'tickets', label: t('tab_tickets'), icon: '🎟' },
              { id: 'lineup', label: t('tab_lineup'), icon: '🎤' },
              { id: 'venue', label: t('tab_venue'), icon: '🏟' },
              { id: 'faq', label: t('tab_faq'), icon: '❓' },
            ]}
          >
            <MapWidgetEmbed eventId={event.id} />
            <LineupTab event={event} />
            <VenueTab event={event} venue={fullVenue} />
            <FaqTab faqs={faqs} />
          </EventDetailTabs>
        </div>

        {/* Right: Sticky sidebar */}
        <div className="w-80 shrink-0 max-lg:w-full">
          <div className="sticky top-24 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">

            {/* Quick facts */}
            <div className="space-y-3">
              {venueName && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">🏟️</span>
                  <div>
                    <p className="text-[13px] font-medium text-white">{venueName}</p>
                    {cityName && (
                      <p className="text-[12px] text-[var(--color-text-muted)]">
                        {[cityName, stateAbbr].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {dateStr && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">📅</span>
                  <div>
                    <p className="text-[13px] font-medium text-white">{event.date.text?.date ?? event.date.date}</p>
                    {timeStr && <p className="text-[12px] text-[var(--color-text-muted)]">{timeStr}</p>}
                  </div>
                </div>
              )}
              {countryName && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">🌍</span>
                  <p className="text-[13px] font-medium text-white">{countryName}</p>
                </div>
              )}
              {categoryName && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">🏷️</span>
                  <Link
                    href={`/categories/${categoryPath}`}
                    className="text-[13px] text-[var(--color-brand)] hover:underline"
                  >
                    {categoryName}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Similar Events ────────────────────────────────────────────── */}
      <Suspense fallback={<div className="mt-16 h-64 animate-pulse rounded-2xl bg-[#1a1a1a]" />}>
        <SimilarEvents categoryPath={categoryPath} locale={locale} currentId={event.id} />
      </Suspense>
    </div>
  );
}

import { getTranslations } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import type { TnEvent } from '@/types/Catalog';

/** Build a readable location string from the nested event objects. */
function eventLocation(event: TnEvent): string {
  const parts: string[] = [];
  if (event.venue?.text.name) parts.push(event.venue.text.name);
  if (event.city?.text.name) parts.push(event.city.text.name);
  if (event.stateProvince?.text.abbr) parts.push(event.stateProvince.text.abbr);
  else if (event.stateProvince?.text.name) parts.push(event.stateProvince.text.name);
  return parts.join(', ');
}

/** Map a category name to a gradient + emoji for visual appeal. */
function categoryVisual(name?: string): { gradient: string; emoji: string } {
  if (!name) return { gradient: 'from-[#1a1a2e] to-[#16213e]', emoji: '🎟️' };
  const lower = name.toLowerCase();
  if (lower.includes('concert') || lower.includes('music') || lower.includes('rock') || lower.includes('pop') || lower.includes('r&b') || lower.includes('hip hop') || lower.includes('rap') || lower.includes('alternative') || lower.includes('jazz') || lower.includes('blues') || lower.includes('country') || lower.includes('folk') || lower.includes('latin') || lower.includes('classical'))
    return { gradient: 'from-[#2d1b69] to-[#1a0a3e]', emoji: '🎵' };
  if (lower.includes('sport') || lower.includes('basketball') || lower.includes('football') || lower.includes('hockey') || lower.includes('baseball') || lower.includes('soccer') || lower.includes('tennis') || lower.includes('golf') || lower.includes('racing') || lower.includes('wrestling') || lower.includes('boxing') || lower.includes('mma') || lower.includes('nfl') || lower.includes('nba') || lower.includes('mlb') || lower.includes('nhl') || lower.includes('minor'))
    return { gradient: 'from-[#0d3b2e] to-[#1a2e1a]', emoji: '🏟️' };
  if (lower.includes('theatre') || lower.includes('theater') || lower.includes('broadway') || lower.includes('comedy') || lower.includes('musical') || lower.includes('play') || lower.includes('opera') || lower.includes('dance') || lower.includes('ballet'))
    return { gradient: 'from-[#3b1a1a] to-[#2e1a0d]', emoji: '🎭' };
  if (lower.includes('family') || lower.includes('kids') || lower.includes('cirque') || lower.includes('disney') || lower.includes('circus'))
    return { gradient: 'from-[#1a2e3b] to-[#0d1a2e]', emoji: '🎪' };
  if (lower.includes('rodeo') || lower.includes('bull'))
    return { gradient: 'from-[#3b2e1a] to-[#2e1a0d]', emoji: '🤠' };
  if (lower.includes('festival'))
    return { gradient: 'from-[#2d1b69] to-[#691b4d]', emoji: '🎉' };
  return { gradient: 'from-[#1a1a2e] to-[#16213e]', emoji: '🎟️' };
}

export async function EventCard(props: { event: TnEvent; locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'EventCard' });
  const { event } = props;

  const dateStr = event.date.date
    ? new Date(event.date.date).toLocaleDateString(props.locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const timeStr = event.date.text?.time ?? event.date.time ?? '';
  const location = eventLocation(event);
  const categoryName = event.defaultCategory?.text.name;
  const { gradient, emoji } = categoryVisual(categoryName);
  const lowPrice = event.pricingInfo?.lowPrice?.value;
  const ticketCount = event._metadata?.ticketCount ?? 0;
  const hasTickets = event._metadata?.hasTickets ?? false;

  return (
    <Link
      href={`/events/${event.id}`}
      draggable={false}
      className="group block select-none overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] transition-all hover:border-[var(--color-brand-muted)] hover:shadow-lg hover:shadow-[var(--color-brand-subtle)]"
    >
      {/* Visual header with category-themed gradient */}
      <div className={`relative h-44 w-full bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        <span className="text-6xl opacity-30 transition-transform group-hover:scale-110">
          {emoji}
        </span>

        {/* Category badge */}
        {categoryName && (
          <span className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
            {categoryName}
          </span>
        )}

        {/* Schedule status badge */}
        {event.scheduleStatus && event.scheduleStatus !== 'On Schedule' && (
          <span className="absolute right-3 top-3 rounded-full bg-yellow-500/80 px-3 py-1 text-[11px] font-semibold text-black">
            {event.scheduleStatus}
          </span>
        )}

        {/* Ticket count indicator */}
        {hasTickets && ticketCount > 0 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-[var(--color-brand)]/80 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {ticketCount} tickets
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p
          className="mb-1.5 line-clamp-2 text-[15px] font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand)]"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          {event.text.name}
        </p>

        {/* Date & Time */}
        {(dateStr || timeStr) && (
          <div
            className="mb-1 flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-jakarta)' }}
          >
            <svg className="size-3.5 shrink-0 text-[var(--color-brand)]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 0a1 1 0 0 0-1 1v1H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-1V1a1 1 0 1 0-2 0v1H5V1a1 1 0 0 0-1-1zm7 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </svg>
            <span>{dateStr}{timeStr ? ` · ${timeStr}` : ''}</span>
          </div>
        )}

        {/* Location */}
        {location && (
          <div
            className="mb-1 flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-jakarta)' }}
          >
            <svg className="size-3.5 shrink-0 text-[var(--color-text-muted)]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5C2.5 10.65 8 16 8 16s5.5-5.35 5.5-10.5A5.53 5.53 0 0 0 8 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
            </svg>
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        {/* Performers */}
        {event.performers && event.performers.length > 0 && (
          <div
            className="mb-1 flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-jakarta)' }}
          >
            <svg className="size-3.5 shrink-0 text-[var(--color-text-muted)]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-4 8a4 4 0 0 1 8 0H4z" />
            </svg>
            <span className="line-clamp-1">
              {event.performers.map(p => p.name).join(', ')}
            </span>
          </div>
        )}

        {/* Price & CTA */}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--color-surface-border)] pt-3">
          {lowPrice !== undefined ? (
            <span className="text-[14px] font-semibold text-white">
              {t('from_price', { price: lowPrice.toFixed(0) })}
            </span>
          ) : (
            <span className="text-[13px] text-[var(--color-text-muted)]">
              {hasTickets ? 'Tickets available' : 'Check availability'}
            </span>
          )}
          <span className="rounded-full bg-[var(--color-brand)] px-4 py-1.5 text-[12px] font-medium text-white transition-colors group-hover:bg-[#d41e37]">
            {t('buy_now')}
          </span>
        </div>
      </div>
    </Link>
  );
}

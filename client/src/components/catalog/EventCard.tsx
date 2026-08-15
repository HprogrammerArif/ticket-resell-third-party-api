import { getTranslations } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import type { TnEvent } from '@/types/Catalog';

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

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] transition-shadow hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative h-48 w-full bg-gradient-to-br from-[#1a1a1a] to-[#262626]">
        <div className="absolute inset-0 flex items-center justify-center text-4xl text-[var(--color-text-muted)]">
          ♪
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p
          className="mb-1 line-clamp-2 font-semibold text-[var(--color-text-primary)]"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          {event.text.name}
        </p>

        {dateStr && (
          <p
            className="text-[14px] text-white/60"
            style={{ fontFamily: 'var(--font-jakarta)' }}
          >
            {dateStr}
          </p>
        )}

        {event.venue && (
          <p
            className="text-[14px] text-white/60"
            style={{ fontFamily: 'var(--font-jakarta)' }}
          >
            {event.venue.text.name}
            {event.venue.city ? `, ${event.venue.city}` : ''}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          {event.minPrice !== undefined && (
            <span className="text-[14px] font-medium text-[var(--color-text-secondary)]">
              {t('from_price', { price: event.minPrice.toFixed(0) })}
            </span>
          )}
          <span className="ml-auto rounded-full bg-[var(--color-brand)] px-4 py-1.5 text-[13px] font-medium text-white">
            {t('buy_now')}
          </span>
        </div>
      </div>
    </Link>
  );
}

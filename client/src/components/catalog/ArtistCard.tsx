import { getTranslations } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import type { TnPerformer } from '@/types/Catalog';

/** Generate a deterministic HSL color from performer name for visual variety. */
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 40%)`;
}

export async function ArtistCard(props: { performer: TnPerformer; locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'ArtistCard' });
  const { performer } = props;

  const initials = performer.text.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const bgColor = nameToColor(performer.text.name);
  const eventCount = performer._metadata?.eventCount ?? 0;
  const hasEvents = performer._metadata?.hasEvents ?? false;
  const categoryName = performer.defaultCategory?.text.name;

  return (
    <Link
      href={`/artists/${performer.id}`}
      draggable={false}
      className="group flex select-none flex-col items-center gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-5 text-center transition-all hover:border-[var(--color-brand-muted)] hover:shadow-lg hover:shadow-[var(--color-brand-subtle)]"
    >
      {/* Avatar with unique color */}
      <div className="relative size-20 overflow-hidden rounded-full ring-2 ring-transparent transition-all group-hover:ring-[var(--color-brand)]">
        <div
          className="flex size-full items-center justify-center text-[22px] font-bold text-white"
          style={{ backgroundColor: bgColor }}
        >
          {initials}
        </div>
      </div>

      {/* Name */}
      <p
        className="line-clamp-1 text-[15px] font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand)]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {performer.text.name}
      </p>

      {/* Category tag */}
      {categoryName && (
        <span className="rounded-full bg-white/5 px-3 py-0.5 text-[11px] text-[var(--color-text-muted)]">
          {categoryName}
        </span>
      )}

      {/* Event count */}
      {hasEvents && eventCount > 0 ? (
        <p
          className="text-[13px] text-[var(--color-text-secondary)]"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {t('upcoming_events', { count: eventCount })}
        </p>
      ) : (
        <p
          className="text-[12px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {performer._metadata?.ticketCount
            ? `${performer._metadata.ticketCount} tickets`
            : 'View details'}
        </p>
      )}
    </Link>
  );
}

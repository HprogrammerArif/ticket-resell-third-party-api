import { Link } from '@/libs/I18nNavigation';
import type { TnVenue } from '@/types/Catalog';

export function VenueCard(props: { venue: TnVenue }) {
  const { venue } = props;

  return (
    <Link
      href={`/venues/${venue.id}`}
      className="block rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-5 transition-shadow hover:shadow-lg"
    >
      <p
        className="line-clamp-1 font-semibold text-[var(--color-text-primary)]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {venue.text.name}
      </p>
      {(venue.city || venue.stateProvince) && (
        <p
          className="mt-1 text-[14px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {[venue.city, venue.stateProvince].filter(Boolean).join(', ')}
        </p>
      )}
    </Link>
  );
}

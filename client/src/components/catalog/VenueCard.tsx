import { Link } from '@/libs/I18nNavigation';
import type { TnVenue } from '@/types/Catalog';

export function VenueCard(props: { venue: TnVenue }) {
  const { venue } = props;

  const locationParts: string[] = [];
  if (venue.city?.text.name) locationParts.push(venue.city.text.name);
  if (venue.stateProvince?.text.abbr) locationParts.push(venue.stateProvince.text.abbr);
  else if (venue.stateProvince?.text.name) locationParts.push(venue.stateProvince.text.name);
  if (venue.country?.text.name) locationParts.push(venue.country.text.name);
  const location = locationParts.join(', ');

  const eventCount = venue._metadata?.eventCount ?? 0;
  const hasEvents = venue._metadata?.hasEvents ?? false;

  return (
    <Link
      href={`/venues/${venue.id}`}
      className="group block rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-5 transition-all hover:border-[var(--color-brand-muted)] hover:shadow-lg hover:shadow-[var(--color-brand-subtle)]"
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-white/5">
        <svg className="size-5 text-[var(--color-brand)]" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5C2.5 10.65 8 16 8 16s5.5-5.35 5.5-10.5A5.53 5.53 0 0 0 8 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
        </svg>
      </div>
      <p
        className="line-clamp-1 text-[15px] font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand)]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {venue.text.name}
      </p>
      {location && (
        <p
          className="mt-1 text-[13px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {location}
        </p>
      )}
      {venue.capacity && (
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          Capacity: {venue.capacity.toLocaleString()}
        </p>
      )}
      {hasEvents && eventCount > 0 && (
        <p className="mt-2 text-[12px] font-medium text-[var(--color-brand)]">
          {eventCount} upcoming events
        </p>
      )}
    </Link>
  );
}

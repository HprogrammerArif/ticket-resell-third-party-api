import Image from 'next/image';
import { Link } from '@/libs/I18nNavigation';
import type { TnPerformer } from '@/types/Catalog';

export function ArtistCard(props: { performer: TnPerformer; locale: string }) {
  const { performer } = props;

  const initials = performer.text.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <Link
      href={`/artists/${performer.id}`}
      className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-4 text-center transition-shadow hover:shadow-lg"
    >
      {/* Avatar */}
      <div className="relative size-16 overflow-hidden rounded-full">
        {performer.imageUrl ? (
          <Image
            src={performer.imageUrl}
            alt={performer.text.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[var(--color-brand)] text-[18px] font-semibold text-white">
            {initials}
          </div>
        )}
      </div>

      <p
        className="line-clamp-1 font-semibold text-[var(--color-text-primary)]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {performer.text.name}
      </p>

      {performer.upcomingEventCount !== undefined && (
        <p
          className="text-[13px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {performer.upcomingEventCount} upcoming events
        </p>
      )}
    </Link>
  );
}

import { Link } from '@/libs/I18nNavigation';
import type { TnCategory } from '@/types/Catalog';

function categoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('sport') || lower.includes('basketball') || lower.includes('football') || lower.includes('hockey') || lower.includes('baseball') || lower.includes('soccer')) return '🏟️';
  if (lower.includes('concert') || lower.includes('music') || lower.includes('festival')) return '🎵';
  if (lower.includes('theater') || lower.includes('theatre') || lower.includes('broadway') || lower.includes('comedy') || lower.includes('dance')) return '🎭';
  if (lower.includes('family') || lower.includes('kids') || lower.includes('cirque')) return '🎪';
  return '🎟️';
}

export function CategoryCard(props: { category: TnCategory; eventCount?: number }) {
  const { category } = props;
  const icon = categoryIcon(category.text.name);

  return (
    <Link
      href={`/categories/${category.path}`}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-gradient-to-br from-[#1a1a1a] to-[#262626] p-6 text-center transition-shadow hover:shadow-lg"
      style={{ minWidth: '200px', minHeight: '200px' }}
    >
      <span className="text-5xl">{icon}</span>
      <p
        className="font-semibold text-[var(--color-text-primary)]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {category.text.name}
      </p>
      {props.eventCount !== undefined && (
        <p
          className="text-[13px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {props.eventCount} events
        </p>
      )}
    </Link>
  );
}

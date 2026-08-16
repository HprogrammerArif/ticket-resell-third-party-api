import { getTranslations } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import type { TnCategory } from '@/types/Catalog';

type CategoryVisual = { icon: string; gradient: string };

function categoryVisual(name: string): CategoryVisual {
  const lower = name.toLowerCase();
  if (lower.includes('concert') || lower.includes('music')) return { icon: '🎵', gradient: 'from-[#2d1b69] to-[#1a0a3e]' };
  if (lower.includes('rock') || lower.includes('metal')) return { icon: '🎸', gradient: 'from-[#3b1a2e] to-[#1a0d1a]' };
  if (lower.includes('pop') || lower.includes('r&b') || lower.includes('hip hop') || lower.includes('rap')) return { icon: '🎤', gradient: 'from-[#1b3b69] to-[#0a1a3e]' };
  if (lower.includes('country') || lower.includes('folk')) return { icon: '🪕', gradient: 'from-[#3b2e1a] to-[#2e1a0d]' };
  if (lower.includes('jazz') || lower.includes('blues')) return { icon: '🎷', gradient: 'from-[#1a2e3b] to-[#0d1a2e]' };
  if (lower.includes('classical') || lower.includes('orchestra')) return { icon: '🎻', gradient: 'from-[#2e1a3b] to-[#1a0d2e]' };
  if (lower.includes('latin') || lower.includes('reggae') || lower.includes('world')) return { icon: '🪘', gradient: 'from-[#693b1b] to-[#3e1a0a]' };
  if (lower.includes('electronic') || lower.includes('edm') || lower.includes('dj')) return { icon: '🎧', gradient: 'from-[#0d3b3b] to-[#0a1a2e]' };
  if (lower.includes('alternative') || lower.includes('indie')) return { icon: '🎶', gradient: 'from-[#3b1b69] to-[#1a0a3e]' };
  if (lower.includes('nfl') || lower.includes('football')) return { icon: '🏈', gradient: 'from-[#0d3b2e] to-[#1a2e1a]' };
  if (lower.includes('nba') || lower.includes('basketball')) return { icon: '🏀', gradient: 'from-[#3b2e0d] to-[#2e1a0d]' };
  if (lower.includes('mlb') || lower.includes('baseball')) return { icon: '⚾', gradient: 'from-[#1a2e0d] to-[#0d1a0a]' };
  if (lower.includes('nhl') || lower.includes('hockey')) return { icon: '🏒', gradient: 'from-[#0d1a3b] to-[#0a0d2e]' };
  if (lower.includes('soccer') || lower.includes('mls') || lower.includes('premier')) return { icon: '⚽', gradient: 'from-[#0d3b1a] to-[#0a2e0d]' };
  if (lower.includes('tennis')) return { icon: '🎾', gradient: 'from-[#3b3b0d] to-[#2e2e0a]' };
  if (lower.includes('golf')) return { icon: '⛳', gradient: 'from-[#0d3b0d] to-[#0a2e0a]' };
  if (lower.includes('racing') || lower.includes('nascar') || lower.includes('motor') || lower.includes('indycar')) return { icon: '🏎️', gradient: 'from-[#3b0d0d] to-[#2e0a0a]' };
  if (lower.includes('wrestling') || lower.includes('wwe')) return { icon: '🤼', gradient: 'from-[#3b1a0d] to-[#2e0d0a]' };
  if (lower.includes('boxing') || lower.includes('mma') || lower.includes('ufc')) return { icon: '🥊', gradient: 'from-[#3b0d1a] to-[#2e0a0d]' };
  if (lower.includes('sport')) return { icon: '🏟️', gradient: 'from-[#0d3b2e] to-[#1a2e1a]' };
  if (lower.includes('minor')) return { icon: '🧢', gradient: 'from-[#1a3b2e] to-[#0d2e1a]' };
  if (lower.includes('theatre') || lower.includes('theater') || lower.includes('broadway')) return { icon: '🎭', gradient: 'from-[#3b1a1a] to-[#2e1a0d]' };
  if (lower.includes('comedy') || lower.includes('stand up')) return { icon: '😂', gradient: 'from-[#3b3b1a] to-[#2e2e0d]' };
  if (lower.includes('musical') || lower.includes('play')) return { icon: '🎬', gradient: 'from-[#2e1a3b] to-[#1a0d2e]' };
  if (lower.includes('opera')) return { icon: '🎼', gradient: 'from-[#3b1a2e] to-[#2e0d1a]' };
  if (lower.includes('dance') || lower.includes('ballet')) return { icon: '💃', gradient: 'from-[#2e0d3b] to-[#1a0a2e]' };
  if (lower.includes('family') || lower.includes('kids')) return { icon: '🎪', gradient: 'from-[#1a2e3b] to-[#0d1a2e]' };
  if (lower.includes('circus') || lower.includes('cirque')) return { icon: '🤹', gradient: 'from-[#3b2e1a] to-[#2e1a0d]' };
  if (lower.includes('disney') || lower.includes('ice show')) return { icon: '❄️', gradient: 'from-[#1a3b3b] to-[#0d2e2e]' };
  if (lower.includes('rodeo') || lower.includes('bull')) return { icon: '🤠', gradient: 'from-[#3b2e1a] to-[#2e1a0d]' };
  if (lower.includes('festival')) return { icon: '🎉', gradient: 'from-[#2d1b69] to-[#691b4d]' };
  return { icon: '🎟️', gradient: 'from-[#1a1a2e] to-[#16213e]' };
}

export async function CategoryCard(props: { category: TnCategory; locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'CategoryCard' });
  const { category } = props;
  const { icon, gradient } = categoryVisual(category.text.name);
  const eventCount = category._metadata?.eventCount;
  const hasEvents = category._metadata?.hasEvents ?? false;

  return (
    <Link
      href={`/categories/${category.path}`}
      className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-gradient-to-br ${gradient} p-6 text-center transition-all hover:border-[var(--color-brand-muted)] hover:shadow-lg hover:shadow-[var(--color-brand-subtle)]`}
      style={{ minWidth: '200px', minHeight: '200px' }}
    >
      <span className="text-5xl transition-transform group-hover:scale-110">{icon}</span>
      <p
        className="font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {category.text.name}
      </p>
      {hasEvents && eventCount !== undefined && eventCount > 0 && (
        <p
          className="text-[13px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {t('event_count', { count: eventCount })}
        </p>
      )}
      {category._metadata?.ticketCount !== undefined && category._metadata.ticketCount > 0 && (
        <p
          className="text-[11px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {category._metadata.ticketCount.toLocaleString()} tickets
        </p>
      )}
    </Link>
  );
}

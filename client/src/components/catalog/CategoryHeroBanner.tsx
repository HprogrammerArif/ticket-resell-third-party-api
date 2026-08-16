import type { TnCategory } from '@/types/Catalog';

type CategoryVisual = { icon: string; gradient: string; accentColor: string };

export function categoryVisual(name: string): CategoryVisual {
  const lower = name.toLowerCase();
  if (lower.includes('concert') || lower.includes('music'))
    return { icon: '🎵', gradient: 'from-[#2d1b69] via-[#3b1f7a] to-[#1a0a3e]', accentColor: '#7c3aed' };
  if (lower.includes('rock') || lower.includes('metal'))
    return { icon: '🎸', gradient: 'from-[#3b1a2e] via-[#4a1f3a] to-[#1a0d1a]', accentColor: '#9f1239' };
  if (lower.includes('pop') || lower.includes('r&b') || lower.includes('hip hop') || lower.includes('rap'))
    return { icon: '🎤', gradient: 'from-[#1b3b69] via-[#1e4a82] to-[#0a1a3e]', accentColor: '#3b82f6' };
  if (lower.includes('country') || lower.includes('folk'))
    return { icon: '🪕', gradient: 'from-[#3b2e1a] via-[#4a3820] to-[#2e1a0d]', accentColor: '#d97706' };
  if (lower.includes('jazz') || lower.includes('blues'))
    return { icon: '🎷', gradient: 'from-[#1a2e3b] via-[#1e384a] to-[#0d1a2e]', accentColor: '#0891b2' };
  if (lower.includes('classical') || lower.includes('orchestra'))
    return { icon: '🎻', gradient: 'from-[#2e1a3b] via-[#38204a] to-[#1a0d2e]', accentColor: '#a855f7' };
  if (lower.includes('latin') || lower.includes('reggae'))
    return { icon: '🪘', gradient: 'from-[#693b1b] via-[#7a4520] to-[#3e1a0a]', accentColor: '#f59e0b' };
  if (lower.includes('electronic') || lower.includes('edm') || lower.includes('dj'))
    return { icon: '🎧', gradient: 'from-[#0d3b3b] via-[#104a4a] to-[#0a1a2e]', accentColor: '#06b6d4' };
  if (lower.includes('alternative') || lower.includes('indie'))
    return { icon: '🎶', gradient: 'from-[#3b1b69] via-[#4a2080] to-[#1a0a3e]', accentColor: '#8b5cf6' };
  if (lower.includes('nfl') || lower.includes('football'))
    return { icon: '🏈', gradient: 'from-[#0d3b2e] via-[#0f4a38] to-[#1a2e1a]', accentColor: '#10b981' };
  if (lower.includes('nba') || lower.includes('basketball'))
    return { icon: '🏀', gradient: 'from-[#3b2e0d] via-[#4a3810] to-[#2e1a0d]', accentColor: '#f97316' };
  if (lower.includes('mlb') || lower.includes('baseball'))
    return { icon: '⚾', gradient: 'from-[#1a2e0d] via-[#1f3810] to-[#0d1a0a]', accentColor: '#22c55e' };
  if (lower.includes('nhl') || lower.includes('hockey'))
    return { icon: '🏒', gradient: 'from-[#0d1a3b] via-[#0f204a] to-[#0a0d2e]', accentColor: '#60a5fa' };
  if (lower.includes('soccer') || lower.includes('mls'))
    return { icon: '⚽', gradient: 'from-[#0d3b1a] via-[#0f4a20] to-[#0a2e0d]', accentColor: '#4ade80' };
  if (lower.includes('tennis'))
    return { icon: '🎾', gradient: 'from-[#3b3b0d] via-[#4a4a10] to-[#2e2e0a]', accentColor: '#facc15' };
  if (lower.includes('golf'))
    return { icon: '⛳', gradient: 'from-[#0d3b0d] via-[#104a10] to-[#0a2e0a]', accentColor: '#86efac' };
  if (lower.includes('racing') || lower.includes('nascar') || lower.includes('motor'))
    return { icon: '🏎️', gradient: 'from-[#3b0d0d] via-[#4a1010] to-[#2e0a0a]', accentColor: '#f87171' };
  if (lower.includes('wrestling') || lower.includes('wwe'))
    return { icon: '🤼', gradient: 'from-[#3b1a0d] via-[#4a2010] to-[#2e0d0a]', accentColor: '#fb923c' };
  if (lower.includes('boxing') || lower.includes('mma') || lower.includes('ufc'))
    return { icon: '🥊', gradient: 'from-[#3b0d1a] via-[#4a1020] to-[#2e0a0d]', accentColor: '#f43f5e' };
  if (lower.includes('sport'))
    return { icon: '🏟️', gradient: 'from-[#0d3b2e] via-[#0f4838] to-[#1a2e1a]', accentColor: '#34d399' };
  if (lower.includes('theatre') || lower.includes('theater') || lower.includes('broadway'))
    return { icon: '🎭', gradient: 'from-[#3b1a1a] via-[#4a2020] to-[#2e1a0d]', accentColor: '#fb7185' };
  if (lower.includes('comedy') || lower.includes('stand up'))
    return { icon: '😂', gradient: 'from-[#3b3b1a] via-[#4a4a20] to-[#2e2e0d]', accentColor: '#fbbf24' };
  if (lower.includes('musical') || lower.includes('play'))
    return { icon: '🎬', gradient: 'from-[#2e1a3b] via-[#38204a] to-[#1a0d2e]', accentColor: '#c084fc' };
  if (lower.includes('opera'))
    return { icon: '🎼', gradient: 'from-[#3b1a2e] via-[#4a2038] to-[#2e0d1a]', accentColor: '#f472b6' };
  if (lower.includes('dance') || lower.includes('ballet'))
    return { icon: '💃', gradient: 'from-[#2e0d3b] via-[#38104a] to-[#1a0a2e]', accentColor: '#a78bfa' };
  if (lower.includes('family') || lower.includes('kids'))
    return { icon: '🎪', gradient: 'from-[#1a2e3b] via-[#1e3848] to-[#0d1a2e]', accentColor: '#38bdf8' };
  if (lower.includes('festival'))
    return { icon: '🎉', gradient: 'from-[#2d1b69] via-[#691b4d] to-[#3b0d3b]', accentColor: '#e879f9' };
  return { icon: '🎟️', gradient: 'from-[#1a1a2e] via-[#1e1e38] to-[#16213e]', accentColor: '#ea2a43' };
}

export function CategoryHeroBanner(props: {
  category: TnCategory;
  eventCount?: number;
  ticketCount?: number;
}) {
  const { category } = props;
  const { icon, gradient, accentColor } = categoryVisual(category.text.name);
  const eventCount = props.eventCount ?? category._metadata?.eventCount;
  const ticketCount = props.ticketCount ?? category._metadata?.ticketCount;

  return (
    <div
      className={`relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br ${gradient}`}
      style={{ minHeight: '200px' }}
    >
      {/* Decorative large icon */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 text-[180px] opacity-10 select-none"
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Accent glow */}
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: accentColor }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end p-8 max-sm:p-5" style={{ minHeight: '200px' }}>
        {/* Breadcrumb */}
        {category.parentCategory && (
          <p className="mb-2 text-[12px] font-medium uppercase tracking-widest text-white/50">
            {category.parentCategory.text.name} /
          </p>
        )}

        {/* Icon + Title */}
        <div className="mb-4 flex items-center gap-4">
          <span className="text-5xl max-sm:text-4xl">{icon}</span>
          <h1
            className="text-[36px] font-bold text-white max-md:text-[28px] max-sm:text-[22px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {category.text.name}
          </h1>
        </div>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-3">
          {eventCount !== undefined && eventCount > 0 && (
            <span
              className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white"
              style={{ background: `${accentColor}30`, border: `1px solid ${accentColor}50` }}
            >
              🗓 {eventCount.toLocaleString()} Events
            </span>
          )}
          {ticketCount !== undefined && ticketCount > 0 && (
            <span
              className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              🎟 {ticketCount.toLocaleString()} Tickets
            </span>
          )}
          {category.salesRank && (
            <span
              className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white/70"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Rank #{category.salesRank}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

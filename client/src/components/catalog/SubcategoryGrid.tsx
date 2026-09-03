import { getTranslations } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import type { TnCategory } from '@/types/Catalog';

/**
 * A gradient and icon per category, so a grid of a dozen sports reads as
 * twelve distinct things rather than twelve identical tiles.
 *
 * Stage and sport are tested before music: TicketNetwork files a Broadway show
 * as "MUSICAL / PLAY", which contains the substring "music". That ordering trap
 * has now caught this project twice.
 * @param name - The category name.
 * @returns The icon and gradient for its card.
 */
function categoryVisual(name: string): { icon: string; gradient: string } {
  const lower = name.toLowerCase();

  if (/baseball|mlb/u.test(lower)) {
    return { icon: '⚾', gradient: 'from-[#1a3a1a] to-[#0d1f0d]' };
  }
  if (/basketball|nba|wnba/u.test(lower)) {
    return { icon: '🏀', gradient: 'from-[#3a2410] to-[#1f1408]' };
  }
  if (/football|nfl|cfl|ufl|afl/u.test(lower)) {
    return { icon: '🏈', gradient: 'from-[#2e1a0d] to-[#1a0f08]' };
  }
  if (/hockey|nhl/u.test(lower)) {
    return { icon: '🏒', gradient: 'from-[#0d2a3b] to-[#08172e]' };
  }
  if (/soccer|mls/u.test(lower)) {
    return { icon: '⚽', gradient: 'from-[#0d3b2e] to-[#08201a]' };
  }
  if (/box|mma|mixed martial|wrestl|ufc/u.test(lower)) {
    return { icon: '🥊', gradient: 'from-[#3b1020] to-[#1f0810]' };
  }
  if (/golf/u.test(lower)) {
    return { icon: '⛳', gradient: 'from-[#14331e] to-[#0a1c10]' };
  }
  if (/tennis/u.test(lower)) {
    return { icon: '🎾', gradient: 'from-[#25381a] to-[#141f0d]' };
  }
  if (/rodeo|bull/u.test(lower)) {
    return { icon: '🤠', gradient: 'from-[#3b2e1a] to-[#1f180d]' };
  }
  if (/cricket|rugby/u.test(lower)) {
    return { icon: '🏉', gradient: 'from-[#1a2e3b] to-[#0d1820]' };
  }
  if (/olympic|gymnastic/u.test(lower)) {
    return { icon: '🏅', gradient: 'from-[#332a10] to-[#1c1708]' };
  }

  if (/broadway|musical|play|opera|ballet|dance|theat/u.test(lower)) {
    return { icon: '🎭', gradient: 'from-[#3b1a1a] to-[#200d0d]' };
  }
  if (/comedy/u.test(lower)) {
    return { icon: '🎙️', gradient: 'from-[#2e1a3b] to-[#180d20]' };
  }
  if (/children|family|circus|cirque/u.test(lower)) {
    return { icon: '🎪', gradient: 'from-[#1a2e3b] to-[#0d1820]' };
  }
  if (/vegas/u.test(lower)) {
    return { icon: '🎰', gradient: 'from-[#3b1a2e] to-[#200d18]' };
  }
  if (/festival|tour/u.test(lower)) {
    return { icon: '🎉', gradient: 'from-[#2d1b69] to-[#180d38]' };
  }
  if (/classical|jazz|blues|new age|bluegrass/u.test(lower)) {
    return { icon: '🎷', gradient: 'from-[#1a2447] to-[#0d1226]' };
  }
  if (/rock|metal|pop|alternative|country|folk|rap|hip hop|r&b|soul|latin|reggae|techno|electronic|era/u.test(lower)) {
    return { icon: '🎵', gradient: 'from-[#2d1b69] to-[#1a0a3e]' };
  }

  return { icon: '🎟️', gradient: 'from-[#1a1a2e] to-[#16213e]' };
}

/**
 * The categories beneath the current one, as a grid of cards.
 *
 * Replaces the chip row on section pages. Selecting Sports should present the
 * sports themselves — the chips were legible for three or four entries and
 * unreadable for twelve.
 *
 * Counts are what make the grid useful: they are how a visitor tells a sport
 * with fifty events from one with a single fixture.
 * @param props - The categories to show, and the locale for the headings.
 * @returns The grid, or null when there is nothing beneath this category.
 */
export async function SubcategoryGrid(props: {
  categories: TnCategory[];
  locale: string;
  heading?: string;
}) {
  if (props.categories.length === 0) {
    return null;
  }

  const t = await getTranslations({ locale: props.locale, namespace: 'CategoriesPage' });

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        {props.heading ?? t('browse_subcategories')}
      </h2>

      <div className="grid grid-cols-6 gap-4 max-xl:grid-cols-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
        {props.categories.map((category) => {
          const { icon, gradient } = categoryVisual(category.text.name);
          const eventCount = category._metadata?.eventCount ?? 0;
          const ticketCount = category._metadata?.ticketCount ?? 0;

          return (
            <Link
              key={category.path}
              href={`/categories/${category.path}`}
              className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--color-surface-border)] bg-gradient-to-br ${gradient} p-5 text-center transition-all hover:-translate-y-1 hover:border-[var(--color-brand-muted)] hover:shadow-lg hover:shadow-[var(--color-brand-subtle)]`}
            >
              <span className="text-3xl transition-transform group-hover:scale-110">{icon}</span>

              <p
                className="line-clamp-2 text-[14px] font-semibold text-white"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {category.text.name}
              </p>

              <p className="text-[12px] text-[var(--color-text-secondary)]">
                {t('event_count', { count: eventCount })}
              </p>

              {ticketCount > 0 && (
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {t('ticket_count', { count: ticketCount })}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

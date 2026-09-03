import { unstable_cache } from 'next/cache';
import { getCategoriesWithEvents, resolveSection, visibleChildren } from '@/libs/CatalogSections';

export type NavMenuItem = {
  label: string;
  href: string;
  eventCount: number;
};

/** Keyed by navigation slug. A slug with no entry has no dropdown. */
export type NavMenu = Record<string, NavMenuItem[]>;

/** The navigation slugs that can open a dropdown. */
const MENU_SLUGS = ['sports', 'concerts', 'theater'] as const;

/**
 * How many entries a dropdown shows.
 *
 * Concerts has twenty-two genres. Past about a dozen a menu stops being a
 * shortcut and becomes a page in its own right, so the rest are reached
 * through the section's own landing page — which exists, and shows them all
 * with counts and artwork.
 */
const MAX_ITEMS = 12;

/**
 * The dropdown contents for each navigation section.
 *
 * Comedy is deliberately absent: it is a category under CONCERTS rather than a
 * section, so it has no children to list and its navigation item goes straight
 * to its events.
 *
 * Never throws. A catalogue that cannot be reached yields empty menus and the
 * navigation behaves as it did before dropdowns existed — every item is still
 * a working link to its section.
 *
 * Cached for six hours. The category tree is TicketNetwork's and changes when
 * they add a sport, not when an event is listed, so this is nothing like the
 * five minutes a banner gets.
 * @returns The menu items per slug.
 */
export const getNavMenu = unstable_cache(
  async (): Promise<NavMenu> => {
    const menu: NavMenu = {};

    try {
      const categories = await getCategoriesWithEvents();

      for (const slug of MENU_SLUGS) {
        const section = await resolveSection(slug);
        if (!section) {
          continue;
        }

        menu[slug] = visibleChildren(categories, section.path)
          .slice(0, MAX_ITEMS)
          .map((category) => ({
            label: category.text.name,
            href: `/categories/${category.path}`,
            eventCount: category._metadata?.eventCount ?? 0,
          }));
      }
    } catch {
      return {};
    }

    return menu;
  },
  ['nav-menu'],
  { revalidate: 6 * 60 * 60, tags: ['nav-menu'] },
);

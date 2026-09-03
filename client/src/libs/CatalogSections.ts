import { getCategories, getCategoryByPath } from '@/libs/CachedCatalogApi';
import type { TnCategory } from '@/types/Catalog';

/**
 * The sections reachable from the top navigation, and where they are expected
 * to live in TicketNetwork's tree.
 *
 * The path is a fast path, not a fact. It is verified against the category's
 * name before being used — see `resolveSection`.
 *
 * Comedy is deliberately absent. It is a child of CONCERTS rather than a
 * section beside it, so the navigation item added on 2026-09-02 resolves as an
 * ordinary category and shows its events.
 */
const SECTIONS: Record<string, { name: string; knownPath: string }> = {
  sports: { name: 'SPORTS', knownPath: '.1859.1988.' },
  concerts: { name: 'CONCERTS', knownPath: '.1859.1986.' },
  theater: { name: 'THEATRE', knownPath: '.1859.1989.' },
  theatre: { name: 'THEATRE', knownPath: '.1859.1989.' },
};

export const SECTION_SLUGS = Object.keys(SECTIONS);

/** Categories held per page when scanning for a section by name. */
const SCAN_PAGE_SIZE = 100;

/** How many pages to scan before giving up. The tree has 375,581 categories. */
const SCAN_PAGES = 4;

/**
 * Resolves a navigation slug to its section category.
 *
 * The known path is tried first and **its name is checked**. Hardcoding the
 * identifier alone would be unsafe: the Catalog WCID already differs between
 * Sandbox and Production on this integration, discovered late and at cost. If
 * category identifiers differ the same way, an unverified lookup returns a
 * real category that is simply the wrong one — a page that looks correct and
 * lists the wrong things, which is far harder to notice than an error.
 *
 * When the check fails, categories are scanned for one carrying the expected
 * name. That is slower, and only runs where the assumption has already broken.
 *
 * Never throws. A slug that is not a section, or a catalogue that cannot be
 * reached, returns null and the caller falls back to its ordinary path.
 * @param slug - The URL segment, e.g. "sports".
 * @returns The section category, or null.
 */
export async function resolveSection(slug: string): Promise<TnCategory | null> {
  const section = SECTIONS[slug.toLowerCase()];
  if (!section) {
    return null;
  }

  try {
    const candidate = await getCategoryByPath(section.knownPath);
    if (candidate?.text?.name?.toUpperCase() === section.name) {
      return candidate;
    }
  } catch {
    // Fall through to the scan.
  }

  try {
    for (let page = 1; page <= SCAN_PAGES; page += 1) {
      const result = await getCategories({ pageNumber: page, pageSize: SCAN_PAGE_SIZE });
      const match = result.results.find(
        (c) => c.text?.name?.toUpperCase() === section.name && c.depth === 1,
      );
      if (match) {
        return match;
      }
      if (result.results.length < SCAN_PAGE_SIZE) {
        break;
      }
    }
  } catch {
    // Fall through to null.
  }

  return null;
}

/**
 * Every category that has events, across all pages.
 *
 * A single page of 100 is not enough and the shortfall is invisible: the
 * catalogue holds 232 categories with events, and fetching only the first page
 * returned Sports and Concerts correctly while Theatre came back with no
 * children at all, because its rows sit beyond the first hundred.
 *
 * Never throws — a category page without its grid is still a usable page of
 * events.
 * @returns The categories, or an empty list when the catalogue is unreachable.
 */
export async function getCategoriesWithEvents(): Promise<TnCategory[]> {
  const all: TnCategory[] = [];

  try {
    for (let page = 1; page <= SCAN_PAGES; page += 1) {
      const result = await getCategories({
        pageNumber: page,
        pageSize: SCAN_PAGE_SIZE,
        hasEvents: true,
      });
      all.push(...result.results);
      if (result.results.length < SCAN_PAGE_SIZE) {
        break;
      }
    }
  } catch {
    return all;
  }

  return all;
}

/**
 * Counts the dot-separated segments in a category path.
 * @param path - A TicketNetwork category path such as `.1859.1988.`.
 * @returns The number of segments.
 */
function depthOf(path: string): number {
  return path.split('.').filter(Boolean).length;
}

/**
 * The categories to show beneath a parent.
 *
 * Immediate children only. Grandchildren are excluded because a section would
 * otherwise list everything below it — Sports would show 63 entries mixing the
 * twelve sports with all fifty-one leagues under them.
 *
 * Two exclusions matter as much as the depth rule:
 *
 * - **No events, not shown.** The catalogue holds 375,581 categories and 232
 *   have events. An empty category is a dead end that reads as a fault.
 * - **No name, not shown.** A parallel tree at `.718.72x` mirrors the real one
 *   exactly, with every name blank or a single dash. Without this the grid
 *   fills with cards labelled "-".
 *
 * Ordered by event count so the busiest sport leads, which is how a visitor
 * tells RODEO with fifty events from RUGBY with one.
 * @param all - Categories fetched from the catalogue.
 * @param parentPath - The path whose children are wanted.
 * @returns The children to display, busiest first.
 */
export function visibleChildren(all: TnCategory[], parentPath: string): TnCategory[] {
  const wantedDepth = depthOf(parentPath) + 1;

  return all
    .filter((c) => {
      if (!c.path || c.path === parentPath) {
        return false;
      }
      if (!c.path.startsWith(parentPath)) {
        return false;
      }
      if (depthOf(c.path) !== wantedDepth) {
        return false;
      }

      const name = c.text?.name?.trim();
      if (!name || name === '-') {
        return false;
      }

      return (c._metadata?.eventCount ?? 0) > 0;
    })
    .toSorted((a, b) => (b._metadata?.eventCount ?? 0) - (a._metadata?.eventCount ?? 0));
}

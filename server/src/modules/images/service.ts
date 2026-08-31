import { cacheGet, buildCacheKey } from '../../libs/cache';
import { logger } from '../../libs/logger';

/**
 * Required by Wikimedia. Their User-Agent policy states that requests without a
 * descriptive agent carrying contact details "may be blocked without notice".
 */
const USER_AGENT = 'TicketLove/1.0 (https://ticketlove.net; work.mohammedarif@gmail.com)';

const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';

const TIMEOUT_MS = 3000;

/**
 * One day, for both hits and misses.
 *
 * A split TTL was considered — longer for hits, since a photograph is far more
 * stable than a ticket price. But cacheGet fixes the TTL when the entry is
 * written, before the outcome is known, so varying it would mean a second cache
 * entry that nothing reads. One day is the right compromise: a miss is retried
 * daily rather than on every request, and a hit costs two cheap lookups a day.
 * The client wraps this in unstable_cache at seven days anyway.
 */
const TTL = 24 * 60 * 60;

export type PerformerImage = {
  url: string;
  width: number;
  height: number;
  sourcePage: string;
  title: string;
};

type WikiSummary = {
  type?: string;
  title?: string;
  originalimage?: { source?: string; width?: number; height?: number };
  thumbnail?: { source?: string; width?: number; height?: number };
  content_urls?: { desktop?: { page?: string } };
};

/**
 * Derives a disambiguation hint from TicketNetwork's category.
 *
 * Wikipedia titles collide constantly — "AFI" is a film institute before it is a
 * band, "42nd Street" a street before a musical. The hint steers search toward
 * the right article and is what lifts coverage from 7/10 to 9/10.
 * @param category - TicketNetwork category name, if known.
 * @returns A single word appended to the search query.
 */
export function categoryHint(category?: string): string {
  const lower = (category ?? '').toLowerCase();
  if (lower.includes('concert') || lower.includes('music')) return 'band';
  if (lower.includes('theat')) return 'musical';
  if (lower.includes('sport')) return 'team';
  return 'performer';
}

async function wikiFetch(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logger.debug({ err, url }, 'Wikimedia lookup failed');
    return null;
  }
}

function toImage(summary: WikiSummary): PerformerImage | null {
  if (summary.type !== 'standard') return null;

  // Thumbnail first, deliberately. originalimage is the full uploaded file —
  // measured at 3648x1996 and 5 MB for one performer, against 330x181 and 19 KB
  // for the thumbnail. These render at 80px and 120px in the avatars, so the
  // original is 260x the bytes for no visible gain. The event hero sits behind a
  // gradient at 25% opacity, where 330px is also sufficient.
  const img = summary.thumbnail ?? summary.originalimage;
  if (!img?.source) return null;

  return {
    url: img.source,
    width: img.width ?? 0,
    height: img.height ?? 0,
    sourcePage: summary.content_urls?.desktop?.page ?? '',
    title: summary.title ?? '',
  };
}

async function summaryFor(title: string): Promise<WikiSummary | null> {
  const data = await wikiFetch(`${WIKI_REST}/${encodeURIComponent(title)}`);
  return (data as WikiSummary) ?? null;
}

async function searchTitle(name: string, hint: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `${name} ${hint}`,
    srlimit: '1',
    format: 'json',
    origin: '*',
  });
  const data = await wikiFetch(`${WIKI_API}?${params.toString()}`);
  const results = (data as { query?: { search?: { title?: string }[] } })?.query?.search;
  return results?.[0]?.title ?? null;
}

async function resolve(name: string, category?: string): Promise<PerformerImage | null> {
  // Stage 1 — the exact name. A disambiguation page counts as a miss, not a hit.
  const direct = await summaryFor(name);
  if (direct) {
    const image = toImage(direct);
    if (image) return image;
  }

  // Stage 2 — search with a category hint, then read that article's summary.
  const title = await searchTitle(name, categoryHint(category));
  if (!title) return null;

  const viaSearch = await summaryFor(title);
  if (!viaSearch) return null;

  return toImage(viaSearch);
}

/**
 * Resolves a performer name to a Wikimedia image.
 *
 * Never throws. Every failure — no article, disambiguation, no image, network
 * error, timeout — returns null so the caller can fall back to a placeholder.
 * @param name - Performer name as it appears in the TicketNetwork catalog.
 * @param category - TicketNetwork category, used to disambiguate the search.
 * @returns The image, or null when none can be resolved.
 */
export async function getPerformerImage(
  name: string,
  category?: string,
): Promise<PerformerImage | null> {
  const key = buildCacheKey('performer-image', { name, hint: categoryHint(category) });

  // The result is wrapped rather than stored bare: node-cache reports a missing
  // key as undefined, so a cached null would be indistinguishable from a cache
  // miss and every absent photograph would be re-resolved on every request.
  const cached = await cacheGet<{ image: PerformerImage | null }>(
    key,
    TTL,
    async () => ({ image: await resolve(name, category) }),
  );

  return cached.image;
}

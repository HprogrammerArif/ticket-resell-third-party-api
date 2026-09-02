import { cacheGet, buildCacheKey } from '../../libs/cache';
import { db } from '../../libs/db';
import { getTicketmasterImage } from './ticketmaster';
import { namesMatch } from './names';
import type { PerformerImage } from './types';
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

export type { PerformerImage } from './types';

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
 * Wikipedia titles collide constantly — "AFI" is a film institute before it is
 * a band, "42nd Street" a street before a musical. The hint steers the search
 * toward the right article, and it only comes into play when the direct title
 * lookup has already failed, which is exactly the ambiguous case.
 *
 * The patterns below are TicketNetwork's own category names, collected from
 * 400 live performers: POP / ROCK, ALTERNATIVE, COUNTRY / FOLK, RAP / HIP HOP,
 * R&B / SOUL, HARD ROCK / METAL, JAZZ / BLUES, MUSICAL / PLAY, BROADWAY,
 * OFF-BROADWAY, WEST END, OPERA, NFL, Professional (NBA), College (Div I-A and
 * Div I-AA), COMEDY, and so on. An earlier version tested for "concert" and
 * "music", which matches almost none of them — so nearly every performer was
 * searched with the generic hint and the hint did no work at all.
 *
 * Stage categories are tested first on purpose: "MUSICAL / PLAY" contains the
 * substring "music", so testing music first files a Broadway show as a band.
 * @param category - TicketNetwork category name, if known.
 * @returns A single word appended to the search query.
 */
export function categoryHint(category?: string): string {
  const lower = (category ?? '').toLowerCase();
  if (!lower) return 'performer';

  if (/musical|play|broadway|west end|opera|cirque|vegas show|theat|ballet|dance/.test(lower)) {
    return 'musical';
  }
  if (/nfl|nba|mlb|nhl|mls|college|professional|sport|football|basketball|baseball|hockey|soccer|racing|rodeo/.test(lower)) {
    return 'team';
  }
  if (/comedy|comedian/.test(lower)) {
    return 'comedian';
  }
  if (/classical|religious|gospel|new age/.test(lower)) {
    return 'musician';
  }
  if (/rock|pop|alternative|country|folk|rap|hip hop|r&b|soul|metal|jazz|blues|latin|reggae|electronic|techno|concert|music|band/.test(lower)) {
    return 'band';
  }
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

/**
 * Whether a file is safe for a commercial site to display.
 *
 * Wikipedia serves images from two roots and only one carries a free licence.
 * /wikipedia/commons/ is Wikimedia Commons, where every file is freely
 * licensed. /wikipedia/en/ is English Wikipedia's local upload area, which is
 * precisely where non-free files live: material kept under a fair-use
 * rationale written for Wikipedia's own encyclopedic use, which does not
 * extend to a ticket resale business. A sample of live performers turned up
 * one such file, named Fairuse_Gruffalo.jpg.
 *
 * Roughly one performer in twenty-five resolves to a local upload. Rejecting
 * it here lets the caller fall through to the search stage, and failing that
 * to the category gradient — a plain visual is worth more than a licence we
 * do not hold.
 * @param url - The image file URL from a Wikipedia summary.
 * @returns True when the file is hosted on Wikimedia Commons.
 */
function isFreelyLicensed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'upload.wikimedia.org'
      && parsed.pathname.startsWith('/wikipedia/commons/')
    );
  } catch {
    return false;
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
  if (!isFreelyLicensed(img.source)) return null;

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

async function resolveFromWikimedia(name: string, category?: string): Promise<PerformerImage | null> {
  // Stage 1 — the exact name. A disambiguation page counts as a miss, not a
  // hit, and so does an article whose only image is non-free or whose subject
  // is not the act we asked for: in each case stage 2 gets a chance to find
  // something usable.
  const direct = await summaryFor(name);
  if (direct && namesMatch(name, direct.title ?? '')) {
    const image = toImage(direct);
    if (image) return image;
  }

  // Stage 2 — search with a category hint, then read that article's summary.
  const title = await searchTitle(name, categoryHint(category));
  if (!title) return null;

  const viaSearch = await summaryFor(title);
  if (!viaSearch || !namesMatch(name, viaSearch.title ?? '')) return null;

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
/** How long a stored photograph is trusted. Pictures are not prices. */
const DB_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Reads a previously resolved photograph from Postgres.
 *
 * Never throws: a database that is down or a table that has not been migrated
 * yet must degrade to a live lookup, not take the page with it.
 * @param name - The performer name, as queried.
 * @returns The stored image, or null when absent, stale, or unreadable.
 */
async function readStored(name: string): Promise<PerformerImage | null> {
  try {
    const row = await db.performerImageCache.findUnique({ where: { name } });
    if (!row) return null;

    if (Date.now() - row.cachedAt.getTime() > DB_TTL_MS) {
      return null;
    }

    return {
      url: row.url,
      width: row.width,
      height: row.height,
      sourcePage: row.sourcePage,
      title: row.title,
    };
  } catch (err) {
    logger.debug({ err, name }, 'Stored image lookup failed');
    return null;
  }
}

/**
 * Stores a resolved photograph so it survives a container restart.
 *
 * Hits only. A miss stays in the in-memory cache on its 24-hour TTL, so a
 * performer who acquires a photograph next week is retried rather than being
 * written off for a month.
 * @param name - The performer name, as queried.
 * @param source - Which resolver produced it.
 * @param image - The resolved image.
 */
async function writeStored(name: string, source: string, image: PerformerImage): Promise<void> {
  try {
    const data = { source, ...image, cachedAt: new Date() };
    await db.performerImageCache.upsert({
      where: { name },
      create: { name, ...data },
      update: data,
    });
  } catch (err) {
    logger.debug({ err, name }, 'Storing image failed');
  }
}

/**
 * Resolves a photograph from the best available source.
 *
 * Ticketmaster first: it holds a picture for most touring acts, and returns
 * 16:9 landscape images that fit the card header without the guessed crop the
 * Wikimedia portraits need. Wikimedia second, and it earns its place — measured
 * over 30 live performers, Ticketmaster resolved 24 and Wikimedia filled 3 more
 * that Ticketmaster does not hold, for 27 of 30 against 25 for either alone.
 *
 * It is also what makes the daily quota safe. Ticketmaster allows 5,000 calls
 * a day; when that is spent the branch returns null and the site keeps its
 * images rather than falling back to a page of gradients.
 * @param name - Performer name as it appears in the TicketNetwork catalog.
 * @param category - TicketNetwork category, used to disambiguate the search.
 * @returns The image and the source that produced it.
 */
async function resolve(
  name: string,
  category?: string,
): Promise<{ image: PerformerImage | null; source: string }> {
  const fromTicketmaster = await getTicketmasterImage(name);
  if (fromTicketmaster) {
    return { image: fromTicketmaster, source: 'ticketmaster' };
  }

  return { image: await resolveFromWikimedia(name, category), source: 'wikimedia' };
}

/**
 * Resolves a performer name to an image.
 *
 * Never throws. Every failure — no match, no image, exhausted quota, network
 * error, timeout, unreachable database — returns null so the caller can fall
 * back to its category gradient.
 *
 * Three layers, fastest first: an in-memory cache, then Postgres, then the
 * live sources. The Postgres layer exists because node-cache does not survive
 * a deploy, and re-resolving every performer viewed after one would eat into a
 * 5,000-a-day quota that the whole site depends on.
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
  const cached = await cacheGet<{ image: PerformerImage | null }>(key, TTL, async () => {
    const stored = await readStored(name);
    if (stored) {
      return { image: stored };
    }

    const { image, source } = await resolve(name, category);
    if (image) {
      await writeStored(name, source, image);
    }
    return { image };
  });

  return cached.image;
}

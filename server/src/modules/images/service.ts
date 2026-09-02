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

/**
 * Reduces a name to a comparable form.
 *
 * Strips accents, case and punctuation, and removes a trailing parenthetical:
 * Wikipedia disambiguates with one, so "AFI (band)" and "AFI" are the same
 * subject under a different title, not a different act.
 * @param value - A performer name or an article title.
 * @returns The comparable form, possibly empty.
 */
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Whether an article is about the act we asked for.
 *
 * Wikipedia search returns its best guess, not a match, and its best guess for
 * an unknown act is often a real article about something else. Measured against
 * the live catalogue, four names in thirty resolved to the wrong subject:
 * "42nd Street" to the Times Square subway station, "Air" to the Earth's
 * atmosphere, "Allen Anthony" to Anthony Newley, "Alabama - The Band" to that
 * band's lead singer. Each returned a real photograph, so nothing downstream
 * could tell it was wrong.
 *
 * Containment is not enough — "42nd Street" appears inside "Times
 * Square-42nd Street station". The article title must be the name itself.
 *
 * TicketNetwork appends descriptors its own catalogue needs, listing that band
 * as "Alabama - The Band" where Wikipedia has "Alabama (band)", so the part
 * before a dash is accepted as an alternative form of the name.
 * @param requested - The performer name from TicketNetwork.
 * @param articleTitle - The title Wikipedia returned.
 * @returns True when the article is about that act.
 */
function namesMatch(requested: string, articleTitle: string): boolean {
  const article = normalizeName(articleTitle);
  if (!article) return false;

  const candidates = new Set([normalizeName(requested)]);
  const beforeDash = requested.split(/\s+-\s+/)[0];
  if (beforeDash) candidates.add(normalizeName(beforeDash));

  return candidates.has(article);
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

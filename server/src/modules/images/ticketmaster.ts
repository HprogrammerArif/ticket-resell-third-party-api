import { env } from '../../config/env';
import { logger } from '../../libs/logger';
import { createRateLimiter } from '../../libs/throttle';
import { namesMatch } from './names';
import type { PerformerImage } from './types';

const ENDPOINT = 'https://app.ticketmaster.com/discovery/v2/attractions.json';

const TIMEOUT_MS = 3000;

/** How many search results to consider before giving up on a name. */
const CANDIDATES = 5;

/**
 * Ratios in the order we want them.
 *
 * `16_9` first because it is the event card header's aspect and the event
 * hero's — a landscape image drops straight in, where the Wikimedia portraits
 * have to be cropped at a guessed focal point and hope the face survives.
 */
const RATIOS = ['16_9', '3_2', '4_3'] as const;

/**
 * Discovery documents 5 requests per second. One grid page asks for up to 24
 * images at once, so without this the very first page load breaches it.
 */
const throttle = createRateLimiter(5, 1000);

/**
 * Above this, `next/image` is resizing down and the extra bytes are wasted.
 * Ticketmaster offers the same picture up to 2048px wide.
 */
const MAX_WIDTH = 1000;

type TmImage = {
  url?: string;
  ratio?: string;
  width?: number;
  height?: number;
  fallback?: boolean;
};

type TmAttraction = {
  name?: string;
  aliases?: string[];
  images?: TmImage[];
  url?: string;
};

/**
 * Chooses the image to display, or null when the attraction has none worth
 * showing.
 *
 * `fallback` is the field that matters and the easy one to miss. Ticketmaster
 * serves a generic house graphic when it holds no real photograph, flagged
 * only by this boolean — the image object is otherwise entirely well formed,
 * with a plausible ratio and size. Measured live, a tribute act returned ten
 * images and every one was flagged. Rendering one would put someone else's
 * placeholder where our own category gradient belongs, which is a considered
 * piece of the design rather than an absence.
 * @param images - The attraction's images, in whatever order the API gave them.
 * @returns The chosen image, or null when none is usable.
 */
function selectImage(images: TmImage[] | undefined): TmImage | null {
  const usable = (images ?? []).filter(
    (i) => i.fallback !== true && typeof i.url === 'string' && (i.width ?? 0) <= MAX_WIDTH,
  );
  if (usable.length === 0) {
    return null;
  }

  for (const ratio of RATIOS) {
    const matching = usable.filter((i) => i.ratio === ratio);
    if (matching.length > 0) {
      return matching.reduce((a, b) => ((a.width ?? 0) >= (b.width ?? 0) ? a : b));
    }
  }

  return usable.reduce((a, b) => ((a.width ?? 0) >= (b.width ?? 0) ? a : b));
}

/**
 * Resolves a performer name to a Ticketmaster photograph.
 *
 * Never throws. Every failure — no key, no match, exhausted quota, network
 * error, timeout, malformed body — returns null so the caller can fall through
 * to Wikimedia and, failing that, to the category gradient.
 *
 * The results are scanned rather than taking the first: Discovery's keyword
 * search returns its best guess, and for an act it does not hold that guess is
 * a real record for something else. Measured live, "Aerosmith" returns "In The
 * Attic - Tribute to Aerosmith" first and "Air" returns "Air Supply". The
 * correct attraction is often further down the list, so every candidate is
 * checked before giving up.
 * @param name - Performer name as it appears in the TicketNetwork catalog.
 * @returns The image, or null when none can be resolved.
 */
export async function getTicketmasterImage(name: string): Promise<PerformerImage | null> {
  const apiKey = env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    keyword: name,
    size: String(CANDIDATES),
    apikey: apiKey,
  });

  let attractions: TmAttraction[];
  try {
    const res = await throttle(() => fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }));
    if (!res.ok) {
      // 429 means the daily quota or the per-second rate is spent. That is a
      // normal operating state, not a fault, and it degrades to Wikimedia.
      logger.debug({ status: res.status, name }, 'Ticketmaster lookup rejected');
      return null;
    }
    const body = (await res.json()) as { _embedded?: { attractions?: unknown } };
    const found = body._embedded?.attractions;
    attractions = Array.isArray(found) ? (found as TmAttraction[]) : [];
  } catch (err) {
    logger.debug({ err, name }, 'Ticketmaster lookup failed');
    return null;
  }

  for (const attraction of attractions) {
    if (!namesMatch(name, attraction.name ?? '', attraction.aliases)) {
      continue;
    }
    const image = selectImage(attraction.images);
    if (!image?.url) {
      continue;
    }
    return {
      url: image.url,
      width: image.width ?? 0,
      height: image.height ?? 0,
      sourcePage: attraction.url ?? '',
      title: attraction.name ?? name,
    };
  }

  return null;
}

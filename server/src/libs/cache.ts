import NodeCache from 'node-cache';
import { logger } from './logger';

/**
 * Singleton in-memory cache instance.
 * Uses stdTTL=0 (no default TTL) — each entry specifies its own TTL via cacheGet.
 * checkperiod=120 runs expired-key cleanup every 2 minutes.
 * maxKeys=5000 bounds memory footprint on a constrained VPS.
 * useClones=false avoids deep-cloning cached JSON on every read; safe here since
 * callers only ever read cached values and pass them straight to res.json(),
 * never mutate them in place.
 */
const cache = new NodeCache({ stdTTL: 0, checkperiod: 120, useClones: false, maxKeys: 5000 });

// Tracks in-flight fetches per key so concurrent misses for the same key share
// one upstream call instead of each firing its own (TicketNetwork's Sandbox API
// has been observed taking 15+ seconds on a cold call — without this, N concurrent
// requests for the same uncached resource means N separate 15s waits and N TN calls).
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Wrap-through cache helper.
 *
 * On a cache HIT: returns the stored value immediately.
 * On a cache MISS: joins an in-flight fetch for the same key if one is already
 * running; otherwise calls `fetcher()`, stores the result under `key` for
 * `ttlSeconds`, then returns the result.
 *
 * @param key        Unique cache key (include all relevant params).
 * @param ttlSeconds How long to cache the result (seconds).
 * @param fetcher    Async function that fetches the real data.
 */
export async function cacheGet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) {
    return hit;
  }

  const pending = inFlight.get(key);
  if (pending) {
    // Shared generic map necessarily erases T; this cast is the one place that
    // boundary is crossed, scoped to a single line.
    return pending as Promise<T>;
  }

  const promise = fetcher()
    .then((value) => {
      try {
        cache.set(key, value, ttlSeconds);
      } catch (err) {
        logger.warn({ err, key }, 'Failed to set cache entry (e.g. maxKeys reached)');
      }
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Build a deterministic cache key from a base name and an optional params object.
 * Sorts keys to ensure the same params in different orders produce the same key.
 */
export function buildCacheKey(
  base: string,
  params?: object,
): string {
  if (!params) return base;

  const parts = Object.entries(params)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && (typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`);

  return parts.length > 0 ? `${base}?${parts.join('&')}` : base;
}

/**
 * Flush the entire cache (useful for testing or admin endpoints).
 */
export function clearCache(): void {
  cache.flushAll();
}

/**
 * Returns cache statistics (keys, hits, misses, ksize, vsize).
 */
export function getCacheStats(): NodeCache.Stats {
  return cache.getStats();
}

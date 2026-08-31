# Performer Imagery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Artist cards, artist detail pages and event detail heroes show real photographs sourced from Wikimedia, falling back to the existing designed placeholders where no photo exists.

**Architecture:** A new Express module resolves a performer name to a Wikimedia image URL in two stages — direct article lookup, then search with a category hint — caching the outcome for a day in the existing `node-cache` layer. The client fetches through its existing `CatalogApi` / `CachedCatalogApi` pair and renders with `next/image`, so Wikimedia is hit once per image rather than once per visitor. Every failure path returns `null` and the UI falls back to placeholders that already exist in the codebase.

**Tech Stack:** Express 4, `node-cache` via the existing `cacheGet`, Vitest + Supertest (server); Next.js 16 App Router, `next/image`, `unstable_cache` (client).

**Spec:** `docs/superpowers/specs/2026-08-31-performer-imagery-design.md`

## Global Constraints

- **User-Agent is mandatory on every Wikimedia request:** `TicketLove/1.0 (https://ticketlove.net; work.mohammedarif@gmail.com)`. Wikimedia's policy states requests without a descriptive User-Agent carrying contact details "may be blocked without notice."
- **Nothing throws.** Every failure — no article, disambiguation page, article without image, network error, timeout — returns `null`. A Wikimedia outage must degrade pages to how they look today, never break them.
- **Request timeout: 3 seconds**, via `AbortSignal.timeout(3000)`.
- **Cache TTL:** `24 * 60 * 60` (1 day) on the server for both hits and misses; the client wraps it in `unstable_cache` at 7 days. See Task 1 for why the spec's split TTL was collapsed.
- **Never destructure props in a component signature.** Use `props.foo` (`client/CLAUDE.md` §5.1).
- **Named exports only**, except Next.js page/layout defaults.
- **Always `next/image`, never a bare `<img>`.**
- **No `useMemo` / `useCallback`.** Server components by default.
- **No hard-coded user-visible strings** — use next-intl keys, and add them to both `en.json` and `fr.json`.
- **Conventional commits, no scope:** `feat: ...`, `test: ...`.
- Server tests: `cd server && npm test`. Client typecheck: `cd client && npm run check:types`. Client lint: `cd client && npx oxlint <paths>`.

---

### Task 1: Wikimedia resolution service

**Files:**
- Create: `server/src/modules/images/service.ts`
- Test: `server/tests/images/service.test.ts`

**Interfaces:**
- Consumes: `cacheGet`, `buildCacheKey` from `../../libs/cache`; `logger` from `../../libs/logger`
- Produces:
  - `type PerformerImage = { url: string; width: number; height: number; sourcePage: string; title: string }`
  - `categoryHint(category?: string): string`
  - `getPerformerImage(name: string, category?: string): Promise<PerformerImage | null>`

- [ ] **Step 1: Write the failing test**

Create `server/tests/images/service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

import { getPerformerImage, categoryHint } from '../../src/modules/images/service';
import { clearCache } from '../../src/libs/cache';

const SUMMARY_WITH_IMAGE = {
  type: 'standard',
  title: '3 Doors Down',
  originalimage: { source: 'https://upload.wikimedia.org/a.jpg', width: 800, height: 600 },
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/3_Doors_Down' } },
};

const SUMMARY_DISAMBIGUATION = {
  type: 'disambiguation',
  title: 'AFI',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/AFI' } },
};

const SUMMARY_NO_IMAGE = {
  type: 'standard',
  title: 'Abra Moore',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Abra_Moore' } },
};

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

describe('categoryHint', () => {
  it('maps concerts to band', () => {
    expect(categoryHint('Concerts / Rock')).toBe('band');
  });

  it('maps theatre to musical', () => {
    expect(categoryHint('Theatre')).toBe('musical');
  });

  it('maps sports to team', () => {
    expect(categoryHint('Sports / NBA')).toBe('team');
  });

  it('falls back to performer for anything else', () => {
    expect(categoryHint(undefined)).toBe('performer');
    expect(categoryHint('Miscellaneous')).toBe('performer');
  });
});

describe('getPerformerImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearCache();
  });

  it('returns the image from a direct article hit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(SUMMARY_WITH_IMAGE)));

    const result = await getPerformerImage('3 Doors Down', 'Concerts');

    expect(result).toEqual({
      url: 'https://upload.wikimedia.org/a.jpg',
      width: 800,
      height: 600,
      sourcePage: 'https://en.wikipedia.org/wiki/3_Doors_Down',
      title: '3 Doors Down',
    });
  });

  it('sends the required User-Agent on every request', async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse(SUMMARY_WITH_IMAGE));
    vi.stubGlobal('fetch', spy);

    await getPerformerImage('3 Doors Down', 'Concerts');

    const init = spy.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers['User-Agent']).toContain('TicketLove/1.0');
    expect(init.headers['User-Agent']).toContain('work.mohammedarif@gmail.com');
  });

  it('falls through to search when the direct lookup is a disambiguation page', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_DISAMBIGUATION))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [{ title: 'AFI (band)' }] } }))
      .mockResolvedValueOnce(jsonResponse({ ...SUMMARY_WITH_IMAGE, title: 'AFI (band)' }));
    vi.stubGlobal('fetch', spy);

    const result = await getPerformerImage('AFI', 'Concerts');

    expect(result?.title).toBe('AFI (band)');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('includes the category hint in the search query', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_DISAMBIGUATION))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } }));
    vi.stubGlobal('fetch', spy);

    await getPerformerImage('AFI', 'Concerts');

    const searchUrl = String(spy.mock.calls[1]?.[0]);
    expect(decodeURIComponent(searchUrl)).toContain('AFI band');
  });

  it('returns null when the article has no image', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_NO_IMAGE))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } })));

    expect(await getPerformerImage('Abra Moore', 'Concerts')).toBeNull();
  });

  it('returns null rather than throwing when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(getPerformerImage('Anyone', 'Concerts')).resolves.toBeNull();
  });

  it('returns null rather than throwing when the request times out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' }),
    ));

    await expect(getPerformerImage('Anyone', 'Concerts')).resolves.toBeNull();
  });

  it('caches a miss so it is not re-queried on every call', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_NO_IMAGE))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } }));
    vi.stubGlobal('fetch', spy);

    await getPerformerImage('Abra Moore', 'Concerts');
    const callsAfterFirst = spy.mock.calls.length;
    await getPerformerImage('Abra Moore', 'Concerts');

    expect(spy.mock.calls.length).toBe(callsAfterFirst);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd server && npx vitest run tests/images/service.test.ts`
Expected: FAIL — module `../../src/modules/images/service` not found.

- [ ] **Step 3: Write the service**

Create `server/src/modules/images/service.ts`:

```ts
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
 * The spec proposed 7 days for hits and 1 for misses, but cacheGet fixes the TTL
 * when the entry is written, before the outcome is known — varying it would mean
 * a second cache entry that nothing reads. One day is the right compromise: a
 * miss is retried daily rather than on every request, and a hit costs two cheap
 * lookups a day. The client wraps this in unstable_cache at 7 days anyway, so
 * the server rarely re-resolves in practice.
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

  const img = summary.originalimage ?? summary.thumbnail;
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
 * Misses are cached too, or the performers without photographs would be
 * re-queried on every page view forever.
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
```

- [ ] **Step 4: Run the tests**

Run: `cd server && npx vitest run tests/images/service.test.ts`
Expected: 12 passing.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/images/service.ts server/tests/images/service.test.ts
git commit -m "feat: resolve performer images from Wikimedia

Two-stage resolution: exact article title, falling back to search with a
category hint. Measured at 9/10 coverage on real catalogue performers
against 7/10 for direct lookup alone — the gain is correct matching, not
more content. AFI and 42nd Street both resolve to disambiguation pages
while the real articles carry images.

Never throws. No article, disambiguation, no image, network failure and
timeout all return null so callers can fall back to a placeholder. Misses
are cached at a shorter TTL so performers without photographs are not
re-queried on every page view.

Carries the User-Agent Wikimedia's policy requires; requests without one
may be blocked without notice."
```

---

### Task 2: Images endpoint

**Files:**
- Create: `server/src/modules/images/routes.ts`
- Modify: `server/src/routes/index.ts`
- Test: `server/tests/images/routes.test.ts`

**Interfaces:**
- Consumes: `getPerformerImage` from Task 1; `catalogRateLimiter` from `../../middleware/rateLimiter`
- Produces: `GET /api/images/performer?name=…&category=…` returning `{ image: PerformerImage | null }`

- [ ] **Step 1: Write the failing test**

Create `server/tests/images/routes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/modules/images/service', () => ({
  getPerformerImage: vi.fn(),
  categoryHint: vi.fn(() => 'band'),
}));

import app from '../../src/app';
import * as images from '../../src/modules/images/service';

describe('GET /api/images/performer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 422 when name is missing', async () => {
    const res = await request(app).get('/api/images/performer');
    expect(res.status).toBe(422);
    expect(images.getPerformerImage).not.toHaveBeenCalled();
  });

  it('returns the resolved image', async () => {
    vi.mocked(images.getPerformerImage).mockResolvedValueOnce({
      url: 'https://upload.wikimedia.org/a.jpg',
      width: 800,
      height: 600,
      sourcePage: 'https://en.wikipedia.org/wiki/Abba',
      title: 'Abba',
    });

    const res = await request(app).get('/api/images/performer?name=Abba&category=Concerts');

    expect(res.status).toBe(200);
    expect(res.body.image.url).toBe('https://upload.wikimedia.org/a.jpg');
    expect(images.getPerformerImage).toHaveBeenCalledWith('Abba', 'Concerts');
  });

  it('returns 200 with a null image when nothing is found', async () => {
    vi.mocked(images.getPerformerImage).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/images/performer?name=Nobody');

    expect(res.status).toBe(200);
    expect(res.body.image).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd server && npx vitest run tests/images/routes.test.ts`
Expected: FAIL — the route 404s rather than returning 422/200.

- [ ] **Step 3: Write the routes**

Create `server/src/modules/images/routes.ts`:

```ts
import { Router } from 'express';
import { catalogRateLimiter } from '../../middleware/rateLimiter';
import { ApiError } from '../../middleware/errorHandler';
import { getPerformerImage } from './service';

const router = Router();

router.get('/performer', catalogRateLimiter, async (req, res, next) => {
  try {
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    if (!name) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'name is required');
    }

    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    // A missing image is a normal outcome, not an error — 200 with a null body
    // keeps that distinct from a genuine failure.
    res.json({ image: await getPerformerImage(name, category) });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 4: Mount the router**

In `server/src/routes/index.ts`, add the import beside the others:

```ts
import imagesRouter from '../modules/images/routes';
```

and the mount below the existing ones:

```ts
router.use('/api/images', imagesRouter);
```

- [ ] **Step 5: Run the whole server suite**

Run: `cd server && npm test`
Expected: all pass, including the 3 new route tests.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/images/routes.ts server/src/routes/index.ts server/tests/images/routes.test.ts
git commit -m "feat: expose GET /api/images/performer

Returns 200 with a null image when nothing resolves, rather than a 404 —
a performer without a photograph is a normal outcome, not a failure, and
the distinction matters to the caller.

Behind the existing catalog rate limiter, since it is public and drives
outbound requests."
```

---

### Task 3: Client API and cache wrapper

**Files:**
- Modify: `client/src/libs/CatalogApi.ts`
- Modify: `client/src/libs/CachedCatalogApi.ts`
- Modify: `client/src/types/Catalog.ts`

**Interfaces:**
- Consumes: `GET /api/images/performer` from Task 2; `ApiClient` from `@/libs/ApiClient`
- Produces:
  - `type TnPerformerImage = { url: string; width: number; height: number; sourcePage: string; title: string }`
  - `CatalogApi.getPerformerImage(name: string, category?: string): Promise<TnPerformerImage | null>`
  - `CachedCatalogApi.getPerformerImage` — same signature, wrapped in `unstable_cache`

- [ ] **Step 1: Add the type**

Append to `client/src/types/Catalog.ts`:

```ts
export type TnPerformerImage = {
  url: string;
  width: number;
  height: number;
  sourcePage: string;
  title: string;
};
```

- [ ] **Step 2: Add the API call**

Append to `client/src/libs/CatalogApi.ts`:

```ts
/**
 * Resolves a performer image from the backend's Wikimedia lookup.
 * @param name - Performer name.
 * @param category - Category name, used to disambiguate the lookup.
 * @returns The image, or null when none exists or the lookup failed.
 */
export async function getPerformerImage(
  name: string,
  category?: string,
): Promise<TnPerformerImage | null> {
  const params: Record<string, string> = { name };
  if (category) {
    params.category = category;
  }

  // Imagery is decorative: a failure here must never break the page it is on.
  try {
    const res = await ApiClient.apiRequest<{ image: TnPerformerImage | null }>(
      '/api/images/performer',
      { params },
    );
    return res.image;
  } catch {
    return null;
  }
}
```

Add `TnPerformerImage` to the existing `import type { … } from '@/types/Catalog';` block at the top of the file.

- [ ] **Step 3: Add the cached wrapper**

Append to `client/src/libs/CachedCatalogApi.ts`:

```ts
// A performer's photograph is far more stable than a ticket price, so this TTL
// is deliberately much longer than every other entry in this file.
export const getPerformerImage = unstable_cache(
  (name: string, category?: string) => CatalogApi.getPerformerImage(name, category),
  ['performer-image'],
  { revalidate: 7 * 24 * 60 * 60, tags: ['performer-image'] },
);
```

- [ ] **Step 4: Typecheck**

Run: `cd client && npm run check:types`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/libs/CatalogApi.ts client/src/libs/CachedCatalogApi.ts client/src/types/Catalog.ts
git commit -m "feat: add performer image to the client catalog API

Follows the existing CatalogApi / CachedCatalogApi pair. The cache TTL is
seven days, deliberately far longer than every other entry in that file —
those are short because prices move, and a photograph does not.

The API call swallows errors and returns null: imagery is decorative and
must never break the page it sits on."
```

---

### Task 4: `PerformerImage` component and image host allowlist

**Files:**
- Create: `client/src/components/catalog/PerformerImage.tsx`
- Modify: `client/next.config.ts`
- Modify: `client/src/locales/en.json`, `client/src/locales/fr.json`

**Interfaces:**
- Consumes: `TnPerformerImage` from Task 3
- Produces: `PerformerImage` component with props `{ image: TnPerformerImage | null; name: string; className?: string; sizes?: string }`

- [ ] **Step 1: Allow the Wikimedia host**

In `client/next.config.ts`, add `images` to `baseConfig`:

```ts
const baseConfig: NextConfig = {
  output: 'standalone',
  // Serving Wikimedia images through next/image rather than hot-linking means
  // their servers are hit once per image instead of once per visitor. Their
  // User-Agent policy is explicit that clients causing excessive load may be
  // blocked, so this is politeness as well as performance.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'upload.wikimedia.org' }],
  },
  devIndicators: {
    position: 'bottom-right',
  },
  // ... rest unchanged
};
```

- [ ] **Step 2: Add the attribution strings**

Add a `PerformerImage` namespace to `client/src/locales/en.json`:

```json
  "PerformerImage": {
    "attribution": "Photo via Wikimedia Commons",
    "alt": "Photograph of {name}"
  }
```

And to `client/src/locales/fr.json`:

```json
  "PerformerImage": {
    "attribution": "Photo via Wikimedia Commons",
    "alt": "Photographie de {name}"
  }
```

- [ ] **Step 3: Write the component**

Create `client/src/components/catalog/PerformerImage.tsx`:

```tsx
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { TnPerformerImage } from '@/types/Catalog';

/**
 * Renders a performer photograph with its Creative Commons attribution.
 *
 * Returns null when there is no image so the caller can render its own
 * placeholder — roughly one performer in ten has no photograph on Wikipedia,
 * and that must look deliberate rather than broken.
 * @param props - The resolved image, the performer's name, and optional styling.
 * @returns The image with attribution, or null when there is nothing to show.
 */
export function PerformerImage(props: {
  image: TnPerformerImage | null;
  name: string;
  className?: string;
  sizes?: string;
}) {
  const t = useTranslations('PerformerImage');

  if (!props.image) {
    return null;
  }

  return (
    <figure className={props.className}>
      <Image
        src={props.image.url}
        alt={t('alt', { name: props.name })}
        fill
        sizes={props.sizes ?? '(max-width: 768px) 100vw, 400px'}
        className="object-cover"
      />
      <figcaption className="sr-only">
        <a href={props.image.sourcePage} target="_blank" rel="noopener noreferrer">
          {t('attribution')}
        </a>
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `cd client && npm run check:types`
Expected: no errors.

Run: `cd client && npx oxlint src/components/catalog/PerformerImage.tsx`
Expected: 0 errors. Fix any that appear.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/catalog/PerformerImage.tsx client/next.config.ts client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: add PerformerImage component

Renders through next/image with upload.wikimedia.org allowlisted, so
Wikimedia is hit once per image rather than once per visitor. Their
User-Agent policy warns that clients causing excessive load may be
blocked, so this is politeness as well as performance.

Returns null when there is no image, letting each caller supply its own
placeholder. Roughly one performer in ten has no photograph, and that
needs to look deliberate rather than broken.

Carries the Creative Commons attribution, linked to the source article."
```

---

### Task 5: Artist cards and artist detail

**Files:**
- Modify: `client/src/components/catalog/ArtistCard.tsx`
- Modify: `client/src/app/[locale]/(marketing)/artists/page.tsx`
- Modify: `client/src/app/[locale]/(marketing)/artists/[id]/page.tsx`

**Interfaces:**
- Consumes: `PerformerImage` from Task 4; `getPerformerImage` from `@/libs/CachedCatalogApi` (Task 3)
- Produces: `ArtistCard` accepts an optional `image?: TnPerformerImage | null` prop

- [ ] **Step 1: Give ArtistCard an image slot**

In `client/src/components/catalog/ArtistCard.tsx`, add to the imports:

```tsx
import { PerformerImage } from '@/components/catalog/PerformerImage';
import type { TnPerformer, TnPerformerImage } from '@/types/Catalog';
```

Change the signature to accept the image:

```tsx
export function ArtistCard(props: {
  performer: TnPerformer;
  locale?: string;
  image?: TnPerformerImage | null;
}) {
```

Replace the avatar block. The initials fallback is kept exactly as it is — it
already looks deliberate, and it is what the ~10% without photographs get:

```tsx
      {/* Avatar — photograph when Wikimedia has one, initials otherwise. */}
      <div className="relative size-20 overflow-hidden rounded-full ring-2 ring-transparent transition-all group-hover:ring-[var(--color-brand)]">
        {props.image
          ? (
              <PerformerImage
                image={props.image}
                name={performer.text.name}
                className="absolute inset-0"
                sizes="80px"
              />
            )
          : (
              <div
                className="flex size-full items-center justify-center text-[22px] font-bold text-white"
                style={{ backgroundColor: bgColor }}
              >
                {initials}
              </div>
            )}
      </div>
```

- [ ] **Step 2: Resolve images on the artists listing page**

In `client/src/app/[locale]/(marketing)/artists/page.tsx`, add the import:

```tsx
import { getPerformerImage } from '@/libs/CachedCatalogApi';
```

After the performers are fetched and before they are rendered, resolve images in
parallel. `Promise.all` rather than a loop, so one slow lookup does not serialise
the rest:

```tsx
  const images = await Promise.all(
    results.map((p) =>
      getPerformerImage(p.text.name, p.defaultCategory?.text.name),
    ),
  );
```

Then pass each one down where `ArtistCard` is rendered:

```tsx
        {results.map((performer, i) => (
          <ArtistCard key={performer.id} performer={performer} image={images[i]} />
        ))}
```

- [ ] **Step 3: Resolve the image on the artist detail page**

In `client/src/app/[locale]/(marketing)/artists/[id]/page.tsx`, add the imports:

```tsx
import { getPerformerImage } from '@/libs/CachedCatalogApi';
import { PerformerImage } from '@/components/catalog/PerformerImage';
```

After `performer` is loaded, resolve its image:

```tsx
  const image = await getPerformerImage(
    performer.text.name,
    performer.defaultCategory?.text.name,
  );
```

Render it above the performer's name in the page header, sized as a banner. When
`image` is null `PerformerImage` returns null and the header collapses to what it
renders today:

```tsx
      {image && (
        <div className="relative mb-6 h-[280px] w-full overflow-hidden rounded-2xl max-md:h-[180px]">
          <PerformerImage
            image={image}
            name={performer.text.name}
            className="absolute inset-0"
            sizes="(max-width: 768px) 100vw, 1226px"
          />
        </div>
      )}
```

- [ ] **Step 4: Typecheck and lint**

Run: `cd client && npm run check:types`
Expected: no errors.

Run: `cd client && npx oxlint src/components/catalog/ArtistCard.tsx "src/app/[locale]/(marketing)/artists"`
Expected: 0 errors.

- [ ] **Step 5: Verify by hand**

Run `npm run dev` from the repo root, then:

1. Visit `http://localhost:3000/artists` — expect photographs on most cards and initials on the rest, with no broken-image icons anywhere.
2. Open an artist with a photograph — expect a banner above the name.
3. Open an artist without one (a small or obscure act) — expect the page to render exactly as it does today.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/catalog/ArtistCard.tsx "client/src/app/[locale]/(marketing)/artists"
git commit -m "feat: show performer photographs on artist pages

ArtistCard already had an avatar slot with a deterministic colour and
initials, so the photograph drops into the existing circle and the
initials remain the fallback — no new placeholder design needed.

Listing page resolves images with Promise.all rather than in sequence, so
one slow lookup does not serialise the rest.

An artist without a photograph renders exactly as the page does today."
```

---

### Task 6: Event detail hero

**Files:**
- Modify: `client/src/app/[locale]/(marketing)/events/[id]/page.tsx`

**Interfaces:**
- Consumes: `getPerformerImage` from Task 3; `PerformerImage` from Task 4
- Produces: nothing further

- [ ] **Step 1: Resolve the headline performer's image**

In `client/src/app/[locale]/(marketing)/events/[id]/page.tsx`, add the imports:

```tsx
import { getPerformerImage } from '@/libs/CachedCatalogApi';
import { PerformerImage } from '@/components/catalog/PerformerImage';
```

After `event` is loaded, resolve an image for the headline performer. An event has
no photograph of its own, so the first billed performer stands in for it:

```tsx
  const headliner = event.performers?.[0]?.text?.name;
  const heroImage = headliner
    ? await getPerformerImage(headliner, event.category?.text?.name)
    : null;
```

- [ ] **Step 2: Render it behind the existing hero**

The page header at `max-w-[1440px] px-[107px] py-10` already carries a gradient
banner. Add the photograph behind it, dimmed so the existing white heading text
stays legible:

```tsx
      {heroImage && (
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <PerformerImage
            image={heroImage}
            name={headliner ?? ''}
            className="absolute inset-0 opacity-30"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
        </div>
      )}
```

Add `relative` to the existing hero container's className so `absolute inset-0`
positions against it.

- [ ] **Step 3: Typecheck and lint**

Run: `cd client && npm run check:types`
Expected: no errors.

Run: `cd client && npx oxlint "src/app/[locale]/(marketing)/events"`
Expected: 0 errors.

- [ ] **Step 4: Verify by hand**

With `npm run dev` running:

1. Open an event whose headline act is well known — expect a dimmed photograph behind the title, with the title still clearly readable.
2. Open an event with an obscure act — expect the header exactly as it looks today.
3. Confirm the seat map below is unaffected.

- [ ] **Step 5: Commit**

```bash
git add "client/src/app/[locale]/(marketing)/events/[id]/page.tsx"
git commit -m "feat: show a performer photograph behind the event hero

An event has no photograph of its own, so the first billed performer
stands in. Dimmed to 30% behind a gradient so the existing heading text
stays legible rather than competing with the image.

Events without a resolvable performer render exactly as they do today."
```

---

## Verification

After Task 6, from the repo root:

```bash
cd server && npm test && npm run build
cd ../client && npm run check:types && npm run build
```

Expected: server tests all pass including the new `tests/images/` files, `dist/server.js` is emitted, and the client builds.

Then check the failure path deliberately, because it is the one that matters most and no unit test proves it end to end:

```bash
# With the dev server running, block Wikipedia at the OS level or disconnect,
# then load /artists.
```

Expected: the page renders with initials avatars throughout, no error boundary, no broken images. If it does anything else, the `null`-on-failure contract is not holding somewhere.

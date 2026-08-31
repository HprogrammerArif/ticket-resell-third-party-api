# Performer Imagery from Wikimedia — Design

**Date:** 2026-08-31
**Status:** Design approved, spec awaiting review
**Related:** liaison `V1`, `R12` (TicketNetwork supplies no imagery)

---

## Problem

Ticket Love has no images anywhere — no event, artist, category or venue photography. The site is text, dates and prices.

This is not an oversight in the frontend. **TicketNetwork's CatalogAPI returns no imagery at all.** Verified 2026-08-31 against Production:

| Checked | Result |
|---|---|
| Their OpenAPI spec — 119 model definitions, scanned for `image`, `photo`, `media`, `thumbnail`, `picture`, `logo`, `banner`, `poster`, `artwork` | **no matches** |
| Live `events` response — 61 distinct fields | **none image-like** |
| Live `performers` response — 27 fields | **none** |
| Live `venues` response — 34 fields | **none** |
| Live `categories` response — 25 fields | **none** |

Confirmed independently by TicketNetwork: *"None. MapWidget is the only surface. No additional endpoints, no images"* (R12, Ian Schultz, 2026-08-19).

So all imagery is ours to source. An event page that is a wall of text is a worse buying experience than one with a photograph of the artist, and that plausibly costs conversions.

---

## Decisions

### D1 — Wikimedia, not Ticketmaster

Ticketmaster's Discovery API returns rich imagery and is free with an API key. **Rejected on licensing.** Their terms of use prohibit:

> *"Use the Ticketmaster API for any application that replicates or attempts to replace the unique essential user experience of Ticketmaster.com"*

> *"Derive revenues from the use or provision of the Ticketmaster API, whether for direct commercial or monetary gain or otherwise"*

> *"...as a generic image hosting service for banner advertisements, graphics, etc."*

Ticket Love is a competing ticket resale site earning commission per sale. Using their images to decorate inventory sold through TicketNetwork engages all three clauses. Displaying Ticketmaster's inventory and linking back to Ticketmaster is the intended use; taking their images to sell a competitor's inventory is not.

The realistic risk is not litigation — it is a takedown months in, after imagery is woven through event pages, artist pages and search results, forcing a rushed removal on a live site.

**Wikimedia instead.** Creative Commons or public domain, licensed for reuse, no competitor conflict, no key, no quota. The obligation is attribution, which is a caption.

Steven may still write to `copyrightofficer@livenation.com` — the contact Ticketmaster's own terms name — and ask directly. A written yes would let us revisit. We do not wait on it, and nothing here blocks a later switch: the frontend only ever sees an image URL.

### D2 — Two-stage resolution

Measured against ten real performers from the Production catalogue:

| Strategy | Coverage |
|---|---|
| Direct title lookup only | **7 / 10** |
| Direct, falling back to search with a category hint | **9 / 10** |

The gain is not extra content — it is correct matching. `AFI` and `42nd Street` both resolved to **disambiguation pages**; the articles (`AFI (band)`, `42nd Street (musical)`) exist and carry images. Only `Abra Moore` is a genuine gap: article present, nobody has added a photo.

1. **Direct** — `GET /api/rest_v1/page/summary/{name}`. Accept only when `type === 'standard'` **and** an image is present. A disambiguation page is a miss, not a result.
2. **Search with hint** — `GET /w/api.php?action=query&list=search&srsearch={name} {hint}&srlimit=1`, then summary on the top title.

The hint comes from TicketNetwork's own category, so it costs nothing:

| Category contains | Hint |
|---|---|
| `concert`, `music` | `band` |
| `theat` | `musical` |
| `sport` | `team` |
| anything else | `performer` |

### D3 — Images served through `next/image`

`upload.wikimedia.org` is added to `remotePatterns` in `next.config.ts`.

Three benefits at once: it satisfies the project rule that images always use `next/image`; it resizes and optimises; and Wikimedia's servers are hit once per image rather than once per visitor. That last point matters — their User-Agent policy states clients causing excessive load "may be blocked without notice."

### D4 — A missing image is never an error

Every failure path returns `null`, and the UI falls back to the gradient that already exists in `EventCard.categoryVisual()`.

| Failure | Behaviour |
|---|---|
| No article found | `null` |
| Disambiguation page | try search, then `null` |
| Article without an image | `null` |
| Wikipedia unreachable | `null` |
| Request exceeds 3s timeout | `null` |

Nothing throws. A Wikipedia outage must degrade the artists page to how it looks today, not break it.

**Negative results are cached**, at a shorter TTL than hits. Without that, the ~10% of performers with no photo would re-query on every page view forever.

### D5 — Scope: artists and event detail only

| Surface | This phase |
|---|---|
| Artist cards (`/artists`) | ✅ images |
| Artist detail (`/artists/[id]`) | ✅ image |
| Event detail hero (`/events/[id]`) | ✅ image (via headline performer) |
| Event listing, category, venue, search | gradient, as today |

Performers are where a photograph does the most work, and it is the smallest change that makes the site feel real. Venues and categories are deliberately excluded: small venues rarely have Wikipedia articles, and a category has no natural photographic subject.

Listing pages keep the existing gradients, which caps cold-cache lookups per page view.

---

## Architecture

```
Artist page ──► Next.js ──► Express /api/images/performer ──► Wikipedia REST + Search
                                        │
                                        └──► cacheGet (existing node-cache)

<Image src> ──► next/image ──► upload.wikimedia.org  (optimised, cached by us)
```

Express owns the external dependency, exactly as it owns TicketNetwork. One cache, one failure path, one User-Agent. The frontend never talks to Wikipedia.

---

## Backend

### New files

```
server/src/modules/images/service.ts    resolution + caching
server/src/modules/images/routes.ts     mounted at /api/images
```

### Interface

```ts
export type PerformerImage = {
  url: string;          // upload.wikimedia.org
  width: number;
  height: number;
  sourcePage: string;   // Wikipedia article, for attribution link
  title: string;        // resolved article title
};

export async function getPerformerImage(
  name: string,
  categoryHint?: string,
): Promise<PerformerImage | null>;
```

### Endpoint

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/images/performer?name=…&category=…` | Resolved image, or `{ image: null }` |

Behind the existing `catalogRateLimiter`, since it is public and outbound-bound.

### Required User-Agent

```
TicketLove/1.0 (https://ticketlove.net; work.mohammedarif@gmail.com)
```

Sent on **every** Wikipedia request. Wikimedia's policy is explicit that requests without a descriptive User-Agent carrying contact details may be blocked without notice. This is a hard requirement, not etiquette.

### Caching

A new entry in the existing `TTL` block in `server/src/routes/catalog.ts`, or a local equivalent in the images module:

```ts
PERFORMER_IMAGE: 7 * 24 * 60 * 60,   // 7 days — a performer's photo is stable
PERFORMER_IMAGE_MISS: 24 * 60 * 60,  // 1 day  — retry misses, but not per request
```

Seven days is deliberate: the catalog's 30-minute TTL exists because prices move. A photograph does not.

Cache keys use `buildCacheKey('performer-image', { name, hint })`, so the existing `maxKeys: 5000` bound applies unchanged.

---

## Frontend

### New files

```
client/src/components/catalog/PerformerImage.tsx
```

### Modified

```
client/next.config.ts                              remotePatterns for upload.wikimedia.org
client/src/components/catalog/ArtistCard.tsx       image slot
client/src/app/[locale]/(marketing)/artists/[id]/page.tsx
client/src/app/[locale]/(marketing)/events/[id]/page.tsx
```

`PerformerImage` takes a resolved image or `null` and renders either the photograph with its attribution caption, or the existing category gradient. Pages fetch server-side; the component makes no network calls of its own.

### Attribution

Beneath each photograph, small and muted:

> Photo via Wikimedia Commons

linking to `sourcePage`. This is the Creative Commons obligation. It is fetched with the image rather than as a second request.

---

## Testing

`server/tests/images/`, with Wikipedia mocked:

| Test | Why |
|---|---|
| a direct hit returns the image | happy path |
| a disambiguation page falls through to search | this is the 7→9 improvement |
| search resolves using the category hint | the hint is load-bearing |
| an article with no image returns `null` | not an error |
| **a network failure returns `null` rather than throwing** | a Wikipedia outage must not break the page |
| **a timeout returns `null`** | slow is the same as absent |
| every request carries the User-Agent | omitting it risks being blocked |
| a miss is cached | otherwise misses re-query forever |

The two bold rows matter most. Everything else is convenience; those two are what stand between a third-party outage and a broken page on a live site.

---

## Out of scope

Venue, category and event-listing imagery; uploading or hosting our own images; an admin UI for overriding a performer's photo; Ticketmaster.

The `CachedPerformer` table already in the Prisma schema (currently unused) is the natural home if runtime lookups ever become a bottleneck — a background job populating it would remove the runtime dependency entirely. Not needed now, and not blocked by this design, since the frontend only ever sees a URL.

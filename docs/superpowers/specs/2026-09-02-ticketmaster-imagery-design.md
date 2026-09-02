# Ticketmaster Discovery Imagery — Design

**Date:** 2026-09-02
**Status:** Awaiting review
**Supersedes in part:** ADR-013 (Wikimedia Commons only) — Wikimedia remains, as the fallback

---

## Goal

Use Ticketmaster's Discovery API as the primary source of performer and event photographs, keeping the existing Wikimedia resolver as the fallback.

Steven asked for this directly, having judged the current images not good enough. He is right that some are wrong; the measurements below are what the change has to beat.

---

## Context

TicketNetwork provides no imagery at all. Confirmed explicitly by Ian on 2026-09-01 (R35): *"We do not provide any performer or event images."* That closes the question of an official feed — the choice is between third-party sources.

The current Wikimedia resolver, measured against 30 live performers after the 2026-09-02 matching fix:

| | Count |
|---|---:|
| Correct photograph | 25 |
| Wrong photograph | 0 |
| Category gradient | 5 |

The five gradients are each correct outcomes rather than failures: *42nd Street* and *Aida* offer only non-free files, *Abra Moore* has no image on Wikipedia at all. So the target for Ticketmaster is **coverage**, not correctness — the question is whether it fills some of those five, and how many more it covers across the wider catalogue.

**This design does not claim Ticketmaster will be better.** That is measured in Task 1 below, before the rest is built. If it does not beat 25/30 with zero wrong, the honest outcome is to keep Wikimedia and say so.

### Terms of use — recorded, not re-argued

Ticketmaster's developer terms restrict deriving revenue from use of the API. Steven, as the business owner, has reviewed this and directed that we proceed; he has confirmed no permission is required to obtain a key, which is correct — sign-up is free and instant.

Recorded here so the decision is attributable rather than assumed. The architecture keeps the switch cheap in either direction (D1), which is the practical protection: if access is ever withdrawn, the site keeps its images.

---

## Decisions

### D1 — Ticketmaster first, Wikimedia fallback, one interface

`getPerformerImage(name, category)` keeps its signature and its `PerformerImage | null` return type. Nothing downstream changes — cards, heroes, the proxy route, `localPatterns`, all untouched.

```
getPerformerImage(name, category)
        |
   Ticketmaster  --found-->  return
        |
   (no match / quota spent / error / timeout)
        |
   Wikimedia     --found-->  return
        |
      null  ->  category gradient
```

**Why keep Wikimedia rather than replace it.** Three reasons, in order of weight:

1. **It is what makes the daily quota safe.** 5,000 calls/day is a real ceiling. When it is reached the site must still render, and it will.
2. **Coverage is additive.** Ticketmaster has no article-quality constraint; Wikimedia has no commercial-usage question. Where one is empty the other often is not.
3. **It is the exit.** If the key is ever revoked, removing one branch restores the current behaviour. No rebuild.

### D2 — Reject `fallback: true` images

Every image object carries a `fallback` boolean. Ticketmaster serves a **generic placeholder** when it has no real photograph for an attraction, and it is marked with this flag.

Accepting those would be worse than having no image: a generic Ticketmaster house graphic on our card, where our own category gradient is deliberate design that matches the site. Any image with `fallback: true` is treated as no image, and resolution continues to Wikimedia.

This is the single most important detail in the integration and the easiest to miss — the field is a boolean on an image that otherwise looks entirely valid.

### D3 — Throttle to 5 requests per second

The documented limit is 5 requests/second. Our `getEventImages` resolves a whole grid in one `Promise.all` — up to 24 images at once. That exceeds the limit on the first page load.

A small in-process queue caps outbound Ticketmaster requests at 5/sec. Wikimedia has no such limit and is unaffected.

**Why not simply reduce the parallelism.** Because serialising the grid is what `Promise.all` was chosen to avoid: one slow lookup would hold up every card behind it. Throttle the outbound calls, not the page.

### D4 — Persist resolved images in Postgres

`node-cache` is in memory. A deploy empties it, and every performer viewed afterwards is fetched again. With a 5,000/day quota, two deploys on a busy day could exhaust it and silently degrade the whole site to gradients.

Resolved images are written to a `PerformerImageCache` table, following the `CachedCategory` precedent already in the schema. The in-memory cache stays in front of it as the fast path.

Photographs are not prices: a stale one costs nothing. TTL is **30 days** in Postgres, against 24 hours in memory.

### D5 — The same name-matching guard applies

Attraction search returns its best keyword guess, exactly as Wikipedia search does. The 2026-09-02 fix exists because that guess is often a real record for something else — and a wrong photograph is worse than none, because nothing downstream can tell.

`namesMatch()` is reused unchanged, with one addition: Discovery returns an `aliases` array, and a match against any alias counts. That is strictly more permissive than the Wikimedia path and legitimately so — an alias is the same act under another name.

### D6 — Image selection: `16_9`, widest under 1000px, never a fallback

Attractions carry several images across `16_9`, `3_2` and `4_3` ratios at various sizes.

- **Ratio `16_9`** matches the event card header (`h-44`, full width) and the event hero. It is also the least likely to crop a face badly, which is the flaw in the current portrait-derived crops.
- **Widest under 1000px.** Wikimedia taught this the expensive way: preferring the original served a 5 MB file for an 80px avatar. `next/image` resizes anyway, so anything beyond display width is wasted bytes.
- **`fallback: false` only**, per D2.

If no `16_9` image qualifies, fall through the other ratios by the same rule before giving up.

### D7 — No proxy needed for Ticketmaster

The Wikimedia proxy route exists because Wikimedia's User-Agent policy answers 403 to an unidentified agent and 429 to a generic one. Ticketmaster's image CDN has no such requirement.

Ticketmaster URLs are therefore served through `next/image` directly via `remotePatterns`, skipping our proxy hop. The proxy stays exactly as it is for Wikimedia URLs, licence gate included.

---

## Data model

```prisma
model PerformerImageCache {
  name       String   @id            // the TicketNetwork performer name, as queried
  source     String                  // 'ticketmaster' | 'wikimedia'
  url        String
  width      Int
  height     Int
  sourcePage String
  title      String
  cachedAt   DateTime @default(now())
}
```

A row is written for a **hit only**. Misses stay in the in-memory cache with their existing 24-hour TTL, so a performer who acquires a photograph next week is retried rather than being written off for a month.

---

## Configuration

```
TICKETMASTER_API_KEY=...
```

Absent or empty, the Ticketmaster branch is skipped entirely and the resolver behaves exactly as it does today. That is the intended state for local development without a key, and the automatic degradation if the key is ever revoked.

---

## Testing

`server/tests/images/ticketmaster.test.ts`:

| Test | Why it matters |
|---|---|
| Resolves an attraction to its `16_9` image | The happy path |
| **Rejects an image with `fallback: true`** | D2. A generic house graphic must never reach a card |
| Rejects an attraction whose name does not match | D5, the defect that shipped once already |
| Accepts a match against an `aliases` entry | D5's deliberate widening |
| Picks the widest image under 1000px | D6, and the 5 MB lesson |
| Falls back to Wikimedia when Discovery returns nothing | D1 |
| Falls back to Wikimedia on HTTP 429 | Quota exhaustion must degrade, not break |
| Never throws — network error, timeout, malformed body | The `null`-never-throws contract |
| Skips Ticketmaster entirely when no key is configured | The no-key path is the local default |
| Throttle admits no more than 5 requests per second | D3 |

---

## Tasks

### Task 1 result — measured 2026-09-02, proceed

Against the same 30 performers, with the guards from D2 and D5 applied:

| Source | Correct | Wrong | Gradient |
|---|---:|---:|---:|
| Wikimedia alone (current production) | 25 | 0 | 5 |
| Ticketmaster alone | 24 | 0 | 6 |
| **Both, as designed in D1** | **27** | **0** | **3** |

Ticketmaster supplies 24 and Wikimedia fills 3 more that Ticketmaster
cannot — *Air Force Falcons*, *Alabama - The Band*, *Alabama Crimson
Tide*. The fallback is not merely insurance against the quota; it is
worth two net images on a sample of thirty.

Three findings from the live data:

- **D5 is load-bearing.** Discovery's keyword search has exactly the same
  flaw as Wikipedia's. "Aerosmith" returns *In The Attic - Tribute to
  Aerosmith* as its first result, "Air" returns *Air Supply*, and
  "Alabama - The Band" returns *Alabama Sunset Band*. Without the name
  check, three wrong photographs would have shipped.
- **D2 is load-bearing.** That tribute act carried ten images and every
  one was `fallback: true`. Abra Moore likewise — an attraction record
  exists, but only placeholders behind it.
- **The images are better shaped than Wikimedia's.** Discovery returns
  640x360 at `16_9`, which is the event card header's aspect ratio.
  Wikimedia returns portraits that we crop at `object-[50%_20%]` and hope
  the face survives. For the 24 that resolve through Ticketmaster, that
  guesswork disappears.

**Known refinement, not yet built.** Two sports names failed the match
because Discovery uses a longer official form: *Alabama Crimson Tide* is
listed as *Alabama Crimson Tide Football*. Allowing a trailing sport
qualifier would recover those. Plain prefix matching would not be safe —
*Alabama Sunset Band* also begins with "Alabama" — so any such rule needs
an explicit suffix list rather than a loose comparison.

---

**Task 1 — Measure before building.** A throwaway script against the same 30 performers, reporting correct / wrong / absent for Ticketmaster alone. **The result decides whether to continue.** If it does not beat 25 correct with 0 wrong, that finding is the deliverable and the rest of this document is not built.

**Task 2** — `ticketmaster.ts`: client, image selection, `fallback` rejection, name matching. Tests first.

**Task 3** — The 5/sec throttle, with its own test.

**Task 4** — `PerformerImageCache` table, migration, read-through and write-through.

**Task 5** — Wire into `service.ts` as the primary source; Wikimedia becomes the fallback branch.

**Task 6** — `remotePatterns` for the Ticketmaster CDN host in `next.config.ts`. Confirmed in a browser, not by HTTP status — `localPatterns` was missed exactly this way, and returned 200 the whole time it was broken.

**Task 7** — Re-measure end to end and record the numbers in this document.

---

## Out of scope

Event-specific images from `/discovery/v2/events` — the catalogue is TicketNetwork's, and matching our events to Ticketmaster's by name and date is a separate problem with its own failure modes. Performer imagery is where the value is, since an event borrows its headliner's photograph already.

Venue and category imagery. Neither has a request behind it.

Any change to the checkout, the map widget, or attribution.

# Live Filter Suggestions & Country Filter — Design Spec

**Date:** 2026-08-16
**Status:** Approved

---

## Goal

Replace free-text filter inputs (city, keyword/performer, venue) across the site with
live, TicketNetwork-backed typeahead suggestions — the way a professional ticket site
(Ticketmaster, StubHub) behaves — and add a Country filter dimension that doesn't
exist anywhere today. Selecting a suggestion updates results without a full page
reload.

## Background / Why

TicketNetwork's CatalogAPI already ships dedicated suggest endpoints
(`/events/suggest`, `/performers/suggest`, `/venues/suggest`, `/cities/suggest`) and
our backend already wraps all four (`suggestEvents`/`suggestPerformers`/
`suggestVenues`/`suggestCities` in `server/src/modules/ticketnetwork/catalog.ts`,
proxied at `/api/catalog/*/suggest`, and re-exported from
`client/src/libs/CachedCatalogApi.ts`) — none of them are called from any page or
component today. Filter inputs are currently plain `<input>` text boxes: if a user
types a city/performer name that doesn't exactly match TN's data, the result is a
silent empty grid, with no guidance toward a name that would actually work.

Country is not filterable anywhere in the UI, even though `country/alphaCode` and
`country/text/name` are valid OData filter properties on `/events`, `/venues`, and
`/cities` (confirmed in `docs/swagger.json`), and `getCountries()` already works.

**Known unknown:** none — every endpoint this design depends on is already
implemented, tested, and verified working against the live Sandbox API. This is
UI/UX work wiring up existing capability, not new TicketNetwork integration.

## Architecture

The browser currently has no path to fetch anything live — every catalog fetch runs
server-side during RSC render (`BACKEND_API_URL` is a server-only env var, by
design, and stays that way). Live typeahead needs a browser-reachable endpoint, so
one thin Next.js Route Handler is added as a proxy; it does no logic of its own,
just forwards to the already-working cached wrappers:

```
Browser (SuggestInput, debounced keystroke)
  └─ GET /api/suggest/{type}?q=...          (Next.js Route Handler, new)
       └─ CachedCatalogApi.suggest{Type}()   (existing, unstable_cache-wrapped)
            └─ Express /api/catalog/{type}/suggest  (existing, in-memory cached)
                 └─ TicketNetwork /{type}/suggest    (existing, real Sandbox data)
```

Filter *state* stays URL-driven, unchanged in kind from today (search params on the
page route) — only the *mechanism* for changing the URL moves from a native
`<form method="GET">` submission to `router.push()` from a client component, so
selecting a suggestion re-renders results without a full document reload. Pages
remain server components reading `searchParams`; only the filter bar itself becomes
`'use client'`, matching the pattern `SearchBar.tsx` already uses today.

## Backend changes

Two param types are missing a `country` filter dimension entirely — add it,
following the exact pattern already used for `city`/`stateProvince` in
`server/src/modules/ticketnetwork/catalog.ts`:

- `EventParams` gains `country?: string` → `eventQuery()` adds
  `country/alphaCode eq '<code>'` to the existing `odataAnd([...])` filter list.
- `VenueParams` gains `country?: string` → `venueQuery()` adds the same clause.

Country is selected by ISO alpha code (`US`, `CA`, ...), not display name — stable
and unambiguous, unlike matching on a translated/display country name string.
`CityParams.country` already exists (added in the earlier city `hasEvents` fix) and
follows the same alpha-code convention for consistency.

Route handlers (`server/src/routes/catalog.ts`) for `/events` and `/venues` forward
`req.query.country` into the params object, same as every other filter field today.

## New Route Handler

`client/src/app/api/suggest/[type]/route.ts` — single dynamic route, dispatches on
`type`:

```ts
type SuggestType = 'events' | 'performers' | 'venues' | 'cities';

// GET /api/suggest/events?q=hamilton&limit=8
// → { totalResultCount: number, results: TnEventSuggest[] }
```

- `type` restricted to the four literal values above; anything else → 404.
- `q` required (422 if missing/empty, mirroring the backend's own validation).
- `limit` optional, defaults to 8, forwarded as `numberOfSuggestions`.
- Calls the matching `CachedCatalogApi.suggestX({ q, numberOfSuggestions: limit })`
  and returns its result verbatim — no reshaping, no new types.

## New Components

**`SuggestInput`** (`client/src/components/catalog/SuggestInput.tsx`, `'use client'`)

- Props: `{ type: SuggestType; name: string; placeholder: string; defaultValue?: string; onSelect: (value: string) => void }`
- Debounces input 300ms; fires no request under 2 characters.
- Renders a real ARIA combobox (`role="combobox"`, `aria-expanded`,
  `aria-activedescendant`), not a decorative dropdown — full arrow-key / Enter /
  Escape support, per the project's own accessibility bar (`client/CLAUDE.md` §15).
- Three visible states: loading, populated list, "no matches" — a failed fetch
  degrades silently to a plain text input (the field still submits as free text;
  suggestions are an enhancement, never a requirement to search).
- `onSelect` receives the suggestion's display name (a string) — not its numeric
  `id` — since that's what the underlying OData filters already match on
  (`city/text/name eq`, `text/name eq`, etc.), consistent with how these filters
  work today. Callers are responsible for turning that into a URL navigation
  (component has no router dependency itself — keeps it reusable and
  independently testable).

**`CountrySelect`** (`client/src/components/catalog/CountrySelect.tsx`)

- Plain `<select>`, not a typeahead — ~195 countries is a small bounded list, the
  case a real dropdown fits better than a search box.
- Options built from `getCountries({ pageSize: 250 })` (cached, effectively static
  data), value = `alphaCode`, label = `text.name`.
- Fetched server-side once per page render and passed down as props — no separate
  client-side data fetch needed for this one.

## Page-by-page changes

| Page | Filter | Before | After |
|---|---|---|---|
| `client/src/components/catalog/SearchBar.tsx` (homepage hero) | keyword | plain text | `SuggestInput type="events"` |
| ″ | city | plain text | `SuggestInput type="cities"` |
| `events/page.tsx` | keyword | plain text | `SuggestInput type="events"` |
| ″ | city | plain text | `SuggestInput type="cities"` |
| ″ | country | *(none)* | **new** `CountrySelect` |
| ″ | date range | native date inputs | unchanged |
| `venues/page.tsx` | city | plain text | `SuggestInput type="cities"` |
| ″ | stateProvince | plain text | unchanged (small enough per-country list is arguable; left as text input — not in scope, see Open Items) |
| ″ | country | *(none)* | **new** `CountrySelect` |
| `artists/page.tsx` | keyword | plain text, backend `contains()` filter | `SuggestInput type="performers"` — replaces the `contains()` OData workaround with TN's purpose-built fuzzy performer suggest |
| `categories/[...path]/page.tsx` | *(date range, subcategory chips)* | unchanged | unchanged — no TN category-suggest endpoint exists; existing chip/browse pattern already fits this data shape |

Each converted filter bar also gains **removable filter chips** above the results
grid (e.g. "City: Toronto ✕") reflecting the current search params — cheap to add
once the bar is already a client component managing this state, and the detail that
makes filtering read as deliberate rather than incidental.

Selecting a suggestion or a country immediately updates the URL (`router.push`,
replacing the relevant search param, resetting `page` to 1). Free-text entry with no
selection still works exactly as today on submit — the suggestion dropdown is
guidance, never a hard constraint on what can be searched.

## i18n

New keys needed under existing namespaces (`EventsPage`, `VenuesPage`,
`ArtistsPage`, `Common`): `filter_country`, `no_suggestions`,
`suggestions_loading`, `remove_filter` (chip aria-label). Follow existing
`snake_case`/sentence-case conventions in `en.json`/`fr.json`.

## Testing

- Unit: `SuggestInput`'s debounce/minimum-character gating, and the route handler's
  `type` validation + `q` requirement, are the two genuinely testable units here
  (Vitest, matching existing `*.test.ts` co-location convention).
- No new TicketNetwork integration to verify — every endpoint this touches is
  already covered by `server/tests/ticketnetwork/catalog.test.ts`.
- Manual: verify each converted filter bar end-to-end in a browser (type → see real
  suggestions → select → results update without a full reload → chip appears →
  remove chip clears the filter), plus a no-JS-fallback sanity check that the
  underlying `<input name="...">` still round-trips through a plain form submission.

## Open Items (outside this spec's scope)

- `stateProvince` filters (venues/events) stay plain text for now — TN has no
  dedicated state/province suggest endpoint, and turning `getStateProvinces()` into
  a typeahead-vs-dropdown call is a smaller, separate decision not requested here.
- Sort options, facets, and other unwired TN query surface (flagged in the earlier
  CatalogAPI audit) remain out of scope — this spec is about search/filter input
  quality, not adding new filter dimensions beyond the explicitly requested Country.

## Done Criteria

- `client/src/app/api/suggest/[type]/route.ts` created, all four types working
- `SuggestInput` and `CountrySelect` components built and used consistently
- `EventParams`/`VenueParams` gain `country`, wired through `eventQuery`/`venueQuery`
  and their route handlers
- Homepage `SearchBar`, Events page, Venues page, Artists page all converted per the
  table above; Categories page intentionally left unchanged
- Filter chips render and correctly remove their filter on click
- `npm run check:types` and `npm run lint` pass on both `client/` and `server/`
- Manual end-to-end verification per Testing section, on real Sandbox data

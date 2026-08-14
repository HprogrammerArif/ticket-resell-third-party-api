# Phase 2 — Next.js Frontend: Figma Implementation — Design Spec

**Date:** 2026-08-14
**Figma file:** https://www.figma.com/design/O1FzG0lsNLxynQw8oqqIhZ/Ticket-Love
**UI reference:** `ui-design/` folder (exported screenshots for all screens)
**Phase doc:** `docs/project/02-phases.md`

---

## Goal

Replace the boilerplate Next.js frontend with the full Ticket Love site. Every public-facing browsing page is implemented using real TicketNetwork Sandbox data, matches the Figma/ui-design design exactly, is fully responsive, and has no hard-coded user-visible strings.

Auth pages (Sign Up, Log In, Dashboard), Gift Card purchase, Checkout, and Admin are **not** in this phase — those are Phases 3–6.

---

## Architecture

**Data mode:** Mode 2 throughout. The client never touches the database. All data comes from `src/libs/ApiClient.ts` → Express backend (`/api/*`) → TicketNetwork CatalogAPI.

**Rendering:** React Server Components (RSC) by default. Every data-fetching page is `async`. Client components (`"use client"`) are used only for interactive elements: search inputs, tab switching, carousels, quantity selectors.

**Streaming:** Every RSC that fetches data is wrapped in `<Suspense fallback={<SkeletonComponent />}>` so the shell (header, footer) renders immediately while data loads.

**Router:** Next.js App Router. All pages live under `src/app/[locale]/(marketing)/`.

**i18n:** `next-intl`. All user-visible strings in `src/locales/en.json` with a namespace per page. French (`fr.json`) keys mirror English for now — full French translation is a future task. Namespace convention: `HomePage`, `EventDetailPage`, `ArtistDetailPage`, etc.

---

## Design System

All tokens are defined as CSS custom properties in `src/styles/global.css` and referenced by Tailwind `var()` utilities.

### Colors (exact from Figma node 65:21)

```css
:root {
  /* Brand */
  --color-brand: #ea2a43;
  --color-brand-muted: rgba(234, 42, 67, 0.5);
  --color-brand-subtle: rgba(234, 42, 67, 0.1);

  /* Surfaces */
  --color-surface: #0f0f0f;          /* page background */
  --color-surface-raised: #171717;   /* card / input background */
  --color-surface-border: #262626;   /* card / input border */

  /* Text */
  --color-text-primary: #ffffff;
  --color-text-secondary: #a1a1a1;   /* --neutral/400 */
  --color-text-muted: #737373;       /* --neutral/500, placeholder text */
  --color-text-light: #d4d4d4;       /* --neutral/300, inactive nav links */
}
```

### Typography (exact from Figma)

Two Google Fonts, loaded via `next/font/google` in `src/app/[locale]/layout.tsx`:

| Font | Weights | Usage |
|------|---------|-------|
| **Poppins** | 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold) | All headings, nav, buttons, body |
| **Plus Jakarta Sans** | 400 (Regular) | Metadata text: dates, venues, locations |

Apply both as CSS variables on `<html>`: `--font-poppins` and `--font-jakarta`.

Key sizes from Figma:
- Hero headline: 60px / Poppins SemiBold / tracking -1.5px / line-height 75px
- Logo text: 28px / Poppins SemiBold / tracking -1.5px
- Nav links: 14px / Poppins (active: SemiBold white, inactive: Light `#d4d4d4`)
- CTA buttons: 18px / Poppins Medium / white
- Section headings: visually ~32–40px Poppins SemiBold
- Card titles: Poppins SemiBold
- Metadata (date, venue): 14px / Plus Jakarta Sans Regular / `rgba(255,255,255,0.6)`
- Placeholder text: 14px / Poppins Regular / `#737373`
- Search button label: 14px / Poppins Medium / white

### Logo (Figma node 100:5632)

- **Icon:** 54×54px red ticket/heart image asset ("TicketLove Logo-B5 3"). Download and store at `public/logo-icon.png`. Never use the expiring Figma CDN URL in committed code.
- **Wordmark:** "Ticket**L**ove**.net**" — Poppins SemiBold 28px, tracking -1.5px. "Ticket", "ove", "net" are white; "L" and "." are `#ea2a43`.
- Rendered as: `<Image src="/logo-icon.png" alt="" width={54} height={54} />` + styled `<span>` for the wordmark.

### Spacing & Shape

- Page max-width: 1440px, `mx-auto`
- Section horizontal padding: `px-[107px]` on desktop, `px-4` on mobile
- Card border-radius: `rounded-2xl` (16px)
- Button border-radius: `rounded-full` (100px)
- Input border-radius: `rounded-full`
- Card border: `1px solid var(--color-surface-border)`

---

## File Structure

### New files to create

```
src/
├── libs/
│   └── CatalogApi.ts                  # typed wrappers → ApiClient → Express /api/*
├── types/
│   └── Catalog.ts                     # TN response types (mirrors server types.ts)
├── components/
│   ├── layout/
│   │   ├── Header.tsx                 # nav, logo, mobile menu
│   │   └── Footer.tsx                 # columns + email subscribe
│   └── catalog/
│       ├── EventCard.tsx              # event image, name, date, venue, price, Buy Now
│       ├── EventCardSkeleton.tsx
│       ├── ArtistCard.tsx             # circular avatar, name, upcoming count
│       ├── ArtistCardSkeleton.tsx
│       ├── CategoryCard.tsx           # category image/gradient, name, count
│       ├── CategoryCardSkeleton.tsx
│       ├── VenueCard.tsx              # venue name, city, link
│       ├── SearchBar.tsx              # keyword + city + date inputs (client component)
│       ├── SectionHeading.tsx         # title + optional "See All" link
│       ├── TabNav.tsx                 # horizontal tab bar (client component)
│       ├── TicketRow.tsx              # ticket tier: section, price, quantity selector
│       └── Pagination.tsx
├── app/[locale]/(marketing)/
│   ├── page.tsx                       # Homepage (replace boilerplate)
│   ├── events/
│   │   ├── page.tsx                   # Events listing + filters
│   │   └── [id]/
│   │       └── page.tsx               # Event detail
│   ├── artists/
│   │   ├── page.tsx                   # Artists listing
│   │   └── [id]/
│   │       └── page.tsx               # Artist detail
│   ├── categories/
│   │   └── [...path]/
│   │       └── page.tsx               # Category browse (filtered events)
│   ├── venues/
│   │   ├── page.tsx                   # Venues listing
│   │   └── [id]/
│   │       └── page.tsx               # Venue detail
│   └── search/
│       └── page.tsx                   # Search results
└── locales/
    ├── en.json                        # all strings (namespaced per page)
    └── fr.json                        # mirrors en.json for now
```

### Files to modify

| File | Change |
|------|--------|
| `src/styles/global.css` | Add CSS custom properties (colors, font variables) |
| `src/utils/AppConfig.ts` | Set `name: 'TicketLove.net'`, keep `locales: ['en', 'fr']` |
| `src/app/[locale]/layout.tsx` | Load Poppins + Plus Jakarta Sans via `next/font/google` |
| `src/app/[locale]/(marketing)/layout.tsx` | Add `<Header />` and `<Footer />` |
| `src/libs/Env.ts` | No change needed — `BACKEND_API_URL` already declared |
| `public/` | Add `logo-icon.png` (download from Figma asset URL before it expires) |

---

## Data Layer

### `src/types/Catalog.ts`

TypeScript types matching the TN CatalogAPI v2 response shapes (same shapes as `server/src/modules/ticketnetwork/types.ts` but in the client package):

```typescript
export type TnPagedResult<T> = {
  page: number;
  count: number;
  totalCount: number;
  results: T[];
  _links?: unknown;
};

export type TnCategory = {
  path: string;
  text: { name: string };
  salesRank?: number;
  depth?: number;
  parentCategory?: TnCategory;
};

export type TnEvent = {
  id: number;
  date: { datetime: string; date: string; time: string };
  text: { name: string };
  venue?: { id: number; text: { name: string }; city?: string; stateProvince?: string };
  performers?: TnPerformer[];
  minPrice?: number;
  maxPrice?: number;
};

export type TnPerformer = {
  id: number;
  text: { name: string };
  imageUrl?: string;
  upcomingEventCount?: number;
  categoryPath?: string;
};

export type TnVenue = {
  id: number;
  text: { name: string };
  city?: string;
  stateProvince?: string;
  country?: string;
};

export type TnCity = {
  id: number;
  text: { name: string };
  stateProvince?: string;
  country?: string;
};

export type TnSuggestResult = {
  events: TnEvent[];
  performers: TnPerformer[];
  venues: TnVenue[];
  cities: TnCity[];
};
```

### `src/libs/CatalogApi.ts`

Typed wrappers around `ApiClient.get`. All functions are `async`, return the typed result, and forward only defined params (strip `undefined` before building query string).

```typescript
// All functions call ApiClient.get<T>(path, { params: { ... } })
// where params strips undefined values

export async function getCategories(params?: { pageNumber?: number; pageSize?: number }): Promise<TnPagedResult<TnCategory>>
export async function getCategoryByPath(path: string, params?: { pageNumber?: number; pageSize?: number }): Promise<TnCategory>
export async function getEvents(params?: EventParams): Promise<TnPagedResult<TnEvent>>
export async function searchEvents(params?: EventParams): Promise<TnPagedResult<TnEvent>>
export async function getEventById(id: number): Promise<TnEvent>
export async function getPerformers(params?: PerformerParams): Promise<TnPagedResult<TnPerformer>>
export async function getPerformerById(id: number): Promise<TnPerformer>
export async function getVenues(params?: VenueParams): Promise<TnPagedResult<TnVenue>>
export async function getVenueById(id: number): Promise<TnVenue>
export async function getCities(params?: CityParams): Promise<TnPagedResult<TnCity>>
export async function globalSuggest(q: string): Promise<TnSuggestResult>
```

`EventParams`: `{ keyword?, categoryPath?, city?, dateFrom?, dateTo?, pageNumber?, pageSize? }`
`PerformerParams`: `{ keyword?, categoryPath?, pageNumber?, pageSize? }`
`VenueParams`: `{ city?, stateProvince?, pageNumber?, pageSize? }`
`CityParams`: `{ stateProvince?, country?, pageNumber?, pageSize? }`

All params are passed as `Record<string, string>` to `ApiClient.get`. `number` params are converted with `.toString()`. Undefined entries are omitted.

---

## Shared Components

All components use named exports. Props use a single `props` object (no destructuring in signature). No `any`. All user-visible strings passed from parent via i18n.

### `Header` (Figma node 65:21)

Server component. Renders full-width `<header>` with:
- **Logo:** `<Link href="/">` containing `<Image src="/logo-icon.png" />` + wordmark `<span>` with split coloring ("L" and "." in `#ea2a43`)
- **Nav links:** Home, Sports, Concerts, Theatre, Gift Cards — each a `<Link>`. Active state: Poppins SemiBold white; inactive: Poppins Light `#d4d4d4`. Routes: Home→`/`, Sports→`/categories/sports`, Concerts→`/categories/concerts`, Theatre→`/categories/theater`, Gift Cards→`/gift-cards` (placeholder, Phase 4)
- **CTA:** "Get Started →" pill button, `bg-[var(--color-brand-muted)]`, links to `/sign-up`
- **Mobile:** hamburger menu (client component sub-island), collapses nav links into a drawer

### `Footer` (Figma node 65:463)

Server component. Four-column layout:
- **COMPANY:** About, Services, Collections
- **ABOUT US:** Mission, Careers, Contact
- **RESOURCES:** Privacy Policy, Terms of Sale, Work with Us
- **SUBSCRIBE TO STAY UPDATE:** email `<input>` + "Subscribe →" button (form submission is a no-op in Phase 2 — subscribe functionality is a future feature)
- Bottom bar: "©2026 TicketLove.net. All rights reserved"
- Background: `#0f0f0f`, top border: `var(--color-surface-border)`

### `EventCard`

Server component. Props: `{ event: TnEvent, locale: string }`.
- Concert/event image: use `next/image`. TN events may not provide an image URL — use a consistent dark placeholder gradient (`bg-gradient-to-br from-[#1a1a1a] to-[#262626]`) with a music note icon when no image available.
- Event name: Poppins SemiBold
- Date: Plus Jakarta Sans Regular, `rgba(255,255,255,0.6)`
- Venue name + city: Plus Jakarta Sans Regular, `rgba(255,255,255,0.6)`
- Price: "From $X" if `event.minPrice` is available; omit price row if not
- "Buy Now" button: `bg-[var(--color-brand)]` pill, links to `/events/${event.id}`
- Full card is also a link to `/events/${event.id}`

### `ArtistCard`

Server component. Props: `{ performer: TnPerformer, locale: string }`.
- Circular avatar (64×64): `next/image` with `rounded-full`. If no `imageUrl`, render initials on a brand-colored circle.
- Artist name: Poppins SemiBold
- "N upcoming events": Plus Jakarta Sans Regular, muted color
- Links to `/artists/${performer.id}`

### `CategoryCard`

Server component. Props: `{ category: TnCategory, eventCount?: number }`.
- Image area (200×200): TN categories have no images — use a music-related gradient background with a category icon (music note, stadium, drama mask, etc.) based on category name keyword matching. Implementer should choose sensible icons.
- Category name: Poppins SemiBold white
- Event count: Plus Jakarta Sans Regular, muted
- Links to `/categories/${category.path}`

### `VenueCard`

Server component. Props: `{ venue: TnVenue }`.
- Venue name: Poppins SemiBold
- City, state: muted text
- Dark card with border, links to `/venues/${venue.id}`

### `SearchBar` (client component)

`"use client"`. Props: `{ defaultKeyword?: string; defaultCity?: string; defaultDate?: string; placeholder: string }`.
- Three inputs: keyword (full-width), city, date (each with search icon)
- "Search" button: full-width, `bg-[var(--color-brand-muted)]` pill
- On submit: `router.push('/events?' + new URLSearchParams({keyword, city, dateFrom}).toString())`
- Placeholder text from Figma: `Try "Taylor Swift near me next month" or "Lakers game under $200"` for keyword; "City or ZIP" for city; "Any date" for date

### `SectionHeading`

Server component. Props: `{ title: string; seeAllHref?: string; seeAllLabel?: string }`.
- Left-aligned title (Poppins SemiBold, ~32px)
- Optional "See All →" link right-aligned

### `TabNav` (client component)

`"use client"`. Props: `{ tabs: Array<{ key: string; label: string }>; activeKey: string; onChange: (key: string) => void }`.
- Horizontal tab row with active indicator (red underline or colored tab)
- Used on Event detail and Artist detail pages

### `TicketRow`

Server component. Props: `{ tier: string; description?: string; price: number; available: number }`.
- Tier name + description, price ($X), availability indicator
- "+" / "−" quantity selector (client sub-island for the controls only)
- Right-aligned price display

### `Pagination`

Client component. Props: `{ currentPage: number; totalPages: number; basePath: string; searchParams: Record<string, string> }`.
- Updates URL search params on page change

---

## Pages

### Homepage (`/`) — Figma node 65:20

RSC page. The marketing layout wraps it in `<Header>` and `<Footer>`.

**Section 1 — Hero (Figma 65:21):**
- Full-bleed dark background with a concert photo overlaid
- Show the top featured event from `getEvents({ pageSize: 5 })` — display `results[0]` as the hero event (name, date, venue)
- Prev/next carousel arrows cycle through `results[0..4]`  
- Hero text: event name (60px Poppins SemiBold), subtitle (tour/event name), date + venue metadata
- "Get Tickets →" button: `bg-[var(--color-brand-muted)]` pill, links to `/events/${featuredEvent.id}`
- **SearchBar** component overlaid at the bottom of the hero
- Sponsor logos strip: static marquee row — Google, Spotify, Canva, Zoom, Slack logos (download from Figma asset URLs and store in `public/sponsors/`). The strip has a subtle `bg-[var(--color-brand-subtle)]` background.
- Loading skeleton: dark gradient placeholder with shimmer

**Section 2 — Browse by Category (Figma 65:139):**
- `<SectionHeading title="Browse by Category" />`
- Fetch `getCategories({ pageSize: 12 })` — display top-level categories as horizontally scrollable `<CategoryCard>` row
- Suspense skeleton: 6 shimmer cards

**Section 3 — Happening this Weekend (Figma 65:249):**
- `<SectionHeading title="Happening this Weekend" seeAllHref="/events" />`
- Fetch `getEvents({ dateFrom: <today>, dateTo: <sunday>, pageSize: 6 })` — `<EventCard>` grid (3 columns desktop, 2 tablet, 1 mobile)
- Suspense skeleton: 6 shimmer cards

**Section 4 — Popular Artists (Figma 65:413):**
- `<SectionHeading title="Popular Artists" seeAllHref="/artists" />`
- Fetch `getPerformers({ pageSize: 8 })` — horizontal scrollable `<ArtistCard>` row
- Suspense skeleton: 8 circular shimmer avatars

**Section 5 — Your City is Electric Right Now (Figma 95:3504):**
- `<SectionHeading title="Your City is Electric Right Now" seeAllHref="/events" />`
- City selector tabs (client component): defaults to the first city from `getCities({ pageSize: 5 })`. Selecting a city re-fetches `getEvents({ city, pageSize: 6 })`.
- "See All" links to `/events?city=<selectedCity>`
- `<EventCard>` grid, same layout as Section 3

**Section 6 — Gift Card Promo (Figma 95:3715):**
- Static section — no API calls. Phase 4 will wire this.
- Text: "Perfect Gift", "Give the gift of live music 🎁", "E-gift cards from $25 to $500"
- CTA: "Get a Gift Card" → `/gift-cards` (placeholder, links to `/` until Phase 4)
- Gift card visual: dark card with red accent, amount "$100", code "8472"
- Background: dark with subtle red gradient

**Section 7 — How It Works (Figma 97:4044):**
- Static section — 3 steps with icons. Implementer should get exact step text from Figma node 97:4044 using `get_design_context`.
- 3-column grid (desktop), stacked (mobile)

**Section 8 — Stats (Figma 97:4111):**
- Static numbers. Implementer must call `get_design_context` on node `97:4111` to get the exact values and labels — do not guess or hard-code from memory.
- Dark background, large Poppins SemiBold numbers in `#ea2a43`, smaller label text below each number

**Section 9 — Footer (Figma 65:463):** Rendered by layout.

---

### Events Listing (`/events`) — Figma listing variants 116:2612 etc.

RSC page. URL search params: `keyword`, `city`, `categoryPath`, `dateFrom`, `dateTo`, `page`.

- `<SectionHeading title="Events" />` 
- Filter sidebar or filter bar (desktop: sidebar, mobile: collapsible filter panel):
  - Keyword search input
  - City input
  - Category dropdown (from `getCategories()`)
  - Date range (from/to date pickers)
  - "Apply Filters" button
- Results: `searchEvents({ keyword, city, categoryPath, dateFrom, dateTo, pageNumber: page, pageSize: 12 })`
- `<EventCard>` grid: 3 cols desktop, 2 tablet, 1 mobile
- `<Pagination>` component
- Empty state: "No events found" message with a prompt to broaden the search
- Loading: 12 skeleton cards

---

### Event Detail (`/events/[id]`) — ui-design: `event details 1-4.png`

RSC page. Fetch `getEventById(id)`.

**Left column (65% width desktop):**
- Event name: large Poppins SemiBold
- Status badge: "Selling Fast" (conditional, show if available from API)
- Performers row: circular avatars + names
- Date / Time / Venue / Location metadata with icons
- Event description text
- Share + Price Alert action links
- Tab navigation (`<TabNav>` client component): Details | Lineup | Venue | FAQ

  **Tab: Details** — ticket tier table:
  - If `event.ticketTiers` or similar field is available from the API, render `<TicketRow>` for each tier (Upper Bowl, Lower Bowl, Floor, VIP Lounge with prices)
  - If the detailed event object does not provide ticket tiers, show a "View Available Tickets" CTA only — do not fabricate tier data
  - "Buy Now" / "Get Tickets" button at the bottom of the tier table: **disabled placeholder** in Phase 2. Render as `<button disabled aria-label="Buy Tickets — coming soon">Get Tickets</button>`. Phase 7 will wire this to TN hosted checkout.

  **Tab: Lineup** — `getPerformers` filtered to this event's performers (if API provides performer list on event). Show `<ArtistCard>` row.

  **Tab: Venue** — venue name, address, map placeholder (static image or address text).

  **Tab: FAQ** — static placeholder accordion (3 FAQ items about ticket delivery, refunds, accessibility). Implementer may get actual FAQ content from Figma node if present.

**Right sidebar (35% width desktop):**
- Price display: "From $X" (minimum price from API)
- "N people viewing right now" — static placeholder number
- "Get Tickets →" button: `bg-[var(--color-brand)]` full-width pill — **disabled** in Phase 2
- "Select in the drawer" sub-text
- Ad Zone placeholders: two dark `<div>` boxes labeled "Ad Zone" with border (Phase 8 wires real ads)

**Below left column:**
- Similar Events: `getEvents({ categoryPath: event.categoryPath, pageSize: 4 })` — horizontal `<EventCard>` scroll

**Error state:** If `getEventById` returns 404 (ApiError 404), render Next.js `notFound()`.

---

### Artists Listing (`/artists`)

RSC page. URL search params: `keyword`, `categoryPath`, `page`.

- `<SectionHeading title="Artists & Performers" />`
- Filter bar: keyword input, category dropdown
- Results: `getPerformers({ keyword, categoryPath, pageNumber: page, pageSize: 24 })`
- `<ArtistCard>` grid: 6 cols desktop, 4 tablet, 2 mobile
- `<Pagination>`
- Empty state + loading skeletons

---

### Artist Detail (`/artists/[id]`) — ui-design: `Artists Details 1-3.png`

RSC page. Fetch `getPerformerById(id)`.

**Header:**
- Large circular avatar (120×120px): performer image if available, else initials
- Artist name: large Poppins SemiBold
- Verified badge (checkmark icon) if applicable
- "N upcoming events" count
- Social links row (icons) — static placeholder in Phase 2 (TN API does not provide social links)
- Share icon

**Tab navigation (`<TabNav>`):** Tour Dates | About | Media

  **Tab: Tour Dates** — `searchEvents({ keyword: performer.text.name, pageSize: 12 })`:
  - `<EventCard>` grid (2 cols desktop, 1 mobile)
  - `<Pagination>`

  **Tab: About** — static placeholder text: "Bio information coming soon." (Phase 8 could add CMS content)

  **Tab: Media** — static placeholder grid of dark boxes (Phase 8 could add YouTube/image embeds)

**Ad Zone sidebar:** Two dark placeholder boxes (same as event detail)

**Similar Artists:** `getPerformers({ categoryPath: performer.categoryPath, pageSize: 6 })` — horizontal scroll of `<ArtistCard>`, excluding the current artist

**Error state:** `notFound()` on 404.

---

### Category Browse (`/categories/[...path]`)

RSC page. `path` is the TN category path (e.g., `sports/hockey`).

- Fetch `getCategoryByPath(path)` for the category name and hierarchy
- Display breadcrumb: Home > Sports > Hockey
- `<SectionHeading title={category.text.name} />`
- Child categories (if `depth < 2`): horizontal `<CategoryCard>` scroll from `getCategories()` filtered by parent
- Events in category: `getEvents({ categoryPath: path, pageSize: 12 })`
- `<EventCard>` grid + `<Pagination>`
- Empty state + skeletons
- **Error state:** `notFound()` on 404

---

### Venues Listing (`/venues`)

RSC page. URL search params: `city`, `stateProvince`, `page`.

- `<SectionHeading title="Venues" />`
- Filter bar: city input, state/province dropdown
- Results: `getVenues({ city, stateProvince, pageNumber: page, pageSize: 24 })`
- `<VenueCard>` grid: 4 cols desktop, 2 tablet, 1 mobile
- `<Pagination>` + empty state + skeletons

---

### Venue Detail (`/venues/[id]`)

RSC page. Fetch `getVenueById(id)`.

- Venue name (large heading), city + state
- Upcoming events at this venue: `getEvents({ city: venue.city, pageSize: 8 })` (TN does not have a venue-filtered events endpoint — use city as proxy)
- `<EventCard>` grid
- **Error state:** `notFound()` on 404

---

### Search (`/search`)

RSC page. URL search params: `q`.

- If `q` is missing or blank, render a prompt: "Enter a search term above to find events, artists, and venues."
- Fetch `globalSuggest(q)` — returns `{ events, performers, venues, cities }`
- Three sections:
  - **Events** (if `results.events.length > 0`): `<EventCard>` row
  - **Artists** (if `results.performers.length > 0`): `<ArtistCard>` row
  - **Venues** (if `results.venues.length > 0`): `<VenueCard>` row
- "See all events →" link to `/events?keyword=q`
- Empty state: "No results for '{q}'" with suggestions
- The header's `<SearchBar>` (if included in nav) routes here

---

## Navigation Routing

| Nav Item | Route |
|----------|-------|
| Logo | `/` |
| Home | `/` |
| Sports | `/categories/sports` |
| Concerts | `/categories/concerts` |
| Theatre | `/categories/theater` |
| Gift Cards | `/gift-cards` (placeholder → `/` until Phase 4) |
| Get Started | `/sign-up` |
| Search (from SearchBar) | `/events?keyword=...&city=...&dateFrom=...` |

---

## i18n Namespaces

All namespaces added to `src/locales/en.json` (and mirrored in `fr.json`):

| Namespace | Used by |
|-----------|---------|
| `Common` | Shared strings: "Buy Now", "See All", "Search", "Get Tickets", "View All", "Loading..." |
| `Header` | Nav link labels, "Get Started" |
| `Footer` | Column headings, link labels, copyright, subscribe CTA |
| `HomePage` | Section headings, hero CTA, gift card promo, "How It Works" steps, stats labels |
| `EventCard` | "Buy Now", "From $X" format, date/venue format |
| `EventDetailPage` | Tab labels, "Get Tickets", "People viewing", "Ad Zone", "Similar Events", FAQ content |
| `ArtistDetailPage` | Tab labels, "Upcoming events", "Similar Artists", "About", "Media" |
| `EventsPage` | Page title, filter labels, empty state |
| `ArtistsPage` | Page title, filter labels, empty state |
| `CategoriesPage` | "Browse by Category", breadcrumb, empty state |
| `VenuesPage` | Page title, filter labels, empty state |
| `VenueDetailPage` | "Upcoming Events at this Venue" |
| `SearchPage` | Prompt text, "No results for", "See all events" |

---

## Non-Functional Requirements

- **Responsive:** Mobile-first. All pages must work at 375px (mobile), 768px (tablet), 1280px+ (desktop). No horizontal overflow.
- **Performance:** RSC + Suspense streaming. No blocking data fetches in layout. Use `next/image` for all images (`width`/`height` explicit or `fill` + sized container). No bare `<img>` tags.
- **Accessibility:** Semantic HTML. All interactive elements keyboard-navigable. Images have `alt` text (or `alt=""` for decorative). WCAG 2.1 AA target. Lint with oxlint a11y rules.
- **Type safety:** No `any`. All API response data typed via `Catalog.ts`. All props typed with explicit inline types.
- **No hard-coded strings:** Every user-visible string goes through `next-intl`.
- **Error boundaries:** Each page has a co-located `error.tsx` that renders a friendly error UI (not a raw stack trace). `notFound()` used for 404-equivalent API errors.
- **"Get Tickets" placeholder:** The button is rendered as `<button disabled>` with `cursor-not-allowed` styling in Phase 2. It is never hidden — it must be visible to users as a coming-soon element.
- **Footer copyright:** "©2026 TicketLove.net. All rights reserved" (not "©2026 Riot").
- **`AppConfig.name`:** Must be changed from `'MyApp'` to `'TicketLove.net'` before any page renders the app name.

---

## Out of Scope (Phase 2)

| Feature | Phase |
|---------|-------|
| Sign Up, Log In, Forgot Password, Change Password pages | Phase 3 |
| User Dashboard (overview, orders, tickets, notifications, profile, settings) | Phase 3 |
| Gift card purchase / balance check / redemption | Phase 4 |
| Checkout flow (Step 1, 2, 3), MiniCart | Phase 5 |
| Admin dashboard | Phase 6 |
| "Get Tickets" button wired to TN hosted checkout | Phase 7 |
| Newsletter subscribe form (functional) | Phase 8 |
| Real-time seat maps | Future |
| Social sharing (functional) | Future |
| Price alerts | Future |

# 06 — Frontend Specification

**Last Updated:** 2026-08-13

---

## Overview

The Next.js 16 frontend (`client/`) is a React Server Component-first application that renders ticket catalog data from the Express backend and implements the Ticket Love Figma design exactly.

**Architecture mode:** Mode 2 — custom backend. All data comes from Express via `ApiClient.ts`. The frontend never calls TicketNetwork directly and never imports `DB.ts`.

**Figma source of truth:** `https://www.figma.com/design/O1FzG0lsNLxynQw8oqqIhZ/Ticket-Love?node-id=0-1&m=dev`

---

## Route Structure

All routes live under `src/app/[locale]/` to support i18n via next-intl.

```
src/app/[locale]/
├── layout.tsx                      ← root locale layout (nav + footer)
├── (marketing)/
│   ├── layout.tsx                  ← marketing layout shell
│   └── page.tsx                    ← Homepage (/)
├── (catalog)/
│   ├── layout.tsx                  ← catalog layout (shared filters sidebar if needed)
│   ├── events/
│   │   ├── page.tsx                ← Events listing (/events)
│   │   └── [id]/
│   │       └── page.tsx            ← Event detail (/events/[id])
│   ├── artists/
│   │   ├── page.tsx                ← Artist/performer listing (/artists)
│   │   └── [id]/
│   │       └── page.tsx            ← Artist detail (/artists/[id])
│   ├── venues/
│   │   ├── page.tsx                ← Venue listing (/venues)
│   │   └── [id]/
│   │       └── page.tsx            ← Venue detail (/venues/[id])
│   ├── categories/
│   │   └── [...path]/
│   │       └── page.tsx            ← Category browsing (/categories/concerts/rock)
│   └── search/
│       └── page.tsx                ← Search results (/search?q=...)
├── (checkout)/
│   ├── layout.tsx                  ← checkout layout (minimal header, no distractions)
│   └── checkout/
│       └── page.tsx                ← Pre-checkout review + redirect (/checkout)
├── gift-cards/
│   └── page.tsx                    ← Gift card purchase (/gift-cards)
├── (auth)/
│   ├── (center)/
│   │   ├── sign-in/
│   │   │   └── page.tsx            ← Sign in (already scaffolded)
│   │   ├── sign-up/
│   │   │   └── page.tsx            ← Sign up (already scaffolded)
│   │   ├── forgot-password/
│   │   │   └── page.tsx            ← Forgot password
│   │   └── layout.tsx
│   └── dashboard/
│       ├── layout.tsx              ← User dashboard layout
│       ├── page.tsx                ← Dashboard home (User Dashboard 1)
│       ├── orders/
│       │   └── page.tsx            ← Order history (User Dashboard 2–3)
│       ├── gift-cards/
│       │   └── page.tsx            ← My gift cards (User Dashboard 4)
│       └── change-password/
│           └── page.tsx            ← Change password
└── admin/
    ├── layout.tsx                  ← Admin layout (Steven only)
    ├── page.tsx                    ← Admin dashboard (TN reporting link/embed)
    └── gift-cards/
        └── page.tsx                ← Gift card management
```

---

## Figma Screen → Route Mapping

| Figma Screen | Route | Status |
|-------------|-------|--------|
| Home Page With Different Section | `/` | `[NOT STARTED]` |
| Home Page Nav & Hero (Header) - 1 | `/` (hero section) | `[NOT STARTED]` |
| Home Page - Browse Category - 2 | `/` (categories section) | `[NOT STARTED]` |
| Home Page - Event this weekend - 3 | `/` (weekend events section) | `[NOT STARTED]` |
| Home Page - Popular Artists - 4 | `/` (artists section) | `[NOT STARTED]` |
| Home Page - Browse By city card - 5 | `/` (cities section) | `[NOT STARTED]` |
| Home Page - Gift Card - 6 | `/` (gift card promo section) | `[NOT STARTED]` |
| Home Page - How it works - 7 | `/` (how it works section) | `[NOT STARTED]` |
| Home Page - Event Basic Statics - 8 | `/` (stats section) | `[NOT STARTED]` |
| Home Page - Footer - 9 | layout (global footer) | `[NOT STARTED]` |
| event details 1 | `/events/[id]` | `[NOT STARTED]` |
| event details 2 | `/events/[id]` (ticket listings) | `[NOT STARTED]` |
| event details 3 | `/events/[id]` (venue map/info) | `[NOT STARTED]` |
| event details 4 | `/events/[id]` (related events) | `[NOT STARTED]` |
| Artists Details 1 | `/artists/[id]` | `[NOT STARTED]` |
| Artist Details 2 | `/artists/[id]` (events list) | `[NOT STARTED]` |
| Artist Details 3 | `/artists/[id]` (more details) | `[NOT STARTED]` |
| Checkout process 1 | `/checkout` (ticket summary) | `[NOT STARTED]` |
| Checkout details process 2 | `/checkout` (details step) | `[NOT STARTED]` |
| Checkout payment process 3 | `/checkout` (pre-redirect step) | `[NOT STARTED]` |
| Gift Card Checkout 1 | `/gift-cards` | `[NOT STARTED]` |
| Gift Card Checkout 2 | `/gift-cards` (purchase flow) | `[NOT STARTED]` |
| User Dashboard 1 | `/dashboard` | `[NOT STARTED]` |
| User Dashboard 2 | `/dashboard/orders` | `[NOT STARTED]` |
| User Dashboard 3 | `/dashboard/orders` (detail) | `[NOT STARTED]` |
| User Dashboard 4 | `/dashboard/gift-cards` | `[NOT STARTED]` |
| User Dashboard 5 | `/dashboard/change-password` | `[NOT STARTED]` |
| User Dashboard 6 | `/dashboard` (profile section) | `[NOT STARTED]` |
| Log In | `/sign-in` | `[IN PROGRESS — scaffolded, needs wiring]` |
| Sign Up | `/sign-up` | `[IN PROGRESS — scaffolded, needs wiring]` |
| Forget Password | `/forgot-password` | `[NOT STARTED]` |
| Change Password | `/dashboard/change-password` | `[NOT STARTED]` |

Update the Status column as each screen is completed.

---

## Component Architecture

### Naming convention

- Page-level components: `FooPage` — default export in `page.tsx`
- Shared components: `PascalCase.tsx` in `src/components/`
- Catalog-specific components: `src/components/catalog/`
- Auth-specific: `src/components/auth/`
- Layout components: `src/components/layout/`

### Component rules (from `client/CLAUDE.md`)

```tsx
// Props: single props param, inline type, never destructure in signature
export function EventCard(props: { event: Event; className?: string }) {
  return <div className={props.className}>...</div>
}

// Default to RSC. Only add "use client" if you need:
//   - Browser APIs (window, document)
//   - Event handlers (onClick, onChange — that can't be inlined)
//   - Client-only hooks (useState for ephemeral UI state)

// Wrap data-heavy RSC trees with Suspense + skeleton
<Suspense fallback={<EventCardSkeleton />}>
  <EventList category={params.path} />
</Suspense>
```

### Shared component inventory (to build)

| Component | Purpose | Used on |
|-----------|---------|---------|
| `Navbar` | Site navigation, search bar, auth links | All pages |
| `Footer` | Site footer | All pages |
| `EventCard` | Single event card with date, venue, price | Homepage, events listing |
| `ArtistCard` | Performer card with image and name | Homepage, artists listing |
| `VenueCard` | Venue card with location | Venues listing |
| `CategoryCard` | Category browse card | Homepage, categories |
| `CityCard` | City browse card with image | Homepage |
| `TicketListingRow` | Single ticket listing with price + buy button | Event detail |
| `SearchBar` | Unified search with suggest dropdown | Navbar, search page |
| `GiftCardForm` | Gift card purchase form | Gift cards page |
| `CheckoutSummary` | Pre-checkout ticket review | Checkout page |
| `ProceedToCheckoutButton` | The redirect trigger button | Checkout page |
| `UserDashboardLayout` | Sidebar + content layout for dashboard | Dashboard pages |
| `Skeleton variants` | Loading skeletons for each card type | Suspense fallbacks |

---

## Data Fetching Patterns

### Pattern 1: RSC direct fetch (most pages)

```tsx
// Server component — fetch on the server, no client JS needed
export default async function EventDetailPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);

  const event = await ApiClient.get<Event>(`/api/events/${id}`);

  return <EventDetailView event={event} />;
}
```

### Pattern 2: RSC with Suspense streaming (lists with many items)

```tsx
export default async function EventsPage(props: PageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <main>
      <Suspense fallback={<EventListSkeleton />}>
        <EventList />
      </Suspense>
    </main>
  );
}

async function EventList() {
  const events = await ApiClient.get<EventList>('/api/events');
  return events.items.map(e => <EventCard key={e.id} event={e} />);
}
```

### Pattern 3: URL search params for filters (not useState)

```tsx
// Filters live in the URL — shareable, bookmarkable, no client state
// /events?category=concerts&city=new-york&date=this-weekend

export default async function EventsPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; city?: string; date?: string }>;
}) {
  const { locale } = await props.params;
  const filters = await props.searchParams;
  setRequestLocale(locale);

  const events = await ApiClient.get<EventList>('/api/events', { params: filters });
  ...
}
```

### Pattern 4: Optimistic client interactions (ticket selection)

For interactions like "select a ticket row" that need instant feedback:

```tsx
"use client"

export function TicketListingRow(props: { ticket: Ticket }) {
  // Minimal local state for selected ticket — not shared globally
  const [selected, setSelected] = useState(false);
  ...
}
```

---

## Checkout Flow (Ticket Selection State)

Ticket selection state (which tickets the user chose) is stored in **URL search params**, not in local state or a global store. This allows the checkout page to be server-rendered and the URL to be shareable.

```
/checkout?eventId=12345&ticketId=67890&quantity=2
```

The checkout page reads these params as RSC props and renders the ticket summary. The "Proceed to Checkout" button builds the TicketNetwork redirect URL (Phase 7) by appending UTM params to the TN-provided base URL.

> **2026-08-16 update:** This custom `/checkout` review page is deprioritized. TicketNetwork's Seatics MapWidget3 (integrated on the event detail page, see `docs/superpowers/specs/2026-08-16-mapwidget3-integration-design.md`) owns ticket selection, its own pre-checkout screen, and the redirect to TN's hosted checkout directly. The `(checkout)/checkout/page.tsx` route described above stays undocumented-as-built unless a branded pre-widget step is wanted later.

---

## i18n Rules

All user-visible strings live in `src/locales/en.json`. Namespace convention:

| Page/Component | Namespace |
|---------------|-----------|
| Homepage sections | `HomePage` |
| Event detail | `EventDetailPage` |
| Artist detail | `ArtistDetailPage` |
| Venue detail | `VenueDetailPage` |
| Events listing | `EventsPage` |
| Checkout | `CheckoutPage` |
| Gift cards | `GiftCardsPage` |
| User dashboard | `DashboardPage` |
| Auth pages | `SignInPage`, `SignUpPage`, `ForgotPasswordPage` |
| Shared nav | `Navigation` |
| Shared footer | `Footer` |

Key naming: `snake_case`, context-specific — `card_title`, `meta_description`, `submit_button`, `error_required`.

---

## SEO Requirements

- Each catalog page (event, artist, venue, category) must export `generateMetadata` using real data from the API.
- Homepage has static metadata defined in `en.json`.
- All images use `next/image` with descriptive `alt` text.
- Canonical URLs are set correctly for paginated listing pages.
- `robots.ts` and `sitemap.ts` are already in the boilerplate — update `sitemap.ts` to include catalog routes.

---

## Performance Rules

- Default to RSC — do not add `"use client"` unless there is a specific, documented reason.
- All data-heavy sections wrapped in `<Suspense>` with a skeleton fallback.
- Images: always `next/image` with explicit `width`/`height` or `fill` + sized container.
- Heavy third-party scripts (analytics, GTM) loaded with `next/script` strategy `"lazyOnload"`.
- Code-split heavy client components with `dynamic(() => import(...), { ssr: false })`.

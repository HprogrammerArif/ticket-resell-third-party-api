# MapWidget3 Integration — Design Spec

**Date:** 2026-08-16
**Status:** Approved

---

## Goal

Replace the current price-range-only "Tickets" tab on the event detail page with TicketNetwork's Seatics MapWidget3 — a drop-in embed that shows the real interactive seat map, itemized ticket-group listings, its own pre-checkout interstitial, and hands off directly to TicketNetwork's hosted checkout.

## Background / Why

CatalogAPI only returns a price-range *summary* (`pricingInfo.lowPrice/averagePrice/highPrice`) — never real ticket groups or seat-level data (confirmed both in the original TN email thread and in practice, see `docs/convesation-i-had-with-ticketnetwork-as-developer.md`). TicketNetwork's answer to "how do we show real per-ticket pricing/availability" is not a JSON API — it's this embeddable widget (`docs/MapWidget3+Integration+Guide.pdf`), which owns ticket selection, its own pre-checkout screen, and redirects straight into TN's hosted checkout (matching the confirmed Private Label / Merchant-of-Record model — UTM params and GTM tags are supported natively by the widget's config).

This makes the custom `/checkout` review page originally planned for Phase 5 (Figma "Checkout process 1/2/3" screens) redundant for now — the widget already does that job. Phase 5's remaining scope shrinks to confirming/wiring real UTM parameter names with TN (still NDA-gated, same blocker as Phase 7).

**Known unknown:** our existing `websiteConfigId` (WCID 12498, currently used for CatalogAPI) is *not confirmed* to be valid for MapWidget3 — Maps configuration is described in the guide as its own thing, managed via a separate "Maps Configuration Management Tool" in TN Portal. This spec builds the integration against TN's public documentation example IDs (`eventId=203518`, `websiteConfigId=690`) as a placeholder, with a follow-up action to confirm the real value with TN before this can be considered fully verified in Sandbox.

## Architecture

The widget is a self-contained, self-rendering third-party UI — once its script loads into a container on the page, it manages its own state (map, filters, ticket list, quantity selection, pre-checkout, buy button) with no data flowing back through our backend. Our job is just to mount it correctly with the right `eventId` and config.

```
EventDetailPage (RSC)
  └─ EventDetailTabs (client) — existing tab shell, unchanged
       └─ Tickets tab content → MapWidgetEmbed (new client component)
            └─ next/script → https://mapwidget3-sandbox.seatics.com/js?eventId=<id>&websiteConfigId=<id>&useDarkTheme=true
                 └─ widget self-renders into its container; owns selection → precheckout → redirect to TN hosted checkout
```

## Component

New file: `client/src/components/catalog/MapWidgetEmbed.tsx` (`'use client'`)

- Props: `{ eventId: number }`
- Renders a container `<div>` (id used by the widget to mount) sized per TN's guidance (up to 1500px wide, ~900px recommended height, can flex smaller/larger)
- Loads the script via `next/script` with `strategy="afterInteractive"`, source URL built from:
  - Host: sandbox vs production, driven by `NODE_ENV` (mirrors the existing `Env.NODE_ENV === 'production'` pattern already used in `Auth.ts`)
  - `eventId` — from `props.eventId`
  - `websiteConfigId` — from `Env.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID`
  - `useDarkTheme=true` — matches the site's existing dark theme (brand red `#ea2a43` / surface `#0f0f0f`)
- No `useEffect`, no manual DOM script injection — `next/script` is the framework-native way to load a third-party script, consistent with `client/CLAUDE.md` §5.3's "always use next/image, next/font" spirit for third-party integrations
- Exact query-parameter assembly and any container markup nuance gets cross-checked against the guide's literal example snippet at implementation time — this is a mechanical detail, not a design branch

## Config (Env)

Add to `client/src/libs/Env.ts` under the `client` block (must be `NEXT_PUBLIC_`-prefixed — read client-side by the widget component):

```ts
client: {
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID: z.string(),
},
```

Add to `client/.env`:
```
# Placeholder — TN's public guide example value. NOT confirmed to be our real Maps website config ID.
# Follow up with TN (IntegrationSupport@ticketnetwork.com) to confirm whether WCID 12498 applies to
# MapWidget3, or obtain the correct value via the Maps Configuration Management Tool in TN Portal.
NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID=690
```

## Page Changes

`client/src/app/[locale]/(marketing)/events/[id]/page.tsx`:

- Delete the `TicketsTab` function entirely (price-range card, ticket breakdown grid, disabled CTA button — all superseded by the widget)
- Tickets tab now renders `<MapWidgetEmbed eventId={event.id} />` full-width
- Right sidebar: remove the price block (`lowPrice`/`highPrice` display) and the disabled "Get Tickets" button; sidebar keeps only the static quick-facts list (venue, date, country, category) that's already there
- `get_tickets` / `get_tickets_coming_soon` i18n keys in `EventDetailPage` namespace become unused — remove from `en.json` / `fr.json`

No other pages change. `LineupTab`, `VenueTab`, `FaqTab`, and `SimilarEvents` are untouched.

## Docs Impact

- `docs/project/06-frontend-spec.md` — add a note under "Checkout Flow (Ticket Selection State)" that the custom `/checkout` review page is deprioritized; MapWidget3 owns selection → precheckout → redirect. The `(checkout)/checkout/page.tsx` route stays undocumented-as-built until/unless a branded pre-widget step is wanted later.
- `docs/project/02-phases.md`:
  - Phase 2: mark the MapWidget3 gap resolved-pending-confirmation (real ticket listings now shown via the widget; `websiteConfigId` still needs TN's confirmation)
  - Phase 5: scope note — pre-checkout UI is now provided by the widget; remaining work is just confirming/wiring real UTM parameter names with TN once the NDA is signed (same blocker Phase 7 already has)
  - Feature Requests Log: update the 2026-08-16 MapWidget3 entry status from `[LOGGED]` to `[PLANNED]`

## Testing

No meaningful unit-test surface — this is a third-party embed with no data flowing through our code beyond the `eventId` prop. Verification is manual:
1. Browser smoke test using TN's public example IDs (`eventId=203518`, `websiteConfigId=690`) — confirms the embed mounts and renders inside our page layout without breaking the surrounding tab/sidebar UI
2. Repeat with a real Sandbox event ID from our own CatalogAPI data, still using the placeholder `websiteConfigId=690`, to confirm it at least attempts to render our real event
3. `npm run check:types` passes (new component, new env var)

Full end-to-end verification (real ticket groups rendering, checkout hand-off working) is blocked on TN confirming the correct `websiteConfigId` — logged as a follow-up, not part of this implementation's done criteria.

## Open Items (outside this spec's scope)

- Confirm with TN whether WCID 12498 is valid for MapWidget3, or obtain the correct Maps website config ID
- Custom stylesheet to reskin the widget beyond `useDarkTheme=true` toward exact brand colors (TN explicitly recommends this as a layered follow-up, not day-one)
- UTM parameter wiring and production checkout domain — still NDA-gated (Phase 7)

## Done Criteria

- `MapWidgetEmbed` component created and used in place of `TicketsTab`
- Widget renders (via smoke test) using TN's public example IDs
- Widget renders (via smoke test) using a real Sandbox event ID with the placeholder `websiteConfigId`
- Sidebar and tab content updated to remove now-redundant price/CTA UI
- Env var added following existing `Env.ts` conventions
- `docs/project/06-frontend-spec.md` and `02-phases.md` updated per Docs Impact above
- `npm run check:types` and `npm run lint` pass
- Follow-up question drafted (not sent — user's call) to email TN confirming the real `websiteConfigId`

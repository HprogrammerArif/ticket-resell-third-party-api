# MapWidget3 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the event detail page's price-range-only "Tickets" tab with TicketNetwork's Seatics MapWidget3 embed, which shows real ticket-group listings, an interactive seat map, and owns the pre-checkout → TN-hosted-checkout hand-off.

**Architecture:** A new client component (`MapWidgetEmbed`) loads TN's third-party script via Next.js's `next/script`, parameterized by `eventId` (from the already-fetched event) and a `websiteConfigId` env var. It replaces the existing custom `TicketsTab` and the sidebar's price/CTA block on the event detail page. No backend changes — this is a pure frontend embed with no data flowing through our API.

**Tech Stack:** Next.js 16 App Router (`next/script`), TypeScript strict mode, next-intl, `@t3-oss/env-nextjs`.

**Spec:** `docs/superpowers/specs/2026-08-16-mapwidget3-integration-design.md`

## Global Constraints

- Named exports everywhere except Next.js page/layout/error files
- Props: single `props` parameter, no destructuring in the function signature
- No `useMemo`, `useCallback`, no manual `useEffect` DOM manipulation — use `next/script` for third-party script loading
- All env access through `client/src/libs/Env.ts` — never `process.env` directly elsewhere
- All user-visible strings in `en.json` / `fr.json` — remove i18n keys that become unused, never leave orphaned keys
- TypeScript strict mode — no `any`
- `websiteConfigId` default value is `690` (TicketNetwork's public guide example) — this is a known placeholder, not our confirmed value. Do not treat it as real production config.

---

### Task 1: MapWidget3 config env var + `MapWidgetEmbed` component

**Files:**
- Modify: `client/src/libs/Env.ts`
- Modify: `client/.env`
- Create: `client/src/components/catalog/MapWidgetEmbed.tsx`

**Interfaces:**
- Consumes: `Env` from `@/libs/Env` (adds `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID: string`, reads existing `Env.NODE_ENV`)
- Produces: `MapWidgetEmbed(props: { eventId: number }): JSX.Element` — exported from `client/src/components/catalog/MapWidgetEmbed.tsx`, consumed by Task 2

- [ ] **Step 1: Add the env var to `Env.ts`**

Replace the entire contents of `client/src/libs/Env.ts`:

```ts
import { createEnv } from '@t3-oss/env-nextjs';
import * as z from 'zod';

export const Env = createEnv({
  server: {
    BACKEND_API_URL: z.string().optional(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID: z.string(),
  },
  shared: {
    NODE_ENV: z.enum(['test', 'development', 'production']).optional(),
  },
  runtimeEnv: {
    BACKEND_API_URL: process.env.BACKEND_API_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID: process.env.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID,
    NODE_ENV: process.env.NODE_ENV,
  },
});
```

- [ ] **Step 2: Add the env var value to `client/.env`**

Append to the end of `client/.env`:

```
# TicketNetwork MapWidget3 — placeholder value from TN's public integration guide (docs/MapWidget3+Integration+Guide.pdf).
# NOT confirmed to be our real Maps website config ID (Maps config is separate from CatalogAPI's WCID 12498).
# Follow up with TN (IntegrationSupport@ticketnetwork.com) to confirm before treating Sandbox results as real.
NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID=690
```

- [ ] **Step 3: Create the `MapWidgetEmbed` component**

Create `client/src/components/catalog/MapWidgetEmbed.tsx`:

```tsx
'use client';

import Script from 'next/script';
import { Env } from '@/libs/Env';

type MapWidgetEmbedProps = {
  eventId: number;
};

const MAPWIDGET_HOST = Env.NODE_ENV === 'production'
  ? 'https://mapwidget3.seatics.com'
  : 'https://mapwidget3-sandbox.seatics.com';

export function MapWidgetEmbed(props: MapWidgetEmbedProps) {
  const src = `${MAPWIDGET_HOST}/js?eventId=${props.eventId}&websiteConfigId=${Env.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID}&useDarkTheme=true`;

  return (
    <div className="mx-auto min-h-[900px] w-full max-w-[1500px]">
      {/* TicketNetwork's Seatics MapWidget3 self-renders into this container once its script loads. */}
      <div id="tn-mapwidget-container" />
      <Script src={src} strategy="afterInteractive" />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
cd client
npm run check:types
```

Expected: 0 new type errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/libs/Env.ts client/.env client/src/components/catalog/MapWidgetEmbed.tsx
git commit -m "feat: add MapWidget3 config env var and embed component"
```

---

### Task 2: Wire `MapWidgetEmbed` into the event detail page

**Files:**
- Modify: `client/src/app/[locale]/(marketing)/events/[id]/page.tsx`
- Modify: `client/src/locales/en.json`
- Modify: `client/src/locales/fr.json`

**Interfaces:**
- Consumes: `MapWidgetEmbed` from `@/components/catalog/MapWidgetEmbed` (Task 1)

- [ ] **Step 1: Add the import**

In `client/src/app/[locale]/(marketing)/events/[id]/page.tsx`, add to the top import block (after the `EventDetailTabs` import):

```ts
import { MapWidgetEmbed } from '@/components/catalog/MapWidgetEmbed';
```

- [ ] **Step 2: Delete the `TicketsTab` function**

Delete the entire `TicketsTab` function — everything from:

```ts
// ─── Tab: Tickets ─────────────────────────────────────────────────────────────

function TicketsTab(props: { event: TnEvent }) {
```

through its closing `}` (the block immediately before the `// ─── Tab: Lineup ──` comment). This removes the custom price-range card, ticket breakdown grid, and disabled "Get Tickets" button — all superseded by the widget.

- [ ] **Step 3: Replace the tab usage**

In the `EventDetailTabs` children, replace:

```tsx
            <TicketsTab event={event} />
```

with:

```tsx
            <MapWidgetEmbed eventId={event.id} />
```

- [ ] **Step 4: Remove the now-unused `lowPrice`/`highPrice` derived variables**

In the `EventDetailPage` function's "Derived data" section, delete these two lines (they were only used by the sidebar price block being removed in Step 5 — `hasTickets` and `ticketCount` stay, they're still used by the "Selling Fast" hero badge):

```ts
  const lowPrice = event.pricingInfo?.lowPrice?.value;
  const highPrice = event.pricingInfo?.highPrice?.value;
```

- [ ] **Step 5: Simplify the sidebar**

Replace this block (the sidebar's price display, ticket count, and disabled CTA button):

```tsx
            {/* Price */}
            {lowPrice !== undefined ? (
              <div className="mb-2">
                <p className="text-[28px] font-bold text-white">
                  From ${lowPrice.toFixed(0)}
                </p>
                {highPrice !== undefined && highPrice !== lowPrice && (
                  <p className="text-[13px] text-[var(--color-text-muted)]">
                    up to ${highPrice.toFixed(0)}
                  </p>
                )}
              </div>
            ) : (
              <p className="mb-2 text-[18px] font-semibold text-white">
                {hasTickets ? 'Tickets Available' : 'Coming Soon'}
              </p>
            )}

            {/* Ticket count */}
            {ticketCount > 0 && (
              <p className="mb-5 text-[13px] text-[var(--color-text-muted)]">
                {ticketCount.toLocaleString()} tickets available
              </p>
            )}

            <button
              type="button"
              disabled
              aria-label={t('get_tickets_coming_soon')}
              className="mb-5 w-full cursor-not-allowed rounded-full bg-[var(--color-brand)] py-3.5 text-[16px] font-semibold text-white opacity-60"
            >
              {t('get_tickets')}
            </button>

            {/* Quick facts */}
            <div className="space-y-3 border-t border-[var(--color-surface-border)] pt-5">
```

with:

```tsx
            {/* Quick facts */}
            <div className="space-y-3">
```

(The rest of the quick-facts block — venue, date, country, category items and their closing tags — stays exactly as-is; only the opening `<div>` line above it changes, since it's now the first thing in the card instead of following a border.)

- [ ] **Step 6: Remove the now-unused i18n keys**

In `client/src/locales/en.json`, inside the `EventDetailPage` namespace, delete these two lines:

```json
    "get_tickets": "Get Tickets",
    "get_tickets_coming_soon": "Get Tickets — coming soon",
```

In `client/src/locales/fr.json`, inside the `EventDetailPage` namespace, delete these two lines:

```json
    "get_tickets": "Obtenir des billets",
    "get_tickets_coming_soon": "Obtenir des billets — bientôt disponible",
```

- [ ] **Step 7: Type-check and lint**

```bash
cd client
npm run check:types
```

Expected: 0 new type errors (confirms `lowPrice`/`highPrice`/`TicketsTab` removal didn't leave dangling references).

```bash
cd client
npm run check:i18n
```

Expected: passes — confirms no code still references the removed `get_tickets` / `get_tickets_coming_soon` keys.

```bash
cd client
npm run lint
```

Expected: no new lint violations above the pre-existing baseline.

- [ ] **Step 8: Commit**

```bash
git add "client/src/app/[locale]/(marketing)/events/[id]/page.tsx" client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: replace TicketsTab price summary with MapWidget3 embed on event detail page"
```

---

### Task 3: Manual verification (smoke test)

This is a third-party embed with no unit-test surface (per the design spec's Testing section) — verification is manual, in a browser.

**Files:** None (no code changes — this task is a checkpoint).

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify with TN's public example IDs**

Temporarily set `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID=690` in `client/.env` (it already defaults to this from Task 1). Visit any event detail page, e.g. `http://localhost:3000/en/events/1` (use any real event `id` returned by your Sandbox CatalogAPI data — check the events listing page at `http://localhost:3000/en/events` for a valid id).

In the browser dev tools console, confirm:
- No JavaScript errors thrown by the injected `<script src="https://mapwidget3-sandbox.seatics.com/js?...">`
- The `#tn-mapwidget-container` div is present in the DOM (inspect element)
- Some widget UI attempts to render inside/near that container (it may show a "no map available" or similar TN-side message since `eventId` won't match `websiteConfigId=690`'s own event catalog — that's expected and not a failure of this task, since we're using TN's generic public example config, not a real matched pair)

- [ ] **Step 3: Check for `document.write`-related console warnings**

Some third-party widget SDKs from this era use `document.write`, which modern browsers restrict when the script is injected asynchronously (as `next/script` with `strategy="afterInteractive"` does). If the console shows a warning like "Failed to execute 'write' on 'Document'" or the widget silently fails to render anything at all (not even an error state), note this in the task's completion notes — it would mean switching to `strategy="beforeInteractive"` or investigating TN's HTML endpoint instead. Do not silently work around this without flagging it — it changes Task 1's implementation.

- [ ] **Step 4: Confirm the rest of the page still works**

Confirm the other tabs (Lineup, Venue, FAQ) still render correctly, the page doesn't crash, and the sidebar shows only venue/date/country/category (no price or button).

- [ ] **Step 5: Note follow-up for the user**

This task does not require the widget to fully render real ticket data — that depends on TN confirming the real `websiteConfigId` (tracked as an Open Item in the spec, not something code can resolve). Record in your task summary whether the embed mounted cleanly (no console errors, container present) — that's the actual pass/fail bar for this task.

---

### Task 4: Documentation updates

**Files:**
- Modify: `docs/project/06-frontend-spec.md`
- Modify: `docs/project/02-phases.md`
- Modify: `docs/project/CHANGELOG.md`

- [ ] **Step 1: Update the frontend spec's Checkout Flow section**

In `docs/project/06-frontend-spec.md`, find the `## Checkout Flow (Ticket Selection State)` section. Immediately after its existing paragraph (the one ending "...appending UTM params to the TN-provided base URL."), add:

```markdown

> **2026-08-16 update:** This custom `/checkout` review page is deprioritized. TicketNetwork's Seatics MapWidget3 (integrated on the event detail page, see `docs/superpowers/specs/2026-08-16-mapwidget3-integration-design.md`) owns ticket selection, its own pre-checkout screen, and the redirect to TN's hosted checkout directly. The `(checkout)/checkout/page.tsx` route described above stays undocumented-as-built unless a branded pre-widget step is wanted later.
```

- [ ] **Step 2: Update Phase 5 in `02-phases.md`**

In `docs/project/02-phases.md`, find the `## Phase 5 — Pre-Checkout UI` section. Immediately after the `**Goal:**` line, add:

```markdown

> **2026-08-16 update:** MapWidget3 (see Phase 2 note above) now provides ticket selection and its own pre-checkout screen directly — see `docs/superpowers/specs/2026-08-16-mapwidget3-integration-design.md`. The custom `/checkout` review page and its engineering tasks below are deprioritized. Remaining scope: confirm/wire real UTM parameter names with TN once the NDA is signed (same blocker as Phase 7).
```

Then, in that same Phase 5 section's "Engineering tasks" list, append `— superseded by MapWidget3` to each of these three existing lines (do not check them off — they weren't done, they're no longer needed in their original form):

```markdown
- [ ] Frontend: cart/order review page (`/checkout`) matching Figma checkout screens — superseded by MapWidget3
- [ ] Frontend: ticket selection state (URL params or session — prefer URL params for shareability) — superseded by MapWidget3
- [ ] Frontend: Figma checkout process screens implemented (Checkout process 1, 2, 3 from Figma) — superseded by MapWidget3
```

- [ ] **Step 3: Update the Feature Requests Log status**

In `docs/project/02-phases.md`, find the Feature Requests Log table row added on 2026-08-16 for MapWidget3. Change its Status column from `[LOGGED]` to `[PLANNED]`.

- [ ] **Step 4: Add a CHANGELOG entry**

In `docs/project/CHANGELOG.md`, add a new entry at the top (after the `# Changelog` header and its description, before the most recent existing entry):

```markdown
## 2026-08-16 — MapWidget3 integrated on event detail page

- Replaced the custom price-range-only "Tickets" tab with TicketNetwork's Seatics MapWidget3 embed (`MapWidgetEmbed` component), which shows real ticket-group listings, an interactive seat map, and owns the pre-checkout → TN-hosted-checkout hand-off
- Sidebar simplified to static event facts only (price/CTA removed — the widget now owns that)
- New env var `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` (placeholder value `690` from TN's public guide — not yet confirmed as our real Maps config ID)
- Updated `06-frontend-spec.md` and Phase 5 in `02-phases.md`: the custom `/checkout` review page is deprioritized since the widget now owns that flow
- Follow-up: confirm the real `websiteConfigId` with TicketNetwork before treating this as fully verified
```

- [ ] **Step 5: Commit**

```bash
git add docs/project/06-frontend-spec.md docs/project/02-phases.md docs/project/CHANGELOG.md
git commit -m "docs: update frontend spec and phase tracking for MapWidget3 integration"
```

---

## Self-Review

### 1. Spec Coverage

| Spec requirement | Task |
|---|---|
| `MapWidgetEmbed` component using `next/script` | Task 1 |
| `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` env var, placeholder `690` | Task 1 |
| Dark theme param | Task 1 |
| Sandbox vs production host by `NODE_ENV` | Task 1 |
| `TicketsTab` deleted, widget replaces it full-width | Task 2 |
| Sidebar price/CTA removed, static facts kept | Task 2 |
| Unused i18n keys removed | Task 2 |
| Manual smoke test (public example IDs, then real Sandbox event id) | Task 3 |
| `06-frontend-spec.md` checkout flow note | Task 4 |
| `02-phases.md` Phase 5 scope note + Feature Requests Log status update | Task 4 |
| `npm run check:types` / `npm run lint` pass | Tasks 1, 2 |

### 2. Placeholder Scan

No TBDs, TODOs, or "implement later" markers — the `websiteConfigId=690` value is an intentional, spec-approved placeholder with an explicit follow-up, not an unfinished plan step.

### 3. Type Consistency

- `MapWidgetEmbed(props: { eventId: number })` in Task 1 matches the call site `<MapWidgetEmbed eventId={event.id} />` in Task 2 (`event.id` is `TnEvent['id']`, a `number`, per existing usage elsewhere in the same file, e.g. `currentId: number` in `SimilarEvents`)
- `Env.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` declared in Task 1's `Env.ts` edit is the same name used in Task 1's component and nowhere else

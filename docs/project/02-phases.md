# 02 — Phases & Build Plan

**Last Updated:** 2026-08-16

---

## Documentation-First Rule

> Before any phase begins: documentation must be written, implementation plan must be approved.
> Before any feature is coded: it must appear in this file and have a design doc in `docs/superpowers/specs/`.

---

## Phase Status Overview

| Phase | Name | Status | Blocker |
|-------|------|--------|---------|
| 0 | Repo & Environment Setup | `[DONE]` | — |
| 1 | Express Backend — TicketNetwork Integration | `[DONE]` | — |
| 2 | Next.js Frontend — Figma Implementation | `[NEEDS REVIEW]` | MapWidget3 (seat map + real ticket groups) is integrated, see note below — real `websiteConfigId` still unconfirmed with TicketNetwork |
| 3 | User Account System | `[DONE]` | — |
| 4 | Gift Card System | `[NOT STARTED]` | Open business questions below |
| 5 | Pre-Checkout UI | `[NOT STARTED]` | — |
| 6 | Admin Dashboard Shell (Steven) | `[NOT STARTED]` | — |
| 7 | Wire Checkout Redirect | `[NOT STARTED]` | `[BLOCKED: NDA not signed]` |
| 8 | Production Deployment | `[NOT STARTED]` | Phases 1–7 complete |

---

## Phase 0 — Repo & Environment Setup

**Status:** `[DONE]`
**Goal:** Both the frontend and backend are runnable locally, connected to each other, with a real Postgres database and all tooling in place.

### Business tasks
- [ ] Decide on hosting provider for production (e.g., Railway, Render, Vercel + Railway)
- [ ] Set up a GitHub repository (or confirm existing one)
- [ ] Register a domain for Ticket Love [OPEN]
- [ ] Decide on Sentry org/project for error tracking
- [ ] Purchase/confirm SSL certificate strategy (usually handled by host)

### Engineering tasks
- [x] Scaffold the Express backend in `server/` with TypeScript
  - `package.json`, `tsconfig.json`, `.env`, `.gitignore`
  - Health check endpoint: `GET /health`
- [x] Write `server/CLAUDE.md` (see `04-ai-tooling.md` for content guidelines)
- [x] Set up Prisma in `server/` — schema, initial migration, seed script
- [x] Connect frontend (`client/`) to backend via `BACKEND_API_URL` env var
- [x] Confirm `client/` Drizzle is disabled/ignored (Mode 2 — frontend never touches DB)
- [x] Set up `.env` files for both client and server (never commit secrets)
- [x] Verify `npm run dev` starts both services concurrently
- [ ] Set up Sentry for both client and server (deferred to Phase 2)
- [x] Set up a `concurrently` script at root to run both services

### Done criteria
- [x] `GET /health` returns 200 from Express
- [x] Next.js homepage loads and calls backend successfully (BACKEND_API_URL wired)
- [x] Prisma migrations applied, DB schema matches `05-backend-spec.md`
- [x] No secrets in git history

---

## Phase 1 — Express Backend: TicketNetwork Integration

**Status:** `[DONE]`
**Goal:** The backend can authenticate with TicketNetwork, cache/refresh tokens correctly, and expose typed wrapper functions for every CatalogAPI endpoint.

### Business tasks
- [ ] Confirm TicketNetwork Sandbox credentials are available in `.env`
- [ ] Confirm WCID (12498) is still valid

### Engineering tasks
- [ ] Implement `src/modules/ticketnetwork/auth.ts`
  - `fetchToken()` — OAuth2 Client Credentials flow
  - `getToken()` — returns cached token, refreshes if within 2 min of expiry
  - `scheduleRefresh()` — background timer
  - `revokeToken()` — for forced invalidation
- [ ] Implement `src/modules/ticketnetwork/client.ts`
  - Low-level HTTP wrapper with automatic Bearer token injection
  - Automatic retry on `401 / fault code 900901`
  - Rate limit awareness (respect 60 req/min)
- [ ] Implement `src/modules/ticketnetwork/catalog.ts`
  - Typed function for every CatalogAPI endpoint (categories, events, performers, venues, cities, search, etc.)
  - All functions accept typed params, return typed responses
- [ ] Expose routes in `src/routes/` so the Next.js frontend can call them
  - `GET /api/categories`
  - `GET /api/categories/:path`
  - `GET /api/events`
  - `GET /api/events/:id`
  - `GET /api/events/search`
  - `GET /api/performers`
  - `GET /api/performers/:id`
  - `GET /api/venues`
  - `GET /api/venues/:id`
  - `GET /api/search/suggest`
- [ ] Add rate limiting middleware to all routes
- [ ] Write unit tests for token lifecycle (fetch, cache, refresh, retry on 401)
- [ ] Write integration tests for at least one CatalogAPI endpoint (categories)

### Done criteria
- [ ] Token is cached and reused across requests (not regenerated per request)
- [ ] Token refreshes proactively before expiry (not on 401)
- [ ] A 401 with fault code 900901 triggers one retry with a new token
- [ ] All catalog routes return real TicketNetwork Sandbox data
- [ ] No Consumer Key or Secret ever appears in logs or responses
- [ ] Tests pass

---

## Phase 2 — Next.js Frontend: Figma Implementation

**Status:** `[NEEDS REVIEW]`
**Goal:** Every page in the Figma design is implemented as a real Next.js page pulling live data from the backend. The site looks and behaves exactly as designed.

**Figma source of truth:** https://www.figma.com/design/O1FzG0lsNLxynQw8oqqIhZ/Ticket-Love?node-id=0-1&m=dev

> **2026-08-16 finding (resolved — see 2026-08-16 update below):** TicketNetwork support confirmed (see `docs/MapWidget3+Integration+Guide.pdf`) that CatalogAPI alone only returns a price-range *summary* (`pricingInfo.lowPrice/avgPrice/highPrice`) — it does not return the individual ticket groups or seat map needed for a real "select your seats" experience. That requires embedding TicketNetwork's **Seatics MapWidget3** (`mapwidget3-sandbox.seatics.com`), which handles the interactive seat map, itemized ticket listing, pre-checkout interstitial, and initial checkout hand-off (with UTM/promo config built in) as a drop-in widget. This directly affects the current event detail page (`events/[id]/page.tsx`, `TicketsTab`) and overlaps significantly with Phase 5 (Pre-Checkout UI) and Phase 7 (Checkout Redirect) scope.
>
> **2026-08-16 update:** implemented. The old price-range-only `TicketsTab` was replaced with the `MapWidgetEmbed` component, which embeds MapWidget3 directly on the event detail page — see `docs/superpowers/specs/2026-08-16-mapwidget3-integration-design.md` for the design doc and `docs/project/CHANGELOG.md` for the implementation record. **Still open:** our real `websiteConfigId` has not been confirmed with TicketNetwork for MapWidget3 (the implementation uses TN's public placeholder value) — this integration should not be promoted to production until that's confirmed and the checkout hand-off behavior is verified on HTTPS.

### Business tasks
- [ ] Review the Figma design with Steven and confirm no changes are needed before implementation begins
- [ ] Confirm brand colours, fonts, and logo files with Steven
- [ ] Decide on the i18n languages needed (currently English + French in template — confirm with Steven)

### Engineering tasks
- [x] Replace boilerplate homepage with real Ticket Love homepage (hero, categories, events this weekend, popular artists, browse by city, gift card promo, how it works, footer)
- [x] Implement category browsing page (`/categories/[path]`)
- [x] Implement events listing page (`/events`) with filters (date, city, category)
- [x] Implement event detail page (`/events/[id]`) with ticket listings — *now via MapWidget3 embed, see note above*
- [x] Implement artist/performer listing page (`/artists`)
- [x] Implement artist detail page (`/artists/[id]`)
- [x] Implement venue listing page (`/venues`)
- [x] Implement venue detail page (`/venues/[id]`)
- [x] Implement search results page (`/search`)
- [x] Update navigation to match Figma
- [x] Update footer to match Figma
- [x] All pages must be responsive (mobile, tablet, desktop)
- [x] All user-visible strings in `src/locales/en.json`
- [x] All pages use RSC + Suspense + skeleton fallbacks
- [x] Use Figma MCP to pull component specs during implementation (see `04-ai-tooling.md`)

### Done criteria
- [x] All Figma screens are implemented — visual parity confirmed by side-by-side comparison
- [x] All pages load real TicketNetwork Sandbox data
- [x] No hard-coded user-visible strings
- [x] Responsive at all breakpoints
- [x] `npm run lint` and `npm run check:types` pass
- [x] Real ticket groups/seat map on event detail page (MapWidget3 embedded — new since original scope; real `websiteConfigId` still unconfirmed with TicketNetwork, see note above)

---

## Phase 3 — User Account System

**Status:** `[DONE]`
**Goal:** End users can create an account, sign in, view their profile, and change their password. Auth is session-based.

### Business tasks
- [ ] Decide on email provider for transactional emails (welcome email, password reset) — e.g., Resend, Postmark
- [ ] Confirm with Steven whether social login (Google, etc.) is needed for MVP

### Engineering tasks
- [x] Backend: user registration endpoint (`POST /api/auth/register`)
- [x] Backend: login endpoint (`POST /api/auth/login`) — returns session cookie
- [x] Backend: logout endpoint (`POST /api/auth/logout`)
- [x] Backend: get current user (`GET /api/auth/me`)
- [x] Backend: password change endpoint (`PUT /api/auth/password`)
- [ ] Backend: password reset flow (email link) — deferred, no email provider decided yet
- [x] Frontend: sign-up page (already scaffolded — wire to real backend)
- [x] Frontend: sign-in page (already scaffolded — wire to real backend)
- [x] Frontend: user dashboard pages (match Figma user dashboard screens)
- [x] Frontend: change password page (Figma screen exists)
- [x] Frontend: forgot password page (Figma screen exists) — stub only, real reset flow deferred with backend above
- [x] Route protection: middleware already in `client/src/proxy.ts`, confirm it works with real auth

### Done criteria
- [x] User can register, sign in, view dashboard, change password
- [x] Protected routes redirect to sign-in when unauthenticated
- [x] Sessions expire and re-authentication is required (7-day JWT)
- [x] Passwords are hashed (bcrypt, 12 rounds), never stored in plain text
- [x] Tests pass for auth endpoints
- [ ] Delete-account endpoint also shipped (`DELETE /api/auth/account`) — beyond original scope, not yet reflected above

---

## Phase 4 — Gift Card System

**Status:** `[NOT STARTED]`
**Goal:** Steven (or admin) can issue gift cards. Users can purchase and redeem gift cards on non-ticket features of the site.

### Business tasks
- [ ] Confirm with Steven: who can issue gift cards — admin only, or can they be purchased by users?
- [ ] Confirm gift card denominations (fixed amounts? custom?)
- [ ] Confirm expiry policy
- [ ] Confirm what gift cards can be redeemed for (currently: non-ticket purchases only — confirm with Steven)
- [ ] [OPEN] Can gift cards be applied toward TicketNetwork-hosted checkout? (Almost certainly no — TN owns that page)

### Engineering tasks
- [ ] Prisma: `gift_cards` and `gift_card_redemptions` tables (see `05-backend-spec.md`)
- [ ] Backend: generate gift card endpoint (admin only)
- [ ] Backend: check gift card balance (`GET /api/gift-cards/:code`)
- [ ] Backend: redeem gift card (`POST /api/gift-cards/redeem`)
- [ ] Frontend: gift card purchase page (match Figma gift card screens)
- [ ] Frontend: gift card balance check UI
- [ ] Frontend: redemption flow at checkout (on our site, not TN's page)
- [ ] Admin: gift card management UI for Steven

### Done criteria
- [ ] Gift cards can be issued and redeemed
- [ ] Balance tracking is accurate
- [ ] Expired cards are rejected
- [ ] Already-redeemed cards are rejected
- [ ] Tests pass for gift card logic

---

## Phase 5 — Pre-Checkout UI

**Status:** `[NOT STARTED]`
**Goal:** Users can review their selected tickets and reach a polished handoff page before being redirected to TicketNetwork's checkout. UTM/GTM scaffolding is in place.

> **2026-08-16 update:** MapWidget3 (see Phase 2 note above) now provides ticket selection and its own pre-checkout screen directly — see `docs/superpowers/specs/2026-08-16-mapwidget3-integration-design.md`. The custom `/checkout` review page and its engineering tasks below are deprioritized. Remaining scope: confirm/wire real UTM parameter names with TN once the NDA is signed (same blocker as Phase 7).

### Business tasks
- [ ] Confirm with Steven what should appear on the pre-checkout review page (ticket summary, pricing, fees disclosure)
- [ ] Confirm disclaimer text for TicketNetwork redirect (users need to know they're leaving the site)
- [ ] `[OPEN]` Get UTM parameter names/format from TicketNetwork (after NDA)
- [ ] `[OPEN]` Get GTM tag specs from TicketNetwork (after NDA)

### Engineering tasks
- [ ] Frontend: cart/order review page (`/checkout`) matching Figma checkout screens — superseded by MapWidget3
- [ ] Frontend: ticket selection state (URL params or session — prefer URL params for shareability) — superseded by MapWidget3
- [ ] Frontend: "Proceed to Checkout" button — currently renders as disabled/placeholder; wires to real URL in Phase 7
- [ ] Backend: UTM parameter builder (builds the redirect URL with correct params once specs are known)
- [ ] Frontend: GTM dataLayer push on "Proceed to Checkout" click
- [ ] Frontend: Figma checkout process screens implemented (Checkout process 1, 2, 3 from Figma) — superseded by MapWidget3

### Done criteria
- [ ] Pre-checkout page renders correctly with ticket details
- [ ] "Proceed to Checkout" button exists (placeholder for Phase 7)
- [ ] UTM scaffolding function is in place (values wired in Phase 7)
- [ ] GTM event fires on button click (event name confirmed in Phase 7)
- [ ] Matches Figma checkout designs

---

## Phase 6 — Admin Dashboard Shell (Steven)

**Status:** `[NOT STARTED]`
**Goal:** Steven can log in to an admin area on Ticket Love and access TicketNetwork's sales reporting dashboard from there.

### Business tasks
- [ ] Confirm with Steven: does he want an embedded iframe of TN's dashboard, or just a styled link that opens it?
- [ ] Confirm whether Steven's TN reporting access is per-account (he logs into TN directly) or relayed through us
- [ ] Confirm what other admin capabilities Steven needs: gift card management, user lookup, content management?

### Engineering tasks
- [ ] Prisma: `admin_users` table with role column
- [ ] Backend: admin auth endpoints (separate from user auth, or role-based on same user table)
- [ ] Backend: admin middleware (protect all `/api/admin/*` routes)
- [ ] Frontend: admin dashboard layout (protected at `/admin`)
- [ ] Frontend: TicketNetwork reporting dashboard link/embed (match Figma user dashboard screens for admin variant)
- [ ] Frontend: gift card management UI (tied into Phase 4)
- [ ] Frontend: basic user list for Steven

### Done criteria
- [ ] Steven can log in with admin credentials
- [ ] Steven can access the TN reporting dashboard link/embed
- [ ] Non-admin users cannot access `/admin` routes
- [ ] Gift card management is functional from admin panel

---

## Phase 7 — Wire Checkout Redirect

**Status:** `[NOT STARTED]`
**Blocker:** `[BLOCKED: NDA with TicketNetwork not yet signed. Email Ian Schultz at IntegrationSupport@ticketnetwork.com to begin.]`

**Goal:** The "Proceed to Checkout" button redirects to TicketNetwork's hosted checkout page with correct UTM parameters and GTM attribution, fully tested in Sandbox.

### Business tasks
- [ ] Sign NDA with TicketNetwork
- [ ] Obtain Sandbox checkout access credentials/URL
- [ ] Confirm UTM parameter names/format with TN
- [ ] Confirm GTM tag specs with TN
- [ ] Test a full end-to-end purchase in Sandbox with Steven

### Engineering tasks
- [ ] Wire the real TicketNetwork hosted checkout URL into the "Proceed to Checkout" button
- [ ] Fill in UTM parameter names in the UTM builder (built in Phase 5)
- [ ] Confirm and activate GTM event names (built in Phase 5)
- [ ] Test full flow: browse → select tickets → review → redirect → TN checkout → confirmation email
- [ ] Verify TN order confirmation email is white-labeled with Ticket Love branding
- [ ] Verify commission attribution is working in TN's reporting dashboard

### Done criteria
- [ ] End-to-end purchase in Sandbox works
- [ ] Order confirmation email white-labels to Ticket Love
- [ ] UTM attribution shows correctly in TN's dashboard
- [ ] GTM events fire correctly and are visible in GTM preview

---

## Phase 8 — Production Deployment

**Status:** `[NOT STARTED]`
**Goal:** Ticket Love is live in production, monitored, and stable.

### Business tasks
- [ ] Confirm production hosting choice
- [ ] Confirm domain and SSL
- [ ] Confirm with TicketNetwork: request Production API access (confirm NDA covers production or if separate)
- [ ] Agree on go-live date with Steven
- [ ] Confirm backup/recovery strategy with Steven

### Engineering tasks
- [ ] Set up production environment variables (separate from Sandbox)
- [ ] Configure production Postgres database
- [ ] Configure production Sentry project
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Set up health check monitoring (e.g., Better Uptime)
- [ ] Run full regression test in production before announcing go-live
- [ ] Set up database backup schedule

### Done criteria
- [ ] Site is live and accessible at the production domain
- [ ] All Sandbox credentials replaced with Production credentials
- [ ] Sentry receiving events from production
- [ ] CI/CD pipeline passing
- [ ] Steven has confirmed the site is acceptable for launch

---

## Feature Requests Log

This table tracks all feature requests that come in after the initial build plan was set. Log every request here first before doing any design or coding work.

| Date | Requested By | Feature Description | Status | Target Phase |
|------|-------------|---------------------|--------|-------------|
| 2026-08-16 | TicketNetwork support | Integrate Seatics MapWidget3 for real ticket-group listings + interactive seat map on event detail pages (CatalogAPI alone only returns a price-range summary) — see `docs/MapWidget3+Integration+Guide.pdf` | `[DONE]` | Phase 2 (event detail), overlaps Phase 5/7 |

### How to add a feature request

1. Add a row to the table above with today's date.
2. Set status to `[LOGGED]`.
3. Run `/brainstorming` in Claude Code to produce a design doc.
4. Update status to `[DESIGNING]`, then `[PLANNED]`, then `[IN PROGRESS]`, then `[DONE]`.
5. Assign it to a phase or create a new one.

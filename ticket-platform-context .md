# Ticket Reselling Platform — Full Project Context & Build Prompt

Use this document as the seed context/prompt when starting the project in a new IDE/agent. It contains the business model, architecture decisions, API integration details already validated, open items, and a phased build order.

---

## 1. Project Summary

Building a ticket reselling website for a client (**Steven**), a third-party ticket reseller. The site will:

- Display venues, events, categories, and performers sourced from **TicketNetwork's CatalogAPI**.
- Redirect users to **TicketNetwork's hosted "Private Label" checkout**, who acts as **Merchant of Record** (they collect payment, handle fulfillment/delivery/chargebacks/fraud).
- Steven earns a **markup-based commission**: sets his own markup over TicketNetwork's wholesale price, TicketNetwork retains 7.5% of wholesale, Steven earns the rest.
- Commission/sales visibility comes via a dashboard TicketNetwork grants access to — not data our backend owns.
- The site will also support **gift cards** as a payment/incentive mechanism (likely limited to non-ticket purchases, since checkout for tickets is entirely TicketNetwork's hosted page; see Open Questions).
- A **Figma UI design is already complete** and should be treated as the source of truth for frontend implementation.

---

## 2. Confirmed Tech Stack

- **Frontend:** Next.js
- **Backend:** Express (Node.js)
- **Database:** PostgreSQL
- **Third-party integration:** TicketNetwork CatalogAPI (confirmed working) + redirect to TicketNetwork's hosted Private Label checkout. Mercury API confirmed NOT needed for this project.

---

## 3. Business Model (CONFIRMED by TicketNetwork, Aug 11 2026)

This is TicketNetwork's **"Private Label" program** — a hybrid model, confirmed directly by their integration team (Ian Schultz):

1. User browses catalog data (venues, events, categories, performers) on our site, sourced from TicketNetwork's CatalogAPI.
2. At checkout, the user is **redirected** to a TicketNetwork-hosted checkout page (NOT an embeddable/themeable widget — confirmed it cannot visually match our site design beyond passing UTM params and GTM tags for tracking/attribution).
3. TicketNetwork is Merchant of Record on that hosted page — they own payment processing, chargebacks, fraud review, and fulfillment/delivery. Order confirmation + email receipt go directly to the customer, white-labeled to our brand. We receive NO order-status data back on our side — nothing to track post-checkout.
4. **Pricing/commission works on a markup basis, not a flat commission:** all inventory is available to us at wholesale rate. We (Steven) choose the markup. TicketNetwork retains 7.5% of the wholesale rate; we earn the rest as commission.
   Example: Wholesale $100, our 20% markup → customer pays $120. TicketNetwork retains $7.50. Our commission: $12.50.
   **Open question:** where markup is actually configured (likely inside TicketNetwork's Private Label platform, not something our app calculates) — needs confirmation.
5. Commission/sales data comes via **a sales reporting dashboard TicketNetwork grants us access to** — NOT an API or webhook. Steven's "dashboard" in our app will likely just be a link to (or embed of) their dashboard rather than data our backend ingests. Needs confirmation on whether this access is per-account for Steven directly, or held by us as the integrator.
6. **Mercury API is NOT needed for this model.** Mercury is TicketNetwork's B2B API for the OTHER path (Option A — acting as our own Merchant of Record). Since we're doing Option B (Private Label), we only need CatalogAPI + their hosted checkout redirect — no separate order/payment API integration on our side at all.
7. **Blocker: Sandbox access to the Private Label checkout flow requires signing an NDA with TicketNetwork first.** This is the next concrete action item before checkout can be tested end-to-end.

**Implication for the build:** we do NOT build a payment-processing or order-management system for ticket sales. We DO need:
- A clean checkout **handoff** point (UI leading up to the redirect, matching Figma, since we can't theme the destination page itself).
- UTM parameters and GTM tags wired into the pre-checkout flow for attribution.
- A dashboard section for Steven that most likely links out to TicketNetwork's own reporting dashboard rather than displaying data we own.

---

## 4. TicketNetwork API — What's Confirmed Working

### Account & Access
- DevPortal account: `ZX7910-STORE`
- Application: `TestApplication`
- Environment: **Sandbox** (Production access not yet requested/available)
- Website Config ID (WCID): `12498`

### Authentication (OAuth2 Client Credentials — confirmed working)
- Token endpoint: `https://key-manager.tn-apis.com/oauth2/token`
- Revoke endpoint: `https://key-manager.tn-apis.com/oauth2/revoke`
- Flow: base64-encode `consumerKey:consumerSecret`, send as `Authorization: Basic <base64>` header, POST with `grant_type=client_credentials&scope=<scopes>`.
- Response includes `access_token` (JWT, Bearer), `expires_in` (3600s in current config).
- On a `401` with fault code `900901`, the token is expired/revoked — generate a new one and retry.
- **Never hardcode the actual Consumer Secret or access tokens in code or commit them** — load from environment variables (`.env`, gitignored).

### Required request pattern for CatalogAPI
Every request needs **one of**:
- Query param: `websiteConfigId=12498`, or
- Header: `x-listing-context: website-config-id=12498`

Example (confirmed working):
```
GET https://sandbox.tn-apis.com/catalog/v2/categories?websiteConfigId=12498
Authorization: Bearer <access_token>
Accept: application/json
```

### CatalogAPI Base URL
- Sandbox: `https://sandbox.tn-apis.com/catalog/v2`
- (Production URL pattern will differ — confirm before launch)

### CatalogAPI Endpoints Available (read-only reference/catalog data)
```
Categories
  GET /categories/{path}
  GET /categories

CategoryHierarchies
  GET /categoryhierarchies/{id}
  GET /categoryhierarchies

Cities
  GET /cities/{id}
  GET /cities
  GET /cities/suggest

Countries
  GET /countries/{code}
  GET /countries

Events
  GET /events/{id}
  GET /events
  GET /events/search
  GET /events/suggest
  GET /events/bulk

Performers
  GET /performers/{id}
  GET /performers
  GET /performers/suggest

PostalCodes
  GET /postalCodes/{id}
  GET /postalCodes

Search
  GET /suggest

StateProvinces
  GET /stateProvinces/{id}
  GET /stateProvinces

Venues
  GET /venues/{id}
  GET /venues
  GET /venues/suggest
```

Categories support OData-style `filter` and `sort` query params, plus `page`/`perPage` pagination (default 50/page).

### Token Lifecycle — Best Practices (from TicketNetwork's Authorization spec)
- **Reuse tokens — don't regenerate on every request.** A token is valid for the full `expires_in` window (3600s currently); generating a new token with the same scopes automatically invalidates the previous one. Cache the token and its expiry time in the Express backend (in-memory is fine for a single instance).
- **Refresh proactively, a couple minutes before expiry** — don't wait for a 401. Track `expires_in` from the token response and schedule a refresh shortly before it runs out.
- **On any `401` with fault code `900901`**, treat the token as dead regardless of your tracked expiry, generate a new one, and retry the failed request once.
- **Revocation**: `POST /oauth2/revoke` with the same Basic auth header and a `token=<token>` body param invalidates a token immediately — relevant if we ever need to force-invalidate a compromised token, not part of normal request flow.
- **Multi-instance deployments**: if the Express backend ever runs as more than one process/server (e.g. horizontally scaled), each instance generating its own token will invalidate the others' tokens (since same-scope tokens replace each other per application). To run multiple instances with independent tokens, add a `device_<unique-id>` scope per instance (e.g. `device_instance-a`, `device_instance-b`) to the token request. Not needed for a single-instance MVP, but worth knowing before scaling out.
- **Scopes**: only request scopes actually needed for the calls being made; available scopes for CatalogAPI are listed in the DevPortal under the API's Documents tab → Default Overview → OAuth 2.0 section (e.g. `catalog_bulk_access`). Requesting an unauthorized scope doesn't error — it's just silently excluded from the issued token.

### Mercury API (NOT NEEDED for this project)
Initially flagged by support as a possible requirement, but **confirmed NOT applicable** to our model. Mercury is TicketNetwork's B2B API for integrators who want to act as their own Merchant of Record (Option A). Since we're using the Private Label / hosted-checkout model (Option B), Mercury is out of scope — no integration needed. CatalogAPI (already working) plus a redirect to TicketNetwork's hosted checkout is the complete integration surface.

### Private Label Checkout (the actual next integration point)
- Mechanism: **redirect** to a TicketNetwork-hosted checkout page — not embeddable, not themeable to match our site.
- Attribution: pass **UTM parameters**; place **GTM tags** within the flow for conversion tracking.
- Access: **requires signing an NDA with TicketNetwork before Sandbox access is granted.** This is the current blocker — reach back out to Ian Schultz to get the NDA process started.
- Commission/sales data: delivered via a **sales reporting dashboard** TicketNetwork grants access to (not an API/webhook).
- Integration contacts: Yuliya Biziuk, Ian Schultz — `IntegrationSupport@ticketnetwork.com`.

---

## 5. Resolved Questions (as of Aug 11, 2026)

- ✅ Checkout mechanism: redirect to TicketNetwork-hosted page (not embeddable/themeable).
- ✅ Attribution: UTM params + GTM tags (no affiliate-ID parameter mentioned — confirm exact param names when NDA/docs are provided).
- ✅ Commission data delivery: sales reporting dashboard access (not API/webhook).
- ✅ Commission structure: markup-based — we set markup over wholesale, TicketNetwork retains 7.5% of wholesale, we earn the rest.
- ✅ Order status: none provided to us post-checkout; not needed since we don't fulfill.
- ✅ Mercury API: confirmed NOT needed for this model.

## 6. Remaining Open Questions

1. **NDA process**: what's required to sign it, and typical turnaround time before Sandbox checkout access is granted?
2. Where is markup/pricing actually configured — inside TicketNetwork's Private Label platform, or something we submit via CatalogAPI/another mechanism?
3. Is the sales reporting dashboard access per-account (Steven logs in directly with TicketNetwork) or granted to us as the integrator to relay to him?
4. Exact UTM parameter names/format and GTM tag placement TicketNetwork expects for attribution to work correctly.
5. Whether gift cards can apply toward TicketNetwork-hosted checkout purchases at all (unlikely, since they own that page entirely) — or whether gift cards will only apply to non-ticket purchases/features on our own site.
6. Whether Production access has a similar NDA/approval step, and typical timeline.

---

## 7. What CAN Be Built Now (No Blockers)

- Full Next.js frontend implementing the existing Figma design for: homepage, category browsing, event listing/detail pages, performer pages, venue pages, search.
- Express backend with a TicketNetwork integration module: OAuth2 token fetch/cache/refresh, and typed wrapper functions for every CatalogAPI endpoint above.
- PostgreSQL schema and setup for catalog-adjacent data (see below).
- User account system (signup/login) for site visitors, independent of TicketNetwork.
- Gift card system (its own Postgres tables, redemption logic) — fully independent of TicketNetwork, safe to build regardless of open questions.
- Pre-checkout UI: cart/order review page, "proceed to checkout" button that will eventually redirect to TicketNetwork's hosted page. Build everything up to that redirect.
- UTM parameter and GTM tag scaffolding in the pre-checkout flow (exact param names/tags to confirm once TicketNetwork provides docs, but the plumbing can be built now).
- Steven's dashboard UI shell — likely just a styled link/embed placeholder pointing to TicketNetwork's reporting dashboard, since that's the confirmed delivery mechanism.

## 8. What to HOLD OFF On

- The actual redirect URL/integration to TicketNetwork's hosted checkout (needs NDA + Sandbox access first).
- Anything involving Mercury API — confirmed not needed, don't build against it.
- Any logic that calculates or displays commission ourselves — that lives in TicketNetwork's dashboard, not our database.
- Production environment config (Sandbox only for now, and Sandbox checkout itself is still gated behind the NDA).

---

## 9. Suggested Database Schema (Postgres)

| Table | Purpose |
|---|---|
| `users` | site visitor accounts |
| `categories` | cached/synced category taxonomy from CatalogAPI |
| `events` | cached/synced event data |
| `performers` | cached/synced performer data |
| `venues` | cached/synced venue data |
| `gift_cards` | code, balance, status, issued_to, expiry |
| `gift_card_redemptions` | links a redemption to whatever it was applied toward |
| `admin_users` | Steven's dashboard login, roles |

Note: no `orders`/`payments`/`commission_reports` tables needed — TicketNetwork owns the transaction and commission reporting entirely; we never see that data in our own DB under this model.

Use a migration tool (Prisma or Knex) from the start — don't hand-edit schema.

---

## 10. Suggested Folder Structure

```
/frontend (Next.js)
  /app or /pages
    /events/[id]
    /categories/[path]
    /venues/[id]
    /performers/[id]
    /checkout        <- cart/review UI + redirect to TicketNetwork hosted checkout
    /admin           <- Steven's dashboard (link/embed to TN reporting dashboard)
  /lib
    api.js           <- calls OUR Express backend only, never TicketNetwork directly
  /components

/backend (Express)
  /src
    /config
    /modules
      /ticketnetwork
        client.js     <- low-level HTTP wrapper
        auth.js        <- token fetch/cache/refresh
        catalog.js      <- typed functions per CatalogAPI endpoint
      /giftcards
      /admin
    /routes
    /middleware
    /db
      /migrations
      /models
    app.js
    server.js
```

---

## 11. Security Notes

- TicketNetwork Consumer Key/Secret and access tokens live ONLY in the Express backend's environment variables — never in the Next.js frontend, never in any `NEXT_PUBLIC_` variable, never committed to git.
- Sandbox and Production credentials must be kept in separate env configs and never mixed.
- Rate limit our own API to stay within TicketNetwork's throttle tier (currently 60 req/min on Trial).

---

## 12. Build Order (Phased)

1. **Sign the NDA with TicketNetwork** (Ian Schultz / IntegrationSupport@ticketnetwork.com) to unlock Sandbox access for the Private Label checkout flow. Start this now — it's the longest-lead-time item.
2. Repo/environment setup (Next.js + Express + Postgres skeletons, health checks).
3. Implement Figma UI as real Next.js components/pages.
4. Build the TicketNetwork CatalogAPI data layer in Express (auth + catalog wrapper), connect to frontend.
5. Build gift card system end-to-end (independent of TicketNetwork).
6. Build the pre-checkout UI (cart/review) with UTM/GTM scaffolding, ending at a placeholder for the TicketNetwork redirect.
7. Build Steven's dashboard shell (link/embed to TicketNetwork's reporting dashboard).
8. Once NDA + Sandbox checkout access come through: wire the real redirect URL, confirm UTM/GTM parameters, and test the full flow end-to-end in Sandbox.
9. Request Production access, move to production environment configuration.
10. Testing, monitoring, deployment.

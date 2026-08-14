# 01 — Project Overview

**Last Updated:** 2026-08-13

---

## Project Identity

| Field | Value |
|-------|-------|
| **Project name** | Ticket Love |
| **Type** | Ticket reselling platform |
| **Client** | Steven |
| **Developer / Owner** | Mohammed Arif (work.mohammedarif@gmail.com) |
| **Stage** | Pre-development (documentation & planning phase) |
| **Figma design** | [Ticket Love on Figma](https://www.figma.com/design/O1FzG0lsNLxynQw8oqqIhZ/Ticket-Love?node-id=0-1&m=dev) |

---

## What We Are Building

Ticket Love is a ticket reselling website that lets end users browse live events, concerts, sports, and theatre, then buy tickets through TicketNetwork's hosted checkout. Steven earns a commission on every sale.

**The site does NOT process payments.** TicketNetwork acts as Merchant of Record for all ticket transactions. Our site is a branded storefront that feeds into TicketNetwork's infrastructure.

---

## Business Model

This is TicketNetwork's **Private Label program** — confirmed by their integration team (Ian Schultz, Aug 11 2026).

### How a sale works

1. User browses events, artists, venues, and categories on Ticket Love — all data sourced live from TicketNetwork's CatalogAPI.
2. User selects tickets and reaches a pre-checkout review page on our site.
3. User clicks "Proceed to Checkout" — they are **redirected** to a TicketNetwork-hosted checkout page.
4. TicketNetwork handles payment, fraud review, fulfillment, and sends the order confirmation email (white-labeled to Ticket Love branding).
5. We receive **no order data back** — no webhooks, no order IDs, no transaction records on our side.
6. Steven sees sales and commission via a reporting dashboard TicketNetwork grants access to.

### Commission structure

- All inventory is available to us at TicketNetwork's **wholesale price**.
- Steven sets a **markup percentage** over wholesale (configured in TicketNetwork's Private Label platform — not in our app).
- TicketNetwork retains **7.5% of the wholesale price**.
- Steven earns the remaining commission.

**Example:** Wholesale $100, 20% markup → customer pays $120. TicketNetwork retains $7.50. Steven earns $12.50.

### Gift cards

Ticket Love will also sell gift cards — managed entirely in our own database and redeemable on non-ticket purchases or features on our site. Gift cards **cannot** apply toward the TicketNetwork-hosted checkout (they own that page entirely).

[OPEN] Confirm exact gift card use cases with Steven — what can they be redeemed for on our side?

---

## Stakeholders

| Stakeholder | Role | Contact |
|-------------|------|---------|
| Steven | Client, business owner, will use admin dashboard | [OPEN] get Steven's email/phone |
| Mohammed Arif | Developer, technical owner | work.mohammedarif@gmail.com |
| Ian Schultz | TicketNetwork integration lead | IntegrationSupport@ticketnetwork.com |
| Yuliya Biziuk | TicketNetwork API integration lead | IntegrationSupport@ticketnetwork.com |

---

## TicketNetwork Account Details

| Field | Value |
|-------|-------|
| **Account** | ZX7910-STORE |
| **Application** | TestApplication |
| **Environment** | Sandbox (Production not yet requested) |
| **Website Config ID (WCID)** | 12498 |
| **CatalogAPI base URL (Sandbox)** | `https://sandbox.tn-apis.com/catalog/v2` |
| **OAuth2 token endpoint** | `https://key-manager.tn-apis.com/oauth2/token` |
| **OAuth2 revoke endpoint** | `https://key-manager.tn-apis.com/oauth2/revoke` |
| **Trial rate limit** | 60 requests/minute |

### What is confirmed working

- OAuth2 Client Credentials flow (token fetch, Bearer auth)
- CatalogAPI endpoints: categories, category hierarchies, cities, countries, events, performers, postal codes, search/suggest, state provinces, venues

### What requires NDA first

- Sandbox access to the Private Label checkout redirect URL
- Exact UTM parameter names and GTM tag placement spec

---

## Current Blockers

| Blocker | Impact | Action Required |
|---------|--------|----------------|
| NDA not signed with TicketNetwork | Cannot wire the checkout redirect or test end-to-end | Email Ian Schultz at IntegrationSupport@ticketnetwork.com to start NDA process |
| Sandbox checkout docs not provided | Cannot confirm UTM/GTM param names | Follows from NDA |

---

## Open Questions

1. `[OPEN]` NDA — what is required to sign it, and what is the typical turnaround before Sandbox checkout access is granted?
2. `[OPEN]` Is markup/pricing configured inside TicketNetwork's Private Label platform, or do we submit it via an API?
3. `[OPEN]` Is the sales reporting dashboard access per-account (Steven logs in directly with TN) or granted to us as the integrator?
4. `[OPEN]` Exact UTM parameter names/format and GTM tag placement TicketNetwork expects for attribution.
5. `[OPEN]` Whether gift cards can apply toward TicketNetwork-hosted checkout purchases.
6. `[OPEN]` Whether Production access requires a separate NDA/approval step, and typical timeline.
7. `[OPEN]` Steven's contact details.

---

## Success Criteria

The project is considered complete when:

- [ ] Users can browse events, artists, venues, and categories on Ticket Love with real TicketNetwork data
- [ ] Users can select tickets and reach a polished pre-checkout review page matching the Figma design
- [ ] The "Proceed to Checkout" button redirects to TicketNetwork's hosted page with correct UTM/GTM attribution
- [ ] Users can create accounts and log in
- [ ] Gift card purchase and redemption is fully functional
- [ ] Steven can log in to the admin area and access the TicketNetwork sales dashboard
- [ ] The site is deployed to production, monitored, and stable
- [ ] Full Figma design has been implemented faithfully across all pages

---

## What Can Be Built Now (No Blockers)

- Express backend: TicketNetwork OAuth2 token management + CatalogAPI typed wrapper
- Next.js frontend: all pages matching the Figma design (homepage, events, artists, venues, search, pre-checkout)
- PostgreSQL schema via Prisma (users, catalog cache tables, gift cards, admin users)
- User account system (sign up, sign in, password change)
- Gift card system end-to-end
- Steven's admin dashboard shell (placeholder link to TN reporting dashboard)
- UTM/GTM scaffolding (plumbing ready, exact params to fill in after NDA)

## What to Hold Off On

- The actual checkout redirect URL (needs NDA)
- Commission calculation logic (TN owns this)
- Mercury API — confirmed NOT needed for this project
- Production environment config

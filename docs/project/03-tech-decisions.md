# 03 — Technology Decisions

**Last Updated:** 2026-08-13

---

## What This File Is

Every major technology or architecture decision is recorded here in ADR format (Architecture Decision Record). Each entry has three sections:

- **Context** — why the decision was needed
- **Decision** — what was chosen
- **Consequences** — trade-offs, things to watch, and anything to revisit

When a decision changes, update the entry and add a note in `CHANGELOG.md`. Do not delete old decisions — mark them superseded and explain why.

---

## ADR-001 — Frontend Framework: Next.js 16 (App Router)

**Date:** 2026-08-12 | **Status:** Active

**Context:** The project needs a React-based frontend with server-side rendering for SEO (event and artist pages need to be indexed), i18n support, and a solid deployment story.

**Decision:** Next.js 16 with the App Router. The project was scaffolded from a well-configured Next.js boilerplate that already includes Tailwind v4, next-intl, Vitest, Playwright, Sentry, and strict TypeScript.

**Consequences:**
- React Server Components (RSC) are the default — client components must be explicitly opted into with `"use client"`.
- The App Router's `[locale]` directory structure is already in place.
- No Pages Router code should be written.
- The boilerplate's Drizzle ORM is present in `client/` but intentionally unused (see ADR-004).

---

## ADR-002 — Backend Framework: Express (Node.js + TypeScript)

**Date:** 2026-08-12 | **Status:** Active

**Context:** TicketNetwork's Consumer Key and Secret must never be exposed to the browser. The Next.js frontend cannot call the TicketNetwork API directly — credentials would be visible in `NEXT_PUBLIC_` env vars or network requests.

**Decision:** A separate Express server in `server/` holds all TicketNetwork credentials and acts as a proxy. The Next.js frontend calls our Express backend; the Express backend calls TicketNetwork. TypeScript is used throughout to match the frontend.

**Consequences:**
- Two services to run locally (`npm run dev` in `client/` and `server/`). A root-level script will run them concurrently.
- Two deployment targets in production.
- All TicketNetwork auth logic lives in Express — never in Next.js.
- This is CLAUDE.md Mode 2 for the client: "Frontend consuming an external API."

---

## ADR-003 — Backend ORM: Prisma

**Date:** 2026-08-13 | **Status:** Active

**Context:** The Express backend needs a database layer with migrations, type safety, and a clear schema definition for PostgreSQL.

**Decision:** Prisma. It provides an excellent developer experience (auto-generated types, Prisma Studio, clear schema file), strong migration tooling, and is the most widely known Node.js ORM — which means Claude Code agents are very familiar with its patterns.

**Consequences:**
- Schema is defined in `server/prisma/schema.prisma`.
- Migrations are generated with `npx prisma migrate dev` and applied with `npx prisma migrate deploy`.
- The Prisma client is a singleton — instantiate once and import everywhere.
- Never call `new PrismaClient()` multiple times (hot reload in dev creates too many connections). Use a singleton wrapper.

---

## ADR-004 — Frontend ORM: Drizzle (present but intentionally unused)

**Date:** 2026-08-13 | **Status:** Active

**Context:** The Next.js boilerplate comes with Drizzle ORM pre-configured. In Mode 2 architecture (frontend calls backend, no direct DB access), the frontend must never touch the database.

**Decision:** Leave Drizzle in place in `client/` but never use it for application code. The `src/libs/DB.ts` file and `src/models/Schema.ts` file remain as boilerplate artifacts. All data access goes through `ApiClient.ts` → Express backend → Prisma → PostgreSQL.

**Consequences:**
- Do not import `DB.ts` from any component, page, or API route in the client.
- Do not run `npm run db:*` scripts for application schema changes — those are Express/Prisma's job.
- If the boilerplate Drizzle setup causes confusion, it can be removed in a cleanup phase — but removing it risks breaking build tooling, so leave it for now.

---

## ADR-005 — Authentication Strategy: Session-Based (Cookie JWT)

**Date:** 2026-08-12 | **Status:** Active

**Context:** The site needs both end-user auth (ticket buyers) and admin auth (Steven). The boilerplate already includes auth scaffolding with `auth_token` cookie handling in `client/src/proxy.ts`.

**Decision:** Session-based authentication using a JWT stored in an `HttpOnly` cookie. The Express backend issues and validates the token. The Next.js middleware (`proxy.ts`) checks for the `auth_token` cookie to protect routes.

**Consequences:**
- `HttpOnly` cookies prevent XSS token theft.
- JWTs are stateless — no session store needed for MVP.
- Token expiry and refresh strategy needs to be defined (e.g., 7-day expiry, re-login required).
- Admin users and regular users use separate roles — a `role` field on the user or a separate `admin_users` table (see `05-backend-spec.md`).

---

## ADR-006 — TicketNetwork Integration Model: Private Label (CatalogAPI + Redirect)

**Date:** 2026-08-11 | **Status:** Active — confirmed by Ian Schultz (TicketNetwork)

**Context:** TicketNetwork offers two integration paths. Option A (Mercury API): we act as our own Merchant of Record, handling payments and fulfillment ourselves. Option B (Private Label): we show catalog data and redirect users to TicketNetwork's hosted checkout.

**Decision:** Option B — Private Label. TicketNetwork is Merchant of Record. We use only the CatalogAPI (read-only catalog data) and a redirect to their hosted checkout page.

**Consequences:**
- We do not build payment processing, order management, or fulfillment logic.
- No `orders`, `payments`, or `commission_reports` tables in our DB.
- Mercury API is permanently out of scope — do not reference it in code.
- Commission and sales data live in TicketNetwork's reporting dashboard — not in our DB.
- Checkout UI is a pre-redirect review page only. We cannot theme or embed the actual checkout.

---

## ADR-007 — TicketNetwork Token Strategy: In-Memory Cache with Proactive Refresh

**Date:** 2026-08-12 | **Status:** Active

**Context:** TicketNetwork access tokens are valid for 3600 seconds. Generating a new token with the same scopes immediately invalidates the previous one. Tokens must be reused across requests and refreshed before expiry.

**Decision:** Cache the token and its expiry time in Express module-level variables (in-memory). Schedule a background refresh ~2 minutes before expiry using `setTimeout`. On a `401` with fault code `900901`, immediately fetch a new token and retry the request once, regardless of the cached expiry.

**Consequences:**
- In-memory cache means a server restart clears the token — a fresh fetch happens on the first request after restart. This is acceptable.
- If the app ever scales to multiple Express instances, tokens will invalidate each other. To fix that: add a `device_<unique-id>` scope per instance. Not needed for MVP.
- The Consumer Key and Secret are only ever read from environment variables — never hardcoded.

---

## ADR-008 — Styling: Tailwind CSS v4

**Date:** 2026-08-12 | **Status:** Active

**Context:** The Next.js boilerplate comes with Tailwind CSS v4 pre-configured.

**Decision:** Use Tailwind v4 utility classes throughout. No external component libraries (shadcn, MUI, Radix UI standalone). Custom components are built from scratch to match the Figma design exactly.

**Consequences:**
- All global design tokens (colours, spacing, fonts) live in `src/styles/global.css`.
- No inline `style` props unless the value is truly dynamic (CSS custom properties from JS).
- All layouts must be responsive using Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`).
- The Figma design is the visual source of truth — extract exact colours and spacing from Figma.

---

## ADR-009 — Database: PostgreSQL

**Date:** 2026-08-12 | **Status:** Active

**Context:** The project needs a relational database for users, gift cards, and optional catalog caching.

**Decision:** PostgreSQL, accessed via Prisma on the Express backend. Local dev uses a Docker-based or local Postgres instance. Production uses a managed Postgres service (provider TBD in Phase 8).

**Consequences:**
- Schema is version-controlled via Prisma migrations in `server/prisma/migrations/`.
- Migrations must be committed alongside schema changes — never apply un-migrated schema changes.
- Sensitive tables: `users` (hashed passwords), `gift_cards` (codes). Treat carefully.

---

## ADR-010 — Rate Limiting: Respect TicketNetwork's 60 req/min Trial Limit

**Date:** 2026-08-12 | **Status:** Active (will update when Production tier is confirmed)

**Context:** TicketNetwork's Trial tier allows 60 requests per minute. Exceeding this will result in throttled or blocked requests.

**Decision:** Add rate limiting middleware in Express that respects this limit. Additionally, cache frequently accessed, low-volatility data (categories, popular events) in the Postgres DB to reduce live API calls. Cache TTL: 1 hour for categories, 15 minutes for events.

**Consequences:**
- Caching tables (`categories`, `events`, `performers`, `venues`) serve as a local cache layer.
- A background sync job (or on-demand cache invalidation) keeps cached data fresh.
- Rate limiter must be updated when Production API tier is confirmed.

---

## ADR-011 — i18n: next-intl

**Date:** 2026-08-12 | **Status:** Active

**Context:** The boilerplate includes next-intl with English and French pre-configured.

**Decision:** Keep next-intl. All user-visible strings live in `src/locales/en.json` (and sibling locale files). Never hard-code strings in component files.

**Consequences:**
- All new strings must be added to `en.json` with a context-specific key before rendering.
- Run `npm run check:i18n` after adding strings to verify coverage.
- [OPEN] Confirm with Steven whether French (or other languages) is actually needed, or if English-only is sufficient for MVP.

---

## ADR-012 — Error Tracking: Sentry

**Date:** 2026-08-12 | **Status:** Active

**Context:** The boilerplate includes Sentry instrumentation. The Express backend also needs error tracking.

**Decision:** Sentry for both client (already configured in boilerplate) and server (to be configured in Phase 0). Use separate Sentry projects for frontend and backend for cleaner error isolation.

**Consequences:**
- Never surface raw error messages (stack traces, SQL errors) to the client.
- Use structured `ApiError` class on the backend for all API-layer errors.
- Sensitive data (passwords, tokens, card codes) must be scrubbed from Sentry payloads.

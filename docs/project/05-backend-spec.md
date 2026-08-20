# 05 — Backend Specification

**Last Updated:** 2026-08-13

---

## Overview

The Express backend (`server/`) is a TypeScript API server that:
1. Acts as a secure proxy to TicketNetwork's CatalogAPI (credentials never leave the server).
2. Manages user authentication (registration, login, sessions).
3. Manages the gift card system.
4. Provides an admin API for Steven.

The Next.js frontend **only** calls this backend — it never calls TicketNetwork directly.

---

## Directory Structure

```
server/
├── prisma/
│   ├── schema.prisma          ← single schema file
│   └── migrations/            ← generated migration files (commit these)
├── src/
│   ├── config/
│   │   ├── env.ts             ← Zod-validated env vars (same philosophy as client Env.ts)
│   │   └── constants.ts       ← TN base URLs, WCID, rate limit values
│   ├── libs/
│   │   ├── db.ts              ← Prisma singleton
│   │   └── logger.ts          ← pino logger
│   ├── modules/
│   │   ├── ticketnetwork/
│   │   │   ├── auth.ts        ← token fetch, cache, refresh, revoke
│   │   │   ├── client.ts      ← HTTP wrapper with auth + retry
│   │   │   └── catalog.ts     ← typed functions per CatalogAPI endpoint
│   │   ├── users/
│   │   │   ├── service.ts     ← register, login, get user, change password
│   │   │   └── routes.ts      ← /api/auth/* route handlers
│   │   ├── giftcards/
│   │   │   ├── service.ts     ← issue, check balance, redeem
│   │   │   └── routes.ts      ← /api/gift-cards/* route handlers
│   │   └── admin/
│   │       ├── service.ts     ← admin user queries
│   │       └── routes.ts      ← /api/admin/* route handlers
│   ├── middleware/
│   │   ├── authenticate.ts    ← JWT cookie validation, attaches user to req
│   │   ├── requireAdmin.ts    ← role check, must come after authenticate
│   │   ├── rateLimiter.ts     ← express-rate-limit, respects TN's 60 req/min
│   │   ├── validateBody.ts    ← Zod schema validation for request bodies
│   │   └── errorHandler.ts    ← global error handler, formats ApiError responses
│   ├── routes/
│   │   └── index.ts           ← mounts all module routes
│   ├── types/
│   │   └── express.d.ts       ← extends Express Request with user field
│   ├── app.ts                 ← Express app setup (no listen call)
│   └── server.ts              ← server entry point (app.listen here)
├── tests/
│   ├── ticketnetwork/
│   │   └── auth.test.ts
│   └── giftcards/
│       └── service.test.ts
├── .env                       ← local dev secrets (gitignored)
├── .env.example               ← template with all required keys, no values
├── package.json
├── tsconfig.json
├── CLAUDE.md                  ← to be created in Phase 0 (see 04-ai-tooling.md)
└── nodemon.json               ← dev server config
```

---

## Environment Variables

All env vars are declared and validated via Zod in `src/config/env.ts`. Never call `process.env` directly anywhere else.

```
# TicketNetwork (Sandbox)
TN_CONSUMER_KEY=
TN_CONSUMER_SECRET=
TN_WCID=12498
TN_BASE_URL=https://sandbox.tn-apis.com/catalog/v2
TN_TOKEN_URL=https://key-manager.tn-apis.com/oauth2/token
TN_REVOKE_URL=https://key-manager.tn-apis.com/oauth2/revoke

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_love

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Server
PORT=8000
NODE_ENV=development

# Error tracking: none currently — Sentry removed 2026-08-20 (ADR-012)
```

---

## Prisma Schema

File: `server/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  firstName    String
  lastName     String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  role         Role     @default(USER)

  giftCardRedemptions GiftCardRedemption[]
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model GiftCard {
  id          String      @id @default(cuid())
  code        String      @unique
  balance     Decimal     @db.Decimal(10, 2)
  initialBalance Decimal  @db.Decimal(10, 2)
  status      GiftCardStatus @default(ACTIVE)
  issuedTo    String?     // optional: email of recipient
  expiresAt   DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  redemptions GiftCardRedemption[]
}

model GiftCardRedemption {
  id         String   @id @default(cuid())
  giftCardId String
  userId     String?
  amount     Decimal  @db.Decimal(10, 2)
  redeemedAt DateTime @default(now())
  notes      String?

  giftCard GiftCard @relation(fields: [giftCardId], references: [id])
  user     User?    @relation(fields: [userId], references: [id])
}

// Catalog cache tables — synced from TicketNetwork CatalogAPI
// Reduces live API calls and respects 60 req/min rate limit

model CachedCategory {
  id          Int      @id
  name        String
  path        String   @unique
  parentPath  String?
  data        Json     // full TN response, for flexibility
  cachedAt    DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CachedEvent {
  id          Int      @id
  name        String
  date        DateTime
  venueId     Int?
  performerId Int?
  data        Json
  cachedAt    DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CachedPerformer {
  id       Int    @id
  name     String
  data     Json
  cachedAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CachedVenue {
  id       Int    @id
  name     String
  city     String?
  state    String?
  data     Json
  cachedAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}

enum GiftCardStatus {
  ACTIVE
  REDEEMED
  EXPIRED
  CANCELLED
}
```

---

## TicketNetwork Integration Module

### `src/modules/ticketnetwork/auth.ts`

Manages the OAuth2 token lifecycle. This is one of the most critical modules — read ADR-007 before modifying.

```typescript
// Token state (module-level — survives across requests)
interface TokenState {
  accessToken: string;
  expiresAt: number;      // Unix timestamp in ms
  refreshTimer: NodeJS.Timeout | null;
}

// Public API
export async function getToken(): Promise<string>
  // Returns cached token if valid.
  // Refreshes if within REFRESH_BUFFER_MS (2 min) of expiry.
  // Fetches fresh token on first call after server start.

async function fetchToken(): Promise<void>
  // POST to TN_TOKEN_URL with Basic auth (base64 consumerKey:consumerSecret)
  // Stores access_token and schedules refresh

function scheduleRefresh(expiresIn: number): void
  // Sets a setTimeout to call fetchToken() at (expiresIn - 120) seconds

export async function revokeToken(): Promise<void>
  // POST to TN_REVOKE_URL — use only for forced invalidation, not normal flow
```

**Rule:** `getToken()` is the only exported function called by `client.ts`. Never call `fetchToken()` directly from outside this module.

---

### `src/modules/ticketnetwork/client.ts`

Low-level HTTP wrapper. Handles auth injection and 401 retry.

```typescript
export async function tnRequest<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T>
  // 1. Gets token via getToken()
  // 2. Appends websiteConfigId=12498 to all requests
  // 3. Sets Authorization: Bearer <token>
  // 4. On 401 with fault.code === '900901': invalidates token, fetches new one, retries once
  // 5. On other errors: throws ApiError with status and TN error body
```

---

### `src/modules/ticketnetwork/catalog.ts`

Typed wrapper for every CatalogAPI endpoint. All functions call `tnRequest`.

```typescript
// Categories
export async function getCategories(params?: CategoryParams): Promise<CategoryList>
export async function getCategoryByPath(path: string): Promise<Category>
export async function getCategoryHierarchies(): Promise<CategoryHierarchy[]>

// Events
export async function getEvents(params?: EventParams): Promise<EventList>
export async function getEventById(id: number): Promise<Event>
export async function searchEvents(params: EventSearchParams): Promise<EventList>
export async function suggestEvents(query: string): Promise<EventSuggestion[]>
export async function bulkGetEvents(ids: number[]): Promise<Event[]>

// Performers
export async function getPerformers(params?: PerformerParams): Promise<PerformerList>
export async function getPerformerById(id: number): Promise<Performer>
export async function suggestPerformers(query: string): Promise<PerformerSuggestion[]>

// Venues
export async function getVenues(params?: VenueParams): Promise<VenueList>
export async function getVenueById(id: number): Promise<Venue>
export async function suggestVenues(query: string): Promise<VenueSuggestion[]>

// Cities & Search
export async function getCities(params?: CityParams): Promise<CityList>
export async function globalSuggest(query: string): Promise<SuggestResult>
```

All response types are derived from the TicketNetwork Swagger spec at `docs/swagger.json`.

---

## API Routes

### Public routes (no auth required)

```
GET  /health                          ← health check

GET  /api/categories                  ← list categories
GET  /api/categories/:path            ← category by path
GET  /api/events                      ← list/filter events
GET  /api/events/search               ← search events
GET  /api/events/:id                  ← event detail
GET  /api/performers                  ← list performers
GET  /api/performers/:id              ← performer detail
GET  /api/venues                      ← list venues
GET  /api/venues/:id                  ← venue detail
GET  /api/cities                      ← list cities
GET  /api/search/suggest              ← global suggest

POST /api/auth/register               ← user registration
POST /api/auth/login                  ← user login (sets auth_token cookie)
POST /api/auth/logout                 ← clears auth_token cookie

GET  /api/gift-cards/:code/balance    ← check gift card balance
```

### Authenticated routes (require `auth_token` cookie)

```
GET  /api/auth/me                     ← current user profile
PUT  /api/auth/password               ← change password

POST /api/gift-cards/redeem           ← redeem a gift card
```

### Admin routes (require `auth_token` cookie + admin role)

```
POST /api/admin/gift-cards            ← issue a new gift card
GET  /api/admin/gift-cards            ← list all gift cards
GET  /api/admin/users                 ← list all users
```

---

## Error Handling

All errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "status": 401
  }
}
```

Standard error codes:
- `UNAUTHORIZED` — 401, no or invalid token
- `FORBIDDEN` — 403, authenticated but insufficient role
- `NOT_FOUND` — 404
- `VALIDATION_ERROR` — 422, Zod schema failed
- `RATE_LIMITED` — 429
- `TN_API_ERROR` — 502, TicketNetwork returned an error
- `INTERNAL_ERROR` — 500

Never expose Prisma errors, stack traces, or SQL details. The global `errorHandler` middleware handles this.

---

## Security Checklist

- [ ] `TN_CONSUMER_KEY` and `TN_CONSUMER_SECRET` only read from env vars, never hardcoded
- [ ] `JWT_SECRET` is a randomly generated 256-bit secret, never committed
- [ ] Passwords are hashed with bcrypt (cost factor 12+)
- [ ] Gift card codes are cryptographically random (not sequential)
- [ ] All admin routes protected by `requireAdmin` middleware
- [ ] Zod validation on all incoming request bodies
- [ ] Rate limiter active on all catalog routes
- [ ] If error tracking is ever re-added, it scrubs sensitive fields before sending (no passwords, no tokens, no gift card codes) — see ADR-012

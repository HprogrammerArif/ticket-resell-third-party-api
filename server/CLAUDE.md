# server/CLAUDE.md — Agent Instructions for Express Backend

Read `docs/project/00-INDEX.md` and `docs/project/05-backend-spec.md` before touching any file.

## Architecture
Express 4 + TypeScript backend. Prisma ORM → PostgreSQL. This server is a secure proxy — it never serves HTML.
The Next.js frontend (client/) calls this server. This server calls TicketNetwork CatalogAPI. Never the other way.

## Module layout
src/config/     ← env.ts (Zod-validated) and constants.ts — ALL env access goes here only
src/libs/       ← db.ts (Prisma singleton), logger.ts (pino)
src/modules/    ← feature modules: ticketnetwork/, users/, giftcards/, admin/
src/middleware/ ← errorHandler.ts, authenticate.ts, requireAdmin.ts, rateLimiter.ts, validateBody.ts
src/routes/     ← index.ts mounts all module routes
src/app.ts      ← Express app setup (no listen call here)
src/server.ts   ← entry point only (app.listen lives here)

## TicketNetwork rules (non-negotiable)
- TN_CONSUMER_KEY and TN_CONSUMER_SECRET come from env.ts only — never hardcode
- Token is always cached in memory — never generate a new token per request
- Every CatalogAPI request must include websiteConfigId (env.TN_WCID = 12498)
- On 401 with TN fault code 900901: fetch new token, retry once, then throw ApiError(502, 'TN_API_ERROR', ...)
- Respect rate limit: RATE_LIMIT_MAX_REQUESTS = 55 per minute (from constants.ts)

## Prisma rules
- db singleton is in src/libs/db.ts — import `db` from there only
- Never call `new PrismaClient()` anywhere outside db.ts
- Schema changes: edit prisma/schema.prisma → run `npm run db:generate` → commit both schema and migration file together
- Decimal fields (GiftCard.balance, GiftCardRedemption.amount): Prisma returns Decimal objects — call `.toNumber()` before JSON serialization

## Environment
- All process.env access goes through src/config/env.ts only — never call process.env.FOO directly elsewhere
- Windows note: if DATABASE_URL with `localhost` fails to connect, use `127.0.0.1` instead

## Coding rules
- No `any` — use `unknown` for untyped external data, then narrow with type guards
- All incoming request bodies validated with Zod before processing
- All errors use ApiError from src/middleware/errorHandler.ts
- Never expose Prisma errors, stack traces, or SQL to the client
- Return correct HTTP status codes — never 200 for an error
- Named exports everywhere — default export only for app.ts and server.ts

## Available npm scripts
npm run dev          ← tsx watch --env-file=.env src/server.ts (hot reload, loads .env explicitly)
npm test             ← vitest run (all tests)
npm run db:generate  ← prisma migrate dev (create + apply migration in dev)
npm run db:migrate   ← prisma migrate deploy (apply existing migrations — production only)
npm run db:studio    ← prisma studio (visual DB browser)

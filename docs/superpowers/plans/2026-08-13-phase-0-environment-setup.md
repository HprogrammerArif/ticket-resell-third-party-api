# Phase 0: Repo & Environment Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both the Next.js client and Express backend run locally, are connected to each other and to a real PostgreSQL database, with the full Prisma schema migrated and a passing health check test.

**Architecture:** Monorepo with two services — `client/` (Next.js, already scaffolded) and `server/` (Express, to be built). A root-level `package.json` with `concurrently` starts both. The client calls the backend via `BACKEND_API_URL`; the backend owns all DB access via Prisma.

**Tech Stack:** Node.js ≥20, TypeScript 5.9.x, Express 4.x, Prisma 6.x, PostgreSQL 14+, Vitest 4.x, tsx (dev runner), pino (logger), Zod 4.x, concurrently 9.x.

## Global Constraints

- Never commit `.env` files — always use `.env.example` as the template.
- TicketNetwork `TN_CONSUMER_KEY` and `TN_CONSUMER_SECRET` live only in `server/.env` — never in `client/`.
- Prisma is the only ORM on the server. Do not use `client/src/libs/DB.ts` (Drizzle) for any application data.
- All `process.env` access on the server goes through `src/config/env.ts` only.
- TypeScript strict mode everywhere — no `any`.
- `npm` is the package manager for the client; use `npm` for the server too.
- Node ≥20 required — confirm with `node --version` before starting.

---

## File Map

**Created in this plan:**

```
ticket-resell/                     ← repo root
  .gitignore                       ← root gitignore
  package.json                     ← root dev script (concurrently)

server/
  .gitignore
  .env                             ← local secrets (gitignored)
  .env.example                     ← template (committed)
  package.json
  tsconfig.json
  vitest.config.ts
  CLAUDE.md
  prisma/
    schema.prisma                  ← full DB schema (all tables)
  src/
    config/
      env.ts                       ← Zod-validated env vars
      constants.ts                 ← TN URLs, WCID, rate limits
    libs/
      db.ts                        ← Prisma singleton
      logger.ts                    ← pino logger
    middleware/
      errorHandler.ts              ← global error handler + ApiError class
    app.ts                         ← Express app (no listen)
    server.ts                      ← entry point (app.listen)
  tests/
    setup.ts                       ← vitest global env setup
    health.test.ts                 ← health endpoint test
```

**Modified in this plan:**

```
client/.env                        ← uncomment BACKEND_API_URL=http://localhost:8000
```

---

## Task 1: Git initialization and root scaffold

**Files:**
- Create: `.gitignore` (root)
- Create: `package.json` (root)

**Interfaces:**
- Produces: `npm run dev` at root starts both services

- [ ] **Step 1: Verify Node version**

```bash
node --version
```

Expected: `v20.x.x` or higher. If not, install Node 20 LTS from nodejs.org before continuing.

- [ ] **Step 2: Initialize git repo at root**

```bash
cd C:/Users/workm/Desktop/ticket-resell
git init
```

Expected output: `Initialized empty Git repository in ...ticket-resell/.git/`

- [ ] **Step 3: Create root .gitignore**

Create `C:/Users/workm/Desktop/ticket-resell/.gitignore`:

```
node_modules/
.DS_Store
*.log
.env
.env.local
```

- [ ] **Step 4: Install concurrently at root**

```bash
cd C:/Users/workm/Desktop/ticket-resell
npm init -y
npm install --save-dev concurrently
```

- [ ] **Step 5: Replace the generated root package.json**

Overwrite `C:/Users/workm/Desktop/ticket-resell/package.json` with:

```json
{
  "name": "ticket-love",
  "private": true,
  "scripts": {
    "dev": "concurrently --names client,server --prefix-colors cyan,yellow \"npm run dev --prefix client\" \"npm run dev --prefix server\"",
    "dev:client": "npm run dev --prefix client",
    "dev:server": "npm run dev --prefix server"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore package.json package-lock.json
git commit -m "chore: initialize repo with root dev script"
```

---

## Task 2: Express backend scaffold

**Files:**
- Create: `server/.gitignore`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`

**Interfaces:**
- Produces: `npm run dev` in `server/` starts Express with tsx watch
- Produces: `npm test` in `server/` runs Vitest

- [ ] **Step 1: Create server/.gitignore**

Create `C:/Users/workm/Desktop/ticket-resell/server/.gitignore`:

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 2: Create server/package.json**

Create `C:/Users/workm/Desktop/ticket-resell/server/package.json`:

```json
{
  "name": "ticket-love-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma migrate dev",
    "db:migrate": "prisma migrate deploy",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "express": "^4.21.2",
    "pino": "^9.5.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^25.6.0",
    "@types/supertest": "^6.0.2",
    "pino-pretty": "^13.0.0",
    "prisma": "^6.0.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.9.3",
    "vitest": "^4.1.5"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 3: Create server/tsconfig.json**

Create `C:/Users/workm/Desktop/ticket-resell/server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src", "tests"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create server/vitest.config.ts**

Create `C:/Users/workm/Desktop/ticket-resell/server/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Install server dependencies**

```bash
cd C:/Users/workm/Desktop/ticket-resell/server
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/workm/Desktop/ticket-resell
git add server/
git commit -m "chore: scaffold express backend with typescript and vitest"
```

---

## Task 3: Environment configuration

**Files:**
- Create: `server/.env.example`
- Create: `server/.env` (gitignored — fill in real values)
- Create: `server/src/config/env.ts`
- Create: `server/src/config/constants.ts`

**Interfaces:**
- Produces: `import { env } from '@/config/env'` — typed, validated env object
- Produces: `import { TN_WCID, TN_BASE_URL } from '@/config/constants'` — TN constants

- [ ] **Step 1: Create server/.env.example**

Create `C:/Users/workm/Desktop/ticket-resell/server/.env.example`:

```
# PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/ticket_love

# Auth — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=
JWT_EXPIRES_IN=7d

# TicketNetwork Sandbox credentials (get from TN DevPortal — account ZX7910-STORE)
TN_CONSUMER_KEY=
TN_CONSUMER_SECRET=
TN_WCID=12498
TN_BASE_URL=https://sandbox.tn-apis.com/catalog/v2
TN_TOKEN_URL=https://key-manager.tn-apis.com/oauth2/token
TN_REVOKE_URL=https://key-manager.tn-apis.com/oauth2/revoke

# Server
PORT=8000
NODE_ENV=development
```

- [ ] **Step 2: Create server/.env with real local values**

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/ticket_love
JWT_SECRET=  ← generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_EXPIRES_IN=7d
TN_CONSUMER_KEY=  ← from TN DevPortal
TN_CONSUMER_SECRET=  ← from TN DevPortal
TN_WCID=12498
TN_BASE_URL=https://sandbox.tn-apis.com/catalog/v2
TN_TOKEN_URL=https://key-manager.tn-apis.com/oauth2/token
TN_REVOKE_URL=https://key-manager.tn-apis.com/oauth2/revoke
PORT=8000
NODE_ENV=development
```

**Important:** `.env` is gitignored — never commit it.

- [ ] **Step 3: Create src/config/env.ts**

Create `C:/Users/workm/Desktop/ticket-resell/server/src/config/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  TN_CONSUMER_KEY: z.string().min(1, 'TN_CONSUMER_KEY is required'),
  TN_CONSUMER_SECRET: z.string().min(1, 'TN_CONSUMER_SECRET is required'),
  TN_WCID: z.coerce.number().default(12498),
  TN_BASE_URL: z.string().default('https://sandbox.tn-apis.com/catalog/v2'),
  TN_TOKEN_URL: z.string().default('https://key-manager.tn-apis.com/oauth2/token'),
  TN_REVOKE_URL: z.string().default('https://key-manager.tn-apis.com/oauth2/revoke'),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
export type Env = typeof result.data;
```

- [ ] **Step 4: Create src/config/constants.ts**

Create `C:/Users/workm/Desktop/ticket-resell/server/src/config/constants.ts`:

```typescript
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 55;       // stay under TN's 60 req/min

export const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000; // refresh 2 min before expiry
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/workm/Desktop/ticket-resell
git add server/src/config/ server/.env.example
git commit -m "chore: add environment configuration with zod validation"
```

---

## Task 4: PostgreSQL database and Prisma setup

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/libs/db.ts`

**Interfaces:**
- Produces: `import { db } from '@/libs/db'` — Prisma singleton, type-safe DB client

**Prerequisite:** PostgreSQL must be running locally. Two options:

**Option A — Local PostgreSQL:**
```bash
# Windows: install from https://www.postgresql.org/download/windows/
# Then create the database:
psql -U postgres -c "CREATE DATABASE ticket_love;"
```

**Option B — Docker:**
```bash
docker run --name ticket-love-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ticket_love -p 5432:5432 -d postgres:16
```

- [ ] **Step 1: Confirm PostgreSQL is running**

```bash
psql -U postgres -c "SELECT version();"
```

Expected: PostgreSQL version string. If this fails, start PostgreSQL first.

- [ ] **Step 2: Create database**

```bash
psql -U postgres -c "CREATE DATABASE ticket_love;"
```

Expected: `CREATE DATABASE`

- [ ] **Step 3: Create server/prisma/schema.prisma**

Create `C:/Users/workm/Desktop/ticket-resell/server/prisma/schema.prisma`:

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
  role         Role     @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

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
  id             String         @id @default(cuid())
  code           String         @unique
  balance        Decimal        @db.Decimal(10, 2)
  initialBalance Decimal        @db.Decimal(10, 2)
  status         GiftCardStatus @default(ACTIVE)
  issuedTo       String?
  expiresAt      DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  redemptions GiftCardRedemption[]
}

model GiftCardRedemption {
  id         String   @id @default(cuid())
  giftCardId String
  userId     String?
  amount     Decimal  @db.Decimal(10, 2)
  notes      String?
  redeemedAt DateTime @default(now())

  giftCard GiftCard @relation(fields: [giftCardId], references: [id])
  user     User?    @relation(fields: [userId], references: [id])
}

model CachedCategory {
  id        Int      @id
  name      String
  path      String   @unique
  parentPath String?
  data      Json
  cachedAt  DateTime @default(now())
  updatedAt DateTime @updatedAt
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
  id        Int      @id
  name      String
  data      Json
  cachedAt  DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CachedVenue {
  id        Int      @id
  name      String
  city      String?
  state     String?
  data      Json
  cachedAt  DateTime @default(now())
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

- [ ] **Step 4: Run initial migration**

```bash
cd C:/Users/workm/Desktop/ticket-resell/server
npx prisma migrate dev --name init
```

Expected output:
```
Applying migration `20260813000000_init`
Database changes applied.
✔ Generated Prisma Client
```

- [ ] **Step 5: Verify tables in DB**

```bash
psql -U postgres -d ticket_love -c "\dt"
```

Expected: table list showing `User`, `AdminUser`, `GiftCard`, `GiftCardRedemption`, `CachedCategory`, `CachedEvent`, `CachedPerformer`, `CachedVenue`, and Prisma's internal `_prisma_migrations` table.

- [ ] **Step 6: Create server/src/libs/db.ts**

Create `C:/Users/workm/Desktop/ticket-resell/server/src/libs/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 7: Commit**

```bash
cd C:/Users/workm/Desktop/ticket-resell
git add server/prisma/ server/src/libs/db.ts
git commit -m "feat: add prisma schema and initial database migration"
```

---

## Task 5: Logger, error handler, and health endpoint (TDD)

**Files:**
- Create: `server/src/libs/logger.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/app.ts`
- Create: `server/src/server.ts`
- Create: `server/tests/setup.ts`
- Create: `server/tests/health.test.ts`

**Interfaces:**
- Produces: `import { logger } from '@/libs/logger'` — pino logger instance
- Produces: `import { ApiError } from '@/middleware/errorHandler'` — structured error class
- Produces: `import app from '@/app'` — Express app (no listen, for testing)
- Produces: `GET /health → 200 { status: 'ok' }`

- [ ] **Step 1: Create tests/setup.ts — set test env vars before any import**

Create `C:/Users/workm/Desktop/ticket-resell/server/tests/setup.ts`:

```typescript
// Set all required env vars before any module that reads process.env is imported.
// These are test-only values — no real credentials.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ticket_love_test';
process.env.JWT_SECRET = 'test-secret-that-is-exactly-32-chars-long!!';
process.env.JWT_EXPIRES_IN = '7d';
process.env.TN_CONSUMER_KEY = 'test-consumer-key';
process.env.TN_CONSUMER_SECRET = 'test-consumer-secret';
process.env.TN_WCID = '12498';
```

- [ ] **Step 2: Write the failing health test**

Create `C:/Users/workm/Desktop/ticket-resell/server/tests/health.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 3: Run the test — verify it fails**

```bash
cd C:/Users/workm/Desktop/ticket-resell/server
npm test
```

Expected: FAIL — `Cannot find module '../src/app'`

- [ ] **Step 4: Create src/libs/logger.ts**

Create `C:/Users/workm/Desktop/ticket-resell/server/src/libs/logger.ts`:

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
```

- [ ] **Step 5: Create src/middleware/errorHandler.ts**

Create `C:/Users/workm/Desktop/ticket-resell/server/src/middleware/errorHandler.ts`:

```typescript
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../libs/logger';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, status: err.status },
    });
    return;
  }

  logger.error(err, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      status: 500,
    },
  });
}
```

- [ ] **Step 6: Create src/app.ts**

Create `C:/Users/workm/Desktop/ticket-resell/server/src/app.ts`:

```typescript
import express from 'express';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

export default app;
```

- [ ] **Step 7: Create src/server.ts**

Create `C:/Users/workm/Desktop/ticket-resell/server/src/server.ts`:

```typescript
import { env } from './config/env';
import app from './app';
import { logger } from './libs/logger';

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
```

- [ ] **Step 8: Run the test — verify it passes**

```bash
cd C:/Users/workm/Desktop/ticket-resell/server
npm test
```

Expected:
```
✓ GET /health > returns 200 with status ok

Test Files  1 passed (1)
Tests       1 passed (1)
```

- [ ] **Step 9: Smoke-test the dev server**

```bash
cd C:/Users/workm/Desktop/ticket-resell/server
npm run dev
```

In a second terminal:

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

Stop the server with Ctrl+C.

- [ ] **Step 10: Commit**

```bash
cd C:/Users/workm/Desktop/ticket-resell
git add server/src/ server/tests/
git commit -m "feat: add express health endpoint with error handler and passing test"
```

---

## Task 6: Server CLAUDE.md

**Files:**
- Create: `server/CLAUDE.md`

**Interfaces:**
- Produces: Claude Code agent instructions for the server workspace

- [ ] **Step 1: Create server/CLAUDE.md**

Create `C:/Users/workm/Desktop/ticket-resell/server/CLAUDE.md`:

```markdown
# server/CLAUDE.md — Agent Instructions for Express Backend

Read `docs/project/00-INDEX.md` and `docs/project/05-backend-spec.md` before touching any file.

## Architecture
Express 4 + TypeScript backend. Prisma ORM → PostgreSQL. This server is a secure proxy — it never serves HTML.
Frontend (client/) calls this server. This server calls TicketNetwork CatalogAPI. Never the other way.

## Module layout
src/config/     ← env.ts (Zod-validated) and constants.ts — all env access goes here
src/libs/       ← db.ts (Prisma singleton), logger.ts (pino)
src/modules/    ← feature modules (ticketnetwork/, users/, giftcards/, admin/)
src/middleware/ ← errorHandler.ts, authenticate.ts, requireAdmin.ts, rateLimiter.ts, validateBody.ts
src/routes/     ← index.ts mounts all module routes
src/app.ts      ← Express app setup (no listen)
src/server.ts   ← entry point (app.listen here only)

## TicketNetwork rules (non-negotiable)
- TN_CONSUMER_KEY and TN_CONSUMER_SECRET come from env only — never hardcode
- Token is always cached in memory — never generate a new token per request
- Every CatalogAPI request includes websiteConfigId (env.TN_WCID)
- On 401 with fault code 900901: fetch new token, retry once, then throw ApiError(502, 'TN_API_ERROR', ...)
- Rate limit all catalog routes — see RATE_LIMIT_MAX_REQUESTS in constants.ts

## Prisma rules
- db singleton lives in src/libs/db.ts — import from there only
- Never call new PrismaClient() anywhere else
- Schema changes: edit prisma/schema.prisma → run npm run db:generate → commit both schema + migration
- Decimal fields (GiftCard balance): Prisma returns Decimal objects — call .toNumber() before JSON serialization

## Coding rules
- No any — use unknown for external/untyped data
- All process.env access through src/config/env.ts only
- All incoming request bodies validated with Zod before processing
- All errors use ApiError class from middleware/errorHandler.ts
- Never expose Prisma errors, stack traces, or SQL to the client
- Return correct HTTP status codes — never 200 for an error
- Named exports everywhere — no default exports except app.ts and server.ts

## Available npm scripts
npm run dev          ← tsx watch src/server.ts (hot reload)
npm test             ← vitest run (all tests)
npm run db:generate  ← prisma migrate dev (create + apply migration)
npm run db:migrate   ← prisma migrate deploy (apply existing migrations — production)
npm run db:studio    ← prisma studio (visual DB browser)
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/workm/Desktop/ticket-resell
git add server/CLAUDE.md
git commit -m "docs: add server CLAUDE.md with agent instructions"
```

---

## Task 7: Connect client to backend and end-to-end smoke test

**Files:**
- Modify: `client/.env` — uncomment `BACKEND_API_URL`

**Interfaces:**
- Produces: Next.js `ApiClient.get('/health')` returns `{ status: 'ok' }` from Express

- [ ] **Step 1: Uncomment BACKEND_API_URL in client/.env**

Edit `C:/Users/workm/Desktop/ticket-resell/client/.env` — change line 5 from:

```
# BACKEND_API_URL=http://localhost:8000
```

to:

```
BACKEND_API_URL=http://localhost:8000
```

- [ ] **Step 2: Start both services with the root dev script**

```bash
cd C:/Users/workm/Desktop/ticket-resell
npm run dev
```

Expected: two colored output streams — `[client]` (Next.js) and `[server]` (Express).
- Client starts on `http://localhost:3000`
- Server starts on `http://localhost:8000`

- [ ] **Step 3: Verify health endpoint from terminal**

In a second terminal:

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Verify Next.js can reach the backend**

Open `http://localhost:3000` in a browser. The existing homepage should load without errors.

In the browser DevTools console, run:

```javascript
fetch('/api/proxy-health').then(r => r.json()).then(console.log)
```

Note: This will 404 (no proxy route yet) — that's fine for Phase 0. The key check is that the Express server is running and reachable. The full API proxy wiring happens in Phase 1 when catalog routes are built.

Instead, verify directly from Next.js terminal output — you should see no connection errors when it boots.

- [ ] **Step 5: Update phase status in docs**

Open `docs/project/02-phases.md` and update Phase 0 status from `[NOT STARTED]` to `[DONE]`.
Update the `Last Updated` date to today.

Add a line to `docs/project/CHANGELOG.md`:

```
## 2026-08-13 — Phase 0 completed
- Express server scaffolded and running on port 8000
- Prisma schema migrated (8 tables: User, AdminUser, GiftCard, GiftCardRedemption, 4 CachedX tables)
- Health endpoint passing test
- Client connected to backend via BACKEND_API_URL
- Root dev script starts both services concurrently
```

- [ ] **Step 6: Final commit**

```bash
cd C:/Users/workm/Desktop/ticket-resell
git add client/.env docs/project/
git commit -m "chore: connect client to backend, complete phase 0 setup"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All Phase 0 engineering tasks from `docs/project/02-phases.md` are covered — scaffold, Prisma, health check, CLAUDE.md, client connection, concurrently dev script.
- [x] **No placeholders:** All steps have exact commands and code. No "TBD" or "implement later".
- [x] **Type consistency:** `ApiError` defined once in `errorHandler.ts`, referenced by name in CLAUDE.md. `db` singleton exported from `db.ts`. `env` exported from `env.ts`. All names match across tasks.
- [x] **TDD followed:** Health test written and run as failing before implementation (Task 5, Steps 2–3 before Step 6).
- [x] **Secrets:** `.env` is gitignored in both root `.gitignore` and `server/.gitignore`. `.env.example` committed instead.
- [x] **Business tasks in Phase 0:** Hosting, GitHub repo, domain, Sentry are listed as business decisions in `02-phases.md` but are not engineering tasks — correctly excluded from this implementation plan.

# Phase 1 — TicketNetwork Integration: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Express backend authenticates with TicketNetwork CatalogAPI v2, caches tokens in memory, and exposes typed catalog routes for the Next.js frontend to consume.

**Architecture:** Three TN layers — `auth.ts` owns the OAuth2 token lifecycle (module-level state, proactive refresh); `client.ts` injects Bearer token into every request and handles the one-retry-on-401 rule; `catalog.ts` provides one typed function per CatalogAPI endpoint. Express routes in `src/routes/catalog.ts` call catalog functions and are protected by the rate-limiter middleware.

**Tech Stack:** Node 18 native `fetch`, `express-rate-limit` 7, TypeScript strict, Vitest 4, supertest

## Global Constraints

- TypeScript strict mode — no `any`; use `unknown` then narrow
- All `process.env` access via `src/config/env.ts` only — env already has `TN_BASE_URL`, `TN_TOKEN_URL`, `TN_REVOKE_URL` with sandbox defaults; `TN_CONSUMER_KEY`, `TN_CONSUMER_SECRET`, `TN_WCID` already present
- Rate limit: `RATE_LIMIT_MAX_REQUESTS = 55` per `RATE_LIMIT_WINDOW_MS = 60_000` ms (from `src/config/constants.ts`)
- Token refresh buffer: `TOKEN_REFRESH_BUFFER_MS = 120_000` ms (from `src/config/constants.ts`)
- Every CatalogAPI request must include `websiteConfigId=env.TN_WCID` (12498)
- On 401 + TN fault code `'900901'`: force-refresh token, retry once, then `throw new ApiError(502, 'TN_API_ERROR', ...)`
- Token cached in module-level state — never generated per request
- All errors propagated as `ApiError` from `src/middleware/errorHandler.ts`
- TDD: write failing test, verify it fails, implement, verify it passes
- Working directory for `npm` commands: `C:/Users/workm/Desktop/ticket-resell/server`
- Working directory for `git` commands: `C:/Users/workm/Desktop/ticket-resell`

---

### Task 1: Rate limiter middleware

**Files:**
- Modify: `server/package.json` (add express-rate-limit)
- Create: `server/src/middleware/rateLimiter.ts`
- Create: `server/tests/rateLimiter.test.ts`

**Interfaces:**
- Produces: `catalogRateLimiter` — Express `RequestHandler`, imported by `src/routes/index.ts` in Task 5

- [ ] **Step 1: Install express-rate-limit**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm install express-rate-limit@^7
```

Expected: `added 1 package`

- [ ] **Step 2: Write the failing test**

Create `server/tests/rateLimiter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

// Tight limit so the test doesn't need 55+ requests
const testLimiter = rateLimit({
  windowMs: 60_000,
  limit: 1,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later', status: 429 },
    });
  },
});

const app = express();
app.get('/test', testLimiter, (_req, res) => res.json({ ok: true }));

describe('rate limiter', () => {
  it('allows first request through', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  });

  it('returns 429 with RATE_LIMITED error body after limit exceeded', async () => {
    await request(app).get('/test'); // consume the single slot
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test -- tests/rateLimiter.test.ts 2>&1
```

Expected: FAIL (module not found or import error before `rateLimiter.ts` exists)

- [ ] **Step 4: Create `server/src/middleware/rateLimiter.ts`**

```typescript
import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '../config/constants';

export const catalogRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
        status: 429,
      },
    });
  },
});
```

- [ ] **Step 5: Run all tests**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test 2>&1
```

Expected: `Test Files 2 passed (2)`, `Tests 3 passed (3)` (health + 2 rateLimiter)

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/workm/Desktop/ticket-resell"
git add server/package.json server/package-lock.json server/src/middleware/rateLimiter.ts server/tests/rateLimiter.test.ts
git commit -m "feat: add rate limiter middleware (express-rate-limit, 55 req/min)"
```

---

### Task 2: TicketNetwork types and auth module

**Files:**
- Create: `server/src/modules/ticketnetwork/types.ts`
- Create: `server/src/modules/ticketnetwork/auth.ts`
- Create: `server/tests/ticketnetwork/auth.test.ts`

**Interfaces:**
- Consumes: `env.TN_CONSUMER_KEY`, `env.TN_CONSUMER_SECRET`, `env.TN_TOKEN_URL`, `env.TN_REVOKE_URL` from `src/config/env.ts`; `TOKEN_REFRESH_BUFFER_MS` from `src/config/constants.ts`; `ApiError` from `src/middleware/errorHandler.ts`; `logger` from `src/libs/logger.ts`
- Produces (exact exported signatures):
  - `fetchToken(): Promise<void>` — force-fetches a new token from TN
  - `getToken(): Promise<string>` — returns cached token; fetches if missing or near-expiry
  - `revokeToken(): Promise<void>` — revokes and clears cached token
  - `_resetStateForTests(): void` — clears module state; call in `beforeEach`/`afterEach` of test files only

- [ ] **Step 1: Create `server/src/modules/ticketnetwork/types.ts`**

```typescript
// TN OAuth2 token response (snake_case — standard OAuth2)
export interface TnTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// TN API error body on 4xx responses
export interface TnFault {
  code: string;
  message: string;
  description?: string;
}
export interface TnErrorBody {
  fault?: TnFault;
}

// Shared pagination
export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

// --- Categories ---
export interface TnCategory {
  categoryId: number;
  name: string;
  path: string;
  parentPath?: string;
  childPaths?: string[];
}
export interface TnCategoryList {
  categories: TnCategory[];
  totalRecords: number;
}
export interface CategoryParams extends PaginationParams {
  path?: string;
}

// --- Events ---
export interface TnEvent {
  eventId: number;
  name: string;
  eventDate: string;
  venueId?: number;
  performerId?: number;
  minPrice?: number;
  maxPrice?: number;
  ticketCount?: number;
}
export interface TnEventList {
  events: TnEvent[];
  totalRecords: number;
}
export interface EventParams extends PaginationParams {
  categoryPath?: string;
  performerId?: number;
  venueId?: number;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
}

// --- Performers ---
export interface TnPerformer {
  performerId: number;
  name: string;
  categoryPath?: string;
}
export interface TnPerformerList {
  performers: TnPerformer[];
  totalRecords: number;
}
export interface PerformerParams extends PaginationParams {
  categoryPath?: string;
  keyword?: string;
}

// --- Venues ---
export interface TnVenue {
  venueId: number;
  name: string;
  city?: string;
  stateProvince?: string;
  country?: string;
}
export interface TnVenueList {
  venues: TnVenue[];
  totalRecords: number;
}
export interface VenueParams extends PaginationParams {
  city?: string;
  stateProvince?: string;
}

// --- Cities ---
export interface TnCity {
  name: string;
  stateProvince?: string;
  country?: string;
  eventCount?: number;
}
export interface TnCityList {
  cities: TnCity[];
  totalRecords: number;
}
export interface CityParams extends PaginationParams {
  stateProvince?: string;
  country?: string;
}

// --- Suggestions ---
export interface TnSuggestion {
  type: string;
  id: number;
  name: string;
  additionalInfo?: string;
}
export interface TnSuggestResult {
  suggestions: TnSuggestion[];
}
```

> Field names are based on TN CatalogAPI v2 documentation. Verify against actual Sandbox responses and update if they differ — they won't affect tests (which use mocks) but will affect real API calls.

- [ ] **Step 2: Write the failing auth tests**

Create `server/tests/ticketnetwork/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetchToken, getToken, revokeToken, _resetStateForTests } from '../../src/modules/ticketnetwork/auth';

function mockTokenResponse(overrides?: { access_token?: string; expires_in?: number }) {
  return {
    ok: true,
    json: async () => ({
      access_token: overrides?.access_token ?? 'test-token',
      token_type: 'Bearer',
      expires_in: overrides?.expires_in ?? 3600,
      scope: '',
    }),
  };
}

describe('TN auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStateForTests();
  });

  afterEach(() => {
    _resetStateForTests();
  });

  describe('fetchToken', () => {
    it('POSTs to TN_TOKEN_URL with Basic auth and grant_type=client_credentials', async () => {
      mockFetch.mockResolvedValueOnce(mockTokenResponse());
      await fetchToken();

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('oauth2/token');
      expect(options.method).toBe('POST');
      expect((options.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
      expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(options.body).toBe('grant_type=client_credentials');
    });

    it('throws ApiError(502, TN_AUTH_ERROR) when token endpoint returns non-ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
      await expect(fetchToken()).rejects.toMatchObject({ status: 502, code: 'TN_AUTH_ERROR' });
    });
  });

  describe('getToken', () => {
    it('fetches token on first call and returns it', async () => {
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'first-token' }));
      const token = await getToken();
      expect(token).toBe('first-token');
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('returns cached token without refetching on second call', async () => {
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'cached' }));
      const a = await getToken();
      const b = await getToken();
      expect(a).toBe('cached');
      expect(b).toBe('cached');
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('refetches when token expires_in is within TOKEN_REFRESH_BUFFER_MS (119s < 120s buffer)', async () => {
      // expires_in=119s → expiresAt = now+119s → now >= expiresAt - 120s = now-1s → always true
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'old', expires_in: 119 }));
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'new', expires_in: 3600 }));

      await fetchToken();         // establishes old token near-expiry
      const token = await getToken(); // should see near-expiry → refetch

      expect(token).toBe('new');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('revokeToken', () => {
    it('POSTs to TN_REVOKE_URL with the current token and clears state', async () => {
      mockFetch
        .mockResolvedValueOnce(mockTokenResponse({ access_token: 'to-revoke' }))
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await fetchToken();
      await revokeToken();

      const [url, opts] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(url).toContain('oauth2/revoke');
      expect((opts as RequestInit).method).toBe('POST');

      // State cleared → next getToken must fetch again
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'fresh' }));
      expect(await getToken()).toBe('fresh');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('does nothing when no token is cached', async () => {
      await revokeToken();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test -- tests/ticketnetwork/auth.test.ts 2>&1
```

Expected: FAIL — `Cannot find module '../../src/modules/ticketnetwork/auth'`

- [ ] **Step 4: Create `server/src/modules/ticketnetwork/auth.ts`**

```typescript
import { env } from '../../config/env';
import { TOKEN_REFRESH_BUFFER_MS } from '../../config/constants';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../libs/logger';
import type { TnTokenResponse } from './types';

interface TokenState {
  accessToken: string;
  expiresAt: number;
  refreshTimer: ReturnType<typeof setTimeout> | null;
}

let state: TokenState | null = null;

function basicAuth(): string {
  return Buffer.from(`${env.TN_CONSUMER_KEY}:${env.TN_CONSUMER_SECRET}`).toString('base64');
}

export async function fetchToken(): Promise<void> {
  const response = await fetch(env.TN_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new ApiError(502, 'TN_AUTH_ERROR', 'Failed to obtain TicketNetwork access token');
  }

  const data = (await response.json()) as TnTokenResponse;

  if (state?.refreshTimer) clearTimeout(state.refreshTimer);

  state = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    refreshTimer: null,
  };

  scheduleRefresh(data.expires_in);
  logger.debug({ expiresIn: data.expires_in }, 'TN token fetched');
}

function scheduleRefresh(expiresIn: number): void {
  const delay = Math.max(0, expiresIn * 1000 - TOKEN_REFRESH_BUFFER_MS);
  const timer = setTimeout(() => {
    fetchToken().catch((err: unknown) => logger.error(err, 'TN proactive token refresh failed'));
  }, delay);
  timer.unref();
  if (state) state.refreshTimer = timer;
}

export async function getToken(): Promise<string> {
  if (!state || Date.now() >= state.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
    await fetchToken();
  }
  return state!.accessToken;
}

export async function revokeToken(): Promise<void> {
  if (!state) return;
  if (state.refreshTimer) clearTimeout(state.refreshTimer);
  await fetch(env.TN_REVOKE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `token=${state.accessToken}`,
  });
  state = null;
  logger.info('TN token revoked');
}

export function _resetStateForTests(): void {
  if (state?.refreshTimer) clearTimeout(state.refreshTimer);
  state = null;
}
```

- [ ] **Step 5: Run auth tests**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test -- tests/ticketnetwork/auth.test.ts 2>&1
```

Expected: `Tests 7 passed (7)`

- [ ] **Step 6: Run all tests**

```bash
npm test 2>&1
```

Expected: All passing (health + rateLimiter + auth).

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/workm/Desktop/ticket-resell"
git add server/src/modules/ticketnetwork/types.ts server/src/modules/ticketnetwork/auth.ts server/tests/ticketnetwork/auth.test.ts
git commit -m "feat: add TN types and auth module with token lifecycle (TDD)"
```

---

### Task 3: TicketNetwork HTTP client

**Files:**
- Create: `server/src/modules/ticketnetwork/client.ts`
- Create: `server/tests/ticketnetwork/client.test.ts`

**Interfaces:**
- Consumes: `getToken`, `fetchToken` from `./auth`; `env.TN_BASE_URL`, `env.TN_WCID` from `src/config/env.ts`; `ApiError` from `src/middleware/errorHandler.ts`; `TnErrorBody` from `./types`
- Produces: `tnRequest<T>(path: string, options?: { params?: Record<string, string | number> }): Promise<T>`

- [ ] **Step 1: Write the failing client tests**

Create `server/tests/ticketnetwork/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/ticketnetwork/auth', () => ({
  getToken: vi.fn().mockResolvedValue('mock-bearer-token'),
  fetchToken: vi.fn().mockResolvedValue(undefined),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { tnRequest } from '../../src/modules/ticketnetwork/client';
import { getToken, fetchToken } from '../../src/modules/ticketnetwork/auth';

describe('tnRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockResolvedValue('mock-bearer-token');
    vi.mocked(fetchToken).mockResolvedValue(undefined);
  });

  it('sends GET with Authorization: Bearer and websiteConfigId in URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ categories: [] }) });

    await tnRequest('/categories');

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('websiteConfigId=12498');
    expect(url).toContain('/categories');
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer mock-bearer-token');
  });

  it('appends extra params to the URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    await tnRequest('/events', { params: { pageSize: 20, city: 'Toronto' } });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('pageSize=20');
    expect(url).toContain('city=Toronto');
  });

  it('retries once on 401 with fault code 900901 and returns success', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ fault: { code: '900901', message: 'Invalid token' } }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ categories: [{ categoryId: 1 }] }) });

    const result = await tnRequest<{ categories: unknown[] }>('/categories');

    expect(fetchToken).toHaveBeenCalledOnce();
    expect(result.categories).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError(502) on 401 without fault code 900901', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ fault: { code: '900902' } }),
    });

    await expect(tnRequest('/categories')).rejects.toMatchObject({ status: 502, code: 'TN_API_ERROR' });
  });

  it('throws ApiError(502) on non-401 HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    await expect(tnRequest('/categories')).rejects.toMatchObject({ status: 502, code: 'TN_API_ERROR' });
  });

  it('returns parsed JSON on success', async () => {
    const expected = { totalRecords: 5, categories: [] };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => expected });

    const result = await tnRequest('/categories');
    expect(result).toEqual(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test -- tests/ticketnetwork/client.test.ts 2>&1
```

Expected: FAIL — `Cannot find module '../../src/modules/ticketnetwork/client'`

- [ ] **Step 3: Create `server/src/modules/ticketnetwork/client.ts`**

```typescript
import { env } from '../../config/env';
import { ApiError } from '../../middleware/errorHandler';
import { getToken, fetchToken } from './auth';
import type { TnErrorBody } from './types';

interface TnRequestOptions {
  params?: Record<string, string | number>;
}

function buildUrl(path: string, extra?: Record<string, string | number>): string {
  const params = new URLSearchParams({ websiteConfigId: String(env.TN_WCID) });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
  }
  return `${env.TN_BASE_URL}${path}?${params.toString()}`;
}

export async function tnRequest<T>(path: string, options: TnRequestOptions = {}): Promise<T> {
  const token = await getToken();
  const url = buildUrl(path, options.params);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (response.status === 401) {
    const body = await response.json().catch(() => ({})) as TnErrorBody;
    if (body?.fault?.code === '900901') {
      await fetchToken();
      const fresh = await getToken();
      const retry = await fetch(url, {
        headers: { Authorization: `Bearer ${fresh}`, Accept: 'application/json' },
      });
      if (!retry.ok) throw new ApiError(502, 'TN_API_ERROR', 'TN API error after token refresh');
      return retry.json() as Promise<T>;
    }
    throw new ApiError(502, 'TN_API_ERROR', 'TicketNetwork authentication failed');
  }

  if (!response.ok) {
    throw new ApiError(502, 'TN_API_ERROR', `TicketNetwork API returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 4: Run client tests**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test -- tests/ticketnetwork/client.test.ts 2>&1
```

Expected: `Tests 6 passed (6)`

- [ ] **Step 5: Run all tests**

```bash
npm test 2>&1
```

Expected: All passing.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/workm/Desktop/ticket-resell"
git add server/src/modules/ticketnetwork/client.ts server/tests/ticketnetwork/client.test.ts
git commit -m "feat: add TN HTTP client with auth injection and 401 retry (TDD)"
```

---

### Task 4: TicketNetwork catalog functions

**Files:**
- Create: `server/src/modules/ticketnetwork/catalog.ts`
- Create: `server/tests/ticketnetwork/catalog.test.ts`

**Interfaces:**
- Consumes: `tnRequest` from `./client`; all param/response types from `./types`
- Produces (exact exported signatures used by Task 5 routes):
  ```typescript
  getCategories(params?: CategoryParams): Promise<TnCategoryList>
  getCategoryByPath(path: string, params?: CategoryParams): Promise<TnCategory>
  getEvents(params?: EventParams): Promise<TnEventList>
  getEventById(id: number): Promise<TnEvent>
  searchEvents(params?: EventParams): Promise<TnEventList>
  getPerformers(params?: PerformerParams): Promise<TnPerformerList>
  getPerformerById(id: number): Promise<TnPerformer>
  getVenues(params?: VenueParams): Promise<TnVenueList>
  getVenueById(id: number): Promise<TnVenue>
  getCities(params?: CityParams): Promise<TnCityList>
  globalSuggest(query: string): Promise<TnSuggestResult>
  ```

- [ ] **Step 1: Write the failing catalog tests**

Create `server/tests/ticketnetwork/catalog.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/ticketnetwork/client', () => ({
  tnRequest: vi.fn(),
}));

import { tnRequest } from '../../src/modules/ticketnetwork/client';
import {
  getCategories,
  getCategoryByPath,
  getEvents,
  getEventById,
  getPerformers,
  getPerformerById,
  getVenues,
  getVenueById,
  getCities,
  globalSuggest,
} from '../../src/modules/ticketnetwork/catalog';

describe('TN catalog functions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getCategories() calls tnRequest("/categories", {})', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ categories: [], totalRecords: 0 });
    await getCategories();
    expect(tnRequest).toHaveBeenCalledWith('/categories', {});
  });

  it('getCategories({ pageSize: 10 }) forwards params', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ categories: [], totalRecords: 0 });
    await getCategories({ pageSize: 10, pageNumber: 2 });
    expect(tnRequest).toHaveBeenCalledWith('/categories', { params: { pageSize: 10, pageNumber: 2 } });
  });

  it('getCategoryByPath("sports/hockey") appends path directly to URL segment', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ categoryId: 1, name: 'Hockey', path: 'sports/hockey' });
    await getCategoryByPath('sports/hockey');
    expect(tnRequest).toHaveBeenCalledWith('/categories/sports/hockey', {});
  });

  it('getEventById(42) calls tnRequest("/events/42", {})', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ eventId: 42, name: 'Test', eventDate: '' });
    await getEventById(42);
    expect(tnRequest).toHaveBeenCalledWith('/events/42', {});
  });

  it('getEvents({ city: "Toronto" }) forwards params', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ events: [], totalRecords: 0 });
    await getEvents({ city: 'Toronto' });
    expect(tnRequest).toHaveBeenCalledWith('/events', { params: { city: 'Toronto' } });
  });

  it('searchEvents calls tnRequest("/events/search")', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ events: [], totalRecords: 0 });
    await searchEvents({ keyword: 'hockey' });
    expect(tnRequest).toHaveBeenCalledWith('/events/search', { params: { keyword: 'hockey' } });
  });

  it('getPerformerById(99) calls tnRequest("/performers/99", {})', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ performerId: 99, name: 'Taylor Swift' });
    await getPerformerById(99);
    expect(tnRequest).toHaveBeenCalledWith('/performers/99', {});
  });

  it('getVenueById(5) calls tnRequest("/venues/5", {})', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ venueId: 5, name: 'Scotiabank Arena' });
    await getVenueById(5);
    expect(tnRequest).toHaveBeenCalledWith('/venues/5', {});
  });

  it('globalSuggest("leaf") calls tnRequest("/suggest", { params: { q: "leaf" } })', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ suggestions: [] });
    await globalSuggest('leaf');
    expect(tnRequest).toHaveBeenCalledWith('/suggest', { params: { q: 'leaf' } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test -- tests/ticketnetwork/catalog.test.ts 2>&1
```

Expected: FAIL — `Cannot find module '../../src/modules/ticketnetwork/catalog'`

- [ ] **Step 3: Create `server/src/modules/ticketnetwork/catalog.ts`**

```typescript
import { tnRequest } from './client';
import type {
  TnCategoryList, TnCategory, CategoryParams,
  TnEventList, TnEvent, EventParams,
  TnPerformerList, TnPerformer, PerformerParams,
  TnVenueList, TnVenue, VenueParams,
  TnCityList, CityParams,
  TnSuggestResult,
} from './types';

// Strips undefined values and returns { params } or {} for tnRequest options.
function opts(p: Record<string, unknown>): { params?: Record<string, string | number> } {
  const filtered = Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined),
  ) as Record<string, string | number>;
  return Object.keys(filtered).length > 0 ? { params: filtered } : {};
}

export function getCategories(params: CategoryParams = {}): Promise<TnCategoryList> {
  return tnRequest<TnCategoryList>('/categories', opts(params));
}

export function getCategoryByPath(path: string, params: CategoryParams = {}): Promise<TnCategory> {
  return tnRequest<TnCategory>(`/categories/${path}`, opts(params));
}

export function getEvents(params: EventParams = {}): Promise<TnEventList> {
  return tnRequest<TnEventList>('/events', opts(params));
}

export function getEventById(id: number): Promise<TnEvent> {
  return tnRequest<TnEvent>(`/events/${id}`, {});
}

export function searchEvents(params: EventParams = {}): Promise<TnEventList> {
  return tnRequest<TnEventList>('/events/search', opts(params));
}

export function getPerformers(params: PerformerParams = {}): Promise<TnPerformerList> {
  return tnRequest<TnPerformerList>('/performers', opts(params));
}

export function getPerformerById(id: number): Promise<TnPerformer> {
  return tnRequest<TnPerformer>(`/performers/${id}`, {});
}

export function getVenues(params: VenueParams = {}): Promise<TnVenueList> {
  return tnRequest<TnVenueList>('/venues', opts(params));
}

export function getVenueById(id: number): Promise<TnVenue> {
  return tnRequest<TnVenue>(`/venues/${id}`, {});
}

export function getCities(params: CityParams = {}): Promise<TnCityList> {
  return tnRequest<TnCityList>('/cities', opts(params));
}

export function globalSuggest(query: string): Promise<TnSuggestResult> {
  return tnRequest<TnSuggestResult>('/suggest', { params: { q: query } });
}
```

- [ ] **Step 4: Run catalog tests**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test -- tests/ticketnetwork/catalog.test.ts 2>&1
```

Expected: `Tests 9 passed (9)`

- [ ] **Step 5: Run all tests**

```bash
npm test 2>&1
```

Expected: All passing.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/workm/Desktop/ticket-resell"
git add server/src/modules/ticketnetwork/catalog.ts server/tests/ticketnetwork/catalog.test.ts
git commit -m "feat: add typed TN catalog functions (TDD)"
```

---

### Task 5: Express catalog routes

**Files:**
- Create: `server/src/routes/catalog.ts`
- Create: `server/src/routes/index.ts`
- Modify: `server/src/app.ts` (add `import router from './routes'` and `app.use(router)`)
- Create: `server/tests/ticketnetwork/routes.test.ts`
- Modify: `docs/project/02-phases.md` (update Phase 1 status to `[DONE]`)

**Interfaces:**
- Consumes: all functions from `src/modules/ticketnetwork/catalog`; `catalogRateLimiter` from `src/middleware/rateLimiter`; `ApiError` from `src/middleware/errorHandler`
- Routes registered under `/api` prefix:
  `GET /api/categories`, `GET /api/categories/*` (nested path wildcard),
  `GET /api/events`, `GET /api/events/search` (before `:id`), `GET /api/events/:id`,
  `GET /api/performers`, `GET /api/performers/:id`,
  `GET /api/venues`, `GET /api/venues/:id`,
  `GET /api/cities`, `GET /api/search/suggest`

- [ ] **Step 1: Write the failing route integration tests**

Create `server/tests/ticketnetwork/routes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/modules/ticketnetwork/catalog', () => ({
  getCategories: vi.fn(),
  getCategoryByPath: vi.fn(),
  getEvents: vi.fn(),
  getEventById: vi.fn(),
  searchEvents: vi.fn(),
  getPerformers: vi.fn(),
  getPerformerById: vi.fn(),
  getVenues: vi.fn(),
  getVenueById: vi.fn(),
  getCities: vi.fn(),
  globalSuggest: vi.fn(),
}));

import app from '../../src/app';
import * as catalog from '../../src/modules/ticketnetwork/catalog';

describe('Catalog routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /api/categories', () => {
    it('returns 200 with category list', async () => {
      const data = { categories: [{ categoryId: 1, name: 'Sports', path: 'sports' }], totalRecords: 1 };
      vi.mocked(catalog.getCategories).mockResolvedValueOnce(data);

      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(data);
    });

    it('forwards pageSize and pageNumber as numbers', async () => {
      vi.mocked(catalog.getCategories).mockResolvedValueOnce({ categories: [], totalRecords: 0 });
      await request(app).get('/api/categories?pageSize=5&pageNumber=2');
      expect(catalog.getCategories).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 5, pageNumber: 2 }));
    });

    it('returns 502 when catalog throws ApiError', async () => {
      const { ApiError } = await import('../../src/middleware/errorHandler');
      vi.mocked(catalog.getCategories).mockRejectedValueOnce(new ApiError(502, 'TN_API_ERROR', 'down'));
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('TN_API_ERROR');
    });
  });

  describe('GET /api/categories/:path (nested)', () => {
    it('passes the full nested path to getCategoryByPath', async () => {
      vi.mocked(catalog.getCategoryByPath).mockResolvedValueOnce({ categoryId: 2, name: 'Hockey', path: 'sports/hockey' });
      const res = await request(app).get('/api/categories/sports/hockey');
      expect(res.status).toBe(200);
      expect(catalog.getCategoryByPath).toHaveBeenCalledWith('sports/hockey', expect.any(Object));
    });
  });

  describe('GET /api/events/search', () => {
    it('calls searchEvents (not getEventById)', async () => {
      vi.mocked(catalog.searchEvents).mockResolvedValueOnce({ events: [], totalRecords: 0 });
      const res = await request(app).get('/api/events/search?keyword=hockey');
      expect(res.status).toBe(200);
      expect(catalog.searchEvents).toHaveBeenCalled();
      expect(catalog.getEventById).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/events/:id', () => {
    it('passes numeric id to getEventById', async () => {
      vi.mocked(catalog.getEventById).mockResolvedValueOnce({ eventId: 42, name: 'Test', eventDate: '' });
      const res = await request(app).get('/api/events/42');
      expect(res.status).toBe(200);
      expect(catalog.getEventById).toHaveBeenCalledWith(42);
    });

    it('returns 422 when id is not a number', async () => {
      const res = await request(app).get('/api/events/notanumber');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/search/suggest', () => {
    it('passes q to globalSuggest', async () => {
      vi.mocked(catalog.globalSuggest).mockResolvedValueOnce({ suggestions: [] });
      const res = await request(app).get('/api/search/suggest?q=leaf');
      expect(res.status).toBe(200);
      expect(catalog.globalSuggest).toHaveBeenCalledWith('leaf');
    });

    it('returns 422 when q is missing', async () => {
      const res = await request(app).get('/api/search/suggest');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test -- tests/ticketnetwork/routes.test.ts 2>&1
```

Expected: FAIL — routes return 404 (router not wired yet).

- [ ] **Step 3: Create `server/src/routes/catalog.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import * as catalog from '../modules/ticketnetwork/catalog';
import { ApiError } from '../middleware/errorHandler';
import type { CategoryParams, EventParams, PerformerParams, VenueParams, CityParams } from '../modules/ticketnetwork/types';

const router = Router();

router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: CategoryParams = {
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getCategories(params));
  } catch (err) { next(err); }
});

// Wildcard captures nested paths like 'sports/hockey' in req.params[0]
// Must be registered after the exact /categories route
router.get('/categories/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryPath = req.params[0];
    const params: CategoryParams = {
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getCategoryByPath(categoryPath, params));
  } catch (err) { next(err); }
});

// /events/search BEFORE /events/:id — prevents 'search' being parsed as an id
router.get('/events/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: EventParams = {
      keyword: req.query.keyword as string | undefined,
      categoryPath: req.query.categoryPath as string | undefined,
      city: req.query.city as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.searchEvents(params));
  } catch (err) { next(err); }
});

router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: EventParams = {
      categoryPath: req.query.categoryPath as string | undefined,
      city: req.query.city as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getEvents(params));
  } catch (err) { next(err); }
});

router.get('/events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Event id must be a number');
    res.json(await catalog.getEventById(id));
  } catch (err) { next(err); }
});

router.get('/performers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: PerformerParams = {
      categoryPath: req.query.categoryPath as string | undefined,
      keyword: req.query.keyword as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getPerformers(params));
  } catch (err) { next(err); }
});

router.get('/performers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Performer id must be a number');
    res.json(await catalog.getPerformerById(id));
  } catch (err) { next(err); }
});

router.get('/venues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: VenueParams = {
      city: req.query.city as string | undefined,
      stateProvince: req.query.stateProvince as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getVenues(params));
  } catch (err) { next(err); }
});

router.get('/venues/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Venue id must be a number');
    res.json(await catalog.getVenueById(id));
  } catch (err) { next(err); }
});

router.get('/cities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: CityParams = {
      stateProvince: req.query.stateProvince as string | undefined,
      country: req.query.country as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getCities(params));
  } catch (err) { next(err); }
});

router.get('/search/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string | undefined;
    if (!q) throw new ApiError(422, 'VALIDATION_ERROR', 'q query parameter is required');
    res.json(await catalog.globalSuggest(q));
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 4: Create `server/src/routes/index.ts`**

```typescript
import { Router } from 'express';
import { catalogRateLimiter } from '../middleware/rateLimiter';
import catalogRouter from './catalog';

const router = Router();

router.use('/api', catalogRateLimiter, catalogRouter);

export default router;
```

- [ ] **Step 5: Update `server/src/app.ts`**

Replace the full file content with:

```typescript
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import router from './routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(router);

app.use(errorHandler);

export default app;
```

- [ ] **Step 6: Run route tests**

```bash
cd "C:/Users/workm/Desktop/ticket-resell/server"
npm test -- tests/ticketnetwork/routes.test.ts 2>&1
```

Expected: All route tests passing.

- [ ] **Step 7: Run all tests**

```bash
npm test 2>&1
```

Expected: All tests passing — health, rateLimiter, auth, client, catalog, routes.

- [ ] **Step 8: Update Phase 1 status in `docs/project/02-phases.md`**

In the status table, change:
```
| 1 | Express Backend — TicketNetwork Integration | `[NOT STARTED]` | — |
```
to:
```
| 1 | Express Backend — TicketNetwork Integration | `[DONE]` | — |
```

In the Phase 1 section heading area, change:
```
**Status:** `[NOT STARTED]`
```
to:
```
**Status:** `[DONE]`
```

- [ ] **Step 9: Commit**

```bash
cd "C:/Users/workm/Desktop/ticket-resell"
git add server/src/routes/catalog.ts server/src/routes/index.ts server/src/app.ts server/tests/ticketnetwork/routes.test.ts docs/project/02-phases.md
git commit -m "feat: add Express catalog routes with rate limiter, update Phase 1 to DONE"
```

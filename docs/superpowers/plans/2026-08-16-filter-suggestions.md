# Live Filter Suggestions & Country Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text city/keyword/performer filter inputs with live TicketNetwork-backed typeahead suggestions, and add a Country filter, across the homepage search bar, Events, Venues, and Artists pages.

**Architecture:** A new thin Next.js Route Handler (`/api/suggest/[type]`) gives the browser a path to the already-working, already-cached `CachedCatalogApi.suggestX()` functions (server-only `BACKEND_API_URL` never gets exposed to the client). A new `SuggestInput` client component debounces keystrokes, calls that route, and renders an accessible combobox dropdown. Filter state stays URL-driven; selecting a suggestion navigates via `router.push` instead of a full form submit.

**Tech Stack:** Next.js 16 App Router, TypeScript strict mode, next-intl, Vitest (`unit` project for pure logic, `ui`/browser-mode project exists but is not used by this plan — see Task 3 rationale).

**Spec:** `docs/superpowers/specs/2026-08-16-filter-suggestions-design.md`

## Global Constraints

- Named exports everywhere except Next.js page/layout/route files (Route Handlers export `GET`/`POST` etc. by name, which is the Next.js convention, not a violation)
- Component props: single `props` parameter, no destructuring in the function signature
- No `useMemo`/`useCallback`, no manual `useEffect` DOM manipulation
- All env access through `client/src/libs/Env.ts` — no new env var is needed for this plan
- All user-visible strings in `en.json`/`fr.json` — never hard-code English text in a component
- TypeScript strict mode — no `any`, no type assertions (`as Foo`) except where a library boundary genuinely requires one
- Country is selected and filtered by ISO alpha code (`US`, `CA`, ...), never by display name
- `SuggestInput`'s `onSelect` receives the suggestion's display **name** (string), not its numeric `id` — matches what the existing OData filters already match on

---

### Task 1: Backend — Country filter for Events & Venues

**Files:**
- Modify: `server/src/modules/ticketnetwork/types.ts`
- Modify: `server/src/modules/ticketnetwork/catalog.ts`
- Modify: `server/src/routes/catalog.ts`
- Test: `server/tests/ticketnetwork/catalog.test.ts`

**Interfaces:**
- Produces: `EventParams.country?: string`, `VenueParams.country?: string` — consumed by Task 7 and Task 8's page wiring

- [ ] **Step 1: Write the failing tests**

Add to `server/tests/ticketnetwork/catalog.test.ts` (find the `getEvents({ city: "Toronto" })` test added in an earlier session and add these two tests near it, and near the venues tests):

```ts
  it('getEvents({ country: "US" }) forwards as country/alphaCode OData filter', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
    await getEvents({ country: 'US' });
    const [, opts] = vi.mocked(tnRequest).mock.calls[0]!;
    expect(opts?.params?.filter).toMatch(
      /^takedownAt ge \S+ and country\/alphaCode eq 'US'$/,
    );
  });
```

```ts
  it('getVenues({ country: "US" }) forwards as country/alphaCode OData filter', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
    await getVenues({ country: 'US' });
    expect(tnRequest).toHaveBeenCalledWith('/venues', {
      params: { filter: "country/alphaCode eq 'US'" },
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/ticketnetwork/catalog.test.ts`
Expected: both new tests FAIL (actual `filter` is `undefined` or missing the country clause — `country` isn't a recognized field on `EventParams`/`VenueParams` yet, so TypeScript itself will fail to compile these tests until Step 3).

- [ ] **Step 3: Add `country` to the param types**

In `server/src/modules/ticketnetwork/types.ts`, find `EventParams` and add `country`:

```ts
export interface EventParams extends PaginationParams {
  categoryPath?: string;
  performerId?: number;
  venueId?: number;
  city?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
}
```

Find `VenueParams` and add `country`:

```ts
export interface VenueParams extends PaginationParams {
  city?: string;
  stateProvince?: string;
  country?: string;
}
```

- [ ] **Step 4: Wire the filter clause into `eventQuery` and `venueQuery`**

In `server/src/modules/ticketnetwork/catalog.ts`, find `eventQuery` and add a `country` clause to the existing `odataAnd([...])` array (alongside the existing `city`, `venueId`, `dateFrom`, `dateTo` clauses):

```ts
    params.country ? `country/alphaCode eq ${odataQuote(params.country)}` : undefined,
```

Find `venueQuery` and add the same clause to its `odataAnd([...])` array (alongside its existing `city`/`stateProvince` clauses):

```ts
    params.country ? `country/alphaCode eq ${odataQuote(params.country)}` : undefined,
```

- [ ] **Step 5: Forward `country` in the route handlers**

In `server/src/routes/catalog.ts`, find the `router.get('/events', ...)` handler and add `country` to the params object (alongside the existing `categoryPath`/`city`/`dateFrom`/`dateTo`):

```ts
      country: req.query.country as string | undefined,
```

Find the `router.get('/venues', ...)` handler and add the same line to its params object (alongside its existing `city`/`stateProvince`).

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/ticketnetwork/catalog.test.ts`
Expected: PASS, all tests including the two new ones (9 pre-existing tests + 2 new = 11 passing in this file).

- [ ] **Step 7: Run the full server suite and type-check**

Run: `cd server && npm test`
Expected: same 9 pre-existing, unrelated failures in `routes.test.ts` as before this task (do not attempt to fix those — out of scope, confirmed pre-existing in earlier sessions). `catalog.test.ts` fully green.

Run: `cd server && npx tsc --noEmit --project tsconfig.json`
Expected: only the pre-existing `TS6059` rootDir warnings for files under `tests/` — no new errors.

- [ ] **Step 8: Manual live verification**

With the backend dev server running (`cd server && npm run dev`), confirm the filter narrows real results:

```bash
curl -s "http://localhost:8000/api/catalog/events?country=US&pageSize=1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{console.log(JSON.parse(d).totalCount)})"
curl -s "http://localhost:8000/api/catalog/venues?country=US&pageSize=1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{console.log(JSON.parse(d).totalCount)})"
```

Expected: both return a `totalCount` smaller than the unfiltered totals (13424+ for events, 25000+ for venues) — confirms TN is actually applying the filter, not silently ignoring it (the exact failure mode this whole plan exists to avoid repeating).

- [ ] **Step 9: Commit**

```bash
git add server/src/modules/ticketnetwork/types.ts server/src/modules/ticketnetwork/catalog.ts server/src/routes/catalog.ts server/tests/ticketnetwork/catalog.test.ts
git commit -m "feat: add country filter to events and venues catalog queries"
```

---

### Task 2: Suggest Route Handler

**Files:**
- Create: `client/src/app/api/suggest/[type]/route.ts`
- Test: `client/src/app/api/suggest/[type]/route.test.ts`

**Interfaces:**
- Consumes: `suggestEvents`, `suggestPerformers`, `suggestVenues`, `suggestCities` from `@/libs/CachedCatalogApi` (all already exist, signature `(params: SuggestParams) => Promise<TnSuggestGroup<T>>` where `SuggestParams = { q: string; numberOfSuggestions?: number; filter?: string }`)
- Produces: `GET /api/suggest/{events|performers|venues|cities}?q=...&limit=...` → `200` with `TnSuggestGroup<T>` body, `404` for an unknown `type`, `422` for a missing/empty `q` — consumed by Task 3's `SuggestInput`

- [ ] **Step 1: Write the failing tests**

Create `client/src/app/api/suggest/[type]/route.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/libs/CachedCatalogApi', () => ({
  suggestEvents: vi.fn(),
  suggestPerformers: vi.fn(),
  suggestVenues: vi.fn(),
  suggestCities: vi.fn(),
}));

import { suggestEvents, suggestCities } from '@/libs/CachedCatalogApi';

const mockSuggestEvents = vi.mocked(suggestEvents);
const mockSuggestCities = vi.mocked(suggestCities);

beforeEach(() => {
  mockSuggestEvents.mockReset();
  mockSuggestCities.mockReset();
});

describe('GET /api/suggest/[type]', () => {
  it('returns 404 for an unknown type', async () => {
    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/suggest/bogus?q=to');
    const response = await GET(request, { params: Promise.resolve({ type: 'bogus' }) });
    expect(response.status).toBe(404);
  });

  it('returns 422 when q is missing', async () => {
    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/suggest/cities');
    const response = await GET(request, { params: Promise.resolve({ type: 'cities' }) });
    expect(response.status).toBe(422);
  });

  it('dispatches cities to suggestCities with q and a default limit', async () => {
    mockSuggestCities.mockResolvedValue({ totalResultCount: 1, results: [{ id: 1, name: 'Toronto' }] });
    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/suggest/cities?q=to');
    const response = await GET(request, { params: Promise.resolve({ type: 'cities' }) });
    expect(response.status).toBe(200);
    expect(mockSuggestCities).toHaveBeenCalledWith({ q: 'to', numberOfSuggestions: 8 });
    const body = await response.json();
    expect(body.results).toEqual([{ id: 1, name: 'Toronto' }]);
  });

  it('respects an explicit limit param', async () => {
    mockSuggestEvents.mockResolvedValue({ totalResultCount: 0, results: [] });
    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/suggest/events?q=hamilton&limit=3');
    await GET(request, { params: Promise.resolve({ type: 'events' }) });
    expect(mockSuggestEvents).toHaveBeenCalledWith({ q: 'hamilton', numberOfSuggestions: 3 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run src/app/api/suggest/[type]/route.test.ts`
Expected: FAIL — `./route` does not exist yet.

- [ ] **Step 3: Write the Route Handler**

Create `client/src/app/api/suggest/[type]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import {
  suggestEvents,
  suggestPerformers,
  suggestVenues,
  suggestCities,
} from '@/libs/CachedCatalogApi';

const SUGGEST_TYPES = ['events', 'performers', 'venues', 'cities'] as const;
type SuggestType = (typeof SUGGEST_TYPES)[number];

function isSuggestType(value: string): value is SuggestType {
  return (SUGGEST_TYPES as readonly string[]).includes(value);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
): Promise<NextResponse> {
  const { type } = await context.params;
  if (!isSuggestType(type)) {
    return NextResponse.json({ error: 'Unknown suggest type' }, { status: 404 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'q query parameter is required' }, { status: 422 });
  }

  const limitParam = request.nextUrl.searchParams.get('limit');
  const numberOfSuggestions = limitParam ? Number(limitParam) : 8;

  switch (type) {
    case 'events':
      return NextResponse.json(await suggestEvents({ q, numberOfSuggestions }));
    case 'performers':
      return NextResponse.json(await suggestPerformers({ q, numberOfSuggestions }));
    case 'venues':
      return NextResponse.json(await suggestVenues({ q, numberOfSuggestions }));
    case 'cities':
      return NextResponse.json(await suggestCities({ q, numberOfSuggestions }));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/app/api/suggest/[type]/route.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Type-check**

Run: `cd client && npm run check:types`
Expected: 0 errors.

- [ ] **Step 6: Manual live verification**

With the frontend dev server running (`cd client && npm run dev`):

```bash
curl -s "http://localhost:3000/api/suggest/cities?q=to" | head -c 300
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/suggest/bogus?q=to"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/suggest/cities"
```

Expected: first call returns real city suggestions (200, JSON with `results`); second returns `404`; third returns `422`.

- [ ] **Step 7: Commit**

```bash
git add "client/src/app/api/suggest/[type]/route.ts" "client/src/app/api/suggest/[type]/route.test.ts"
git commit -m "feat: add /api/suggest/[type] route handler proxying TN suggest endpoints"
```

---

### Task 3: `SuggestInput` component

**Files:**
- Create: `client/src/components/catalog/SuggestInput.tsx`
- Test: `client/src/components/catalog/SuggestInput.test.ts`
- Modify: `client/src/locales/en.json`
- Modify: `client/src/locales/fr.json`

**Interfaces:**
- Consumes: `GET /api/suggest/{type}` (Task 2)
- Produces: `SuggestInput(props: { type: 'events' | 'performers' | 'venues' | 'cities'; name: string; placeholder: string; defaultValue?: string; onSelect: (value: string) => void })` and the exported pure helper `shouldFetchSuggestions(value: string): boolean` — consumed by Tasks 6-9

**Note on testing approach:** the debounce/minimum-character gating is extracted into a standalone pure function specifically so it's testable with a fast `.test.ts` (node environment) instead of requiring the project's browser-mode `.test.tsx` runner (real Chromium via Playwright) for something that has no DOM dependency. Full interactive behavior (dropdown open/close, keyboard nav, actual TN suggestions rendering) is covered by this plan's manual verification steps instead, on real Sandbox data — not simulated in a browser test harness.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/catalog/SuggestInput.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shouldFetchSuggestions } from './SuggestInput';

describe('shouldFetchSuggestions', () => {
  it('returns false for an empty string');
  it('returns false for a single character');
  it('returns true at exactly two characters');
  it('returns true for a longer value');
  it('ignores leading/trailing whitespace when counting length');
});
```

(Fill in the bodies before running — this skeleton exists to fix the exact test names; do not leave them empty.)

```ts
import { describe, it, expect } from 'vitest';
import { shouldFetchSuggestions } from './SuggestInput';

describe('shouldFetchSuggestions', () => {
  it('returns false for an empty string', () => {
    expect(shouldFetchSuggestions('')).toBe(false);
  });

  it('returns false for a single character', () => {
    expect(shouldFetchSuggestions('t')).toBe(false);
  });

  it('returns true at exactly two characters', () => {
    expect(shouldFetchSuggestions('to')).toBe(true);
  });

  it('returns true for a longer value', () => {
    expect(shouldFetchSuggestions('toronto')).toBe(true);
  });

  it('ignores leading/trailing whitespace when counting length', () => {
    expect(shouldFetchSuggestions('  t  ')).toBe(false);
    expect(shouldFetchSuggestions('  to  ')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/components/catalog/SuggestInput.test.ts`
Expected: FAIL — `./SuggestInput` does not exist yet.

- [ ] **Step 3: Add the i18n keys this component needs**

In `client/src/locales/en.json`, inside the `Common` namespace, add two keys (alongside the existing `search`/`loading`/etc.):

```json
    "suggestions_loading": "Loading suggestions…",
    "no_suggestions": "No matches"
```

In `client/src/locales/fr.json`, inside the `Common` namespace:

```json
    "suggestions_loading": "Chargement des suggestions…",
    "no_suggestions": "Aucun résultat"
```

- [ ] **Step 4: Write the component**

Create `client/src/components/catalog/SuggestInput.tsx`:

```tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export type SuggestType = 'events' | 'performers' | 'venues' | 'cities';

type Suggestion = { id: number; name: string };

type SuggestResponse = {
  totalResultCount: number;
  results: Suggestion[];
};

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export function shouldFetchSuggestions(value: string): boolean {
  return value.trim().length >= MIN_CHARS;
}

export function SuggestInput(props: {
  type: SuggestType;
  name: string;
  placeholder: string;
  defaultValue?: string;
  onSelect: (value: string) => void;
}) {
  const t = useTranslations('Common');
  const [value, setValue] = useState(props.defaultValue ?? '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!shouldFetchSuggestions(value)) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      fetch(`/api/suggest/${props.type}?q=${encodeURIComponent(value)}`)
        .then((res) => (res.ok ? (res.json() as Promise<SuggestResponse>) : Promise.reject(new Error('suggest request failed'))))
        .then((data) => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions(data.results);
          setOpen(true);
          setActiveIndex(-1);
          setLoading(false);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions([]);
          setOpen(false);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, props.type]);

  function selectSuggestion(name: string) {
    setValue(name);
    setOpen(false);
    setActiveIndex(-1);
    props.onSelect(name);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]!.name);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        name={props.name}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={props.placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full min-w-[200px] overflow-y-auto rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] py-1 shadow-lg"
        >
          {loading && (
            <li className="px-4 py-2 text-[13px] text-[var(--color-text-muted)]">{t('suggestions_loading')}</li>
          )}
          {!loading && suggestions.length === 0 && (
            <li className="px-4 py-2 text-[13px] text-[var(--color-text-muted)]">{t('no_suggestions')}</li>
          )}
          {!loading && suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => selectSuggestion(s.name)}
              className={`cursor-pointer px-4 py-2 text-[14px] text-white ${i === activeIndex ? 'bg-[var(--color-brand-subtle)]' : ''}`}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd client && npx vitest run src/components/catalog/SuggestInput.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 6: Type-check and i18n-check**

Run: `cd client && npm run check:types`
Expected: 0 errors.

Run: `cd client && npm run check:i18n`
Expected: passes (the two new `Common` keys are unused until Tasks 6-9 wire them in via `SuggestInput` itself — since `SuggestInput` calls `t('suggestions_loading')`/`t('no_suggestions')` directly, `check:i18n`'s usage scan should already see them as used from this file; if it doesn't, this is a checkpoint, not a blocker — proceed and it will resolve once Task 6 lands).

- [ ] **Step 7: Commit**

```bash
git add client/src/components/catalog/SuggestInput.tsx client/src/components/catalog/SuggestInput.test.ts client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: add SuggestInput typeahead combobox component"
```

---

### Task 4: `CountrySelect` component

**Files:**
- Create: `client/src/components/catalog/CountrySelect.tsx`

**Interfaces:**
- Consumes: `TnCountry` type from `@/types/Catalog` (`{ alphaCode: string; text: { name: string } }`, already exists)
- Produces: `CountrySelect(props: { countries: TnCountry[]; name: string; value: string; placeholder: string; onChange: (value: string) => void })` — consumed by Tasks 7 and 8

No new test for this task: it's a stateless controlled `<select>` with no branching logic beyond what TypeScript itself already checks — the "genuinely testable units" bar from the spec doesn't apply here. Verified manually once wired into a page in Tasks 7/8.

- [ ] **Step 1: Write the component**

Create `client/src/components/catalog/CountrySelect.tsx`:

```tsx
import type { TnCountry } from '@/types/Catalog';

export function CountrySelect(props: {
  countries: TnCountry[];
  name: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      name={props.name}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white outline-none"
    >
      <option value="">{props.placeholder}</option>
      {props.countries.map((c) => (
        <option key={c.alphaCode} value={c.alphaCode}>
          {c.text.name}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd client && npm run check:types`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/catalog/CountrySelect.tsx
git commit -m "feat: add CountrySelect dropdown component"
```

---

### Task 5: `FilterChips` component

**Files:**
- Create: `client/src/components/catalog/FilterChips.tsx`
- Modify: `client/src/locales/en.json`
- Modify: `client/src/locales/fr.json`

**Interfaces:**
- Produces: `FilterChip = { key: string; label: string }` and `FilterChips(props: { chips: FilterChip[]; onRemove: (key: string) => void })` — consumed by Tasks 7 and 8

No new test: a stateless list-render-with-callback component, same reasoning as Task 4.

- [ ] **Step 1: Add the i18n key**

In `client/src/locales/en.json`, inside the `Common` namespace:

```json
    "remove_filter": "Remove filter"
```

In `client/src/locales/fr.json`, inside the `Common` namespace:

```json
    "remove_filter": "Supprimer le filtre"
```

- [ ] **Step 2: Write the component**

Create `client/src/components/catalog/FilterChips.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

export type FilterChip = {
  key: string;
  label: string;
};

export function FilterChips(props: { chips: FilterChip[]; onRemove: (key: string) => void }) {
  const t = useTranslations('Common');

  if (props.chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {props.chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => props.onRemove(chip.key)}
          aria-label={`${t('remove_filter')}: ${chip.label}`}
          className="flex items-center gap-1.5 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-3 py-1 text-[13px] text-white transition-colors hover:border-[var(--color-brand-muted)]"
        >
          {chip.label}
          <span aria-hidden="true">✕</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Type-check and i18n-check**

Run: `cd client && npm run check:types && npm run check:i18n`
Expected: 0 type errors; i18n check may flag `remove_filter` as newly-used-here, which is correct and expected.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/catalog/FilterChips.tsx client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: add FilterChips removable active-filter pills component"
```

---

### Task 6: Wire the homepage search bar

**Files:**
- Modify: `client/src/components/catalog/SearchBar.tsx`

**Interfaces:**
- Consumes: `SuggestInput` (Task 3)

- [ ] **Step 1: Replace the two plain text inputs with `SuggestInput`**

Replace the full contents of `client/src/components/catalog/SearchBar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';
import { SuggestInput } from '@/components/catalog/SuggestInput';

export function SearchBar(props: {
  defaultKeyword?: string;
  defaultCity?: string;
  defaultDate?: string;
  placeholder?: string;
}) {
  const t = useTranslations('Common');
  const router = useRouter();
  const [keyword, setKeyword] = useState(props.defaultKeyword ?? '');
  const [city, setCity] = useState(props.defaultCity ?? '');
  const [dateFrom, setDateFrom] = useState(props.defaultDate ?? '');

  function navigate(nextKeyword: string, nextCity: string, nextDateFrom: string) {
    const params = new URLSearchParams();
    if (nextKeyword) params.set('keyword', nextKeyword);
    if (nextCity) params.set('city', nextCity);
    if (nextDateFrom) params.set('dateFrom', nextDateFrom);
    router.push(`/events?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(keyword, city, dateFrom);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SuggestInput
            key={`keyword-${keyword}`}
            type="events"
            name="keyword"
            placeholder={props.placeholder ?? t('keyword_placeholder')}
            defaultValue={keyword}
            onSelect={(value) => {
              setKeyword(value);
              navigate(value, city, dateFrom);
            }}
          />
        </div>
        <div className="w-full sm:w-48">
          <SuggestInput
            key={`city-${city}`}
            type="cities"
            name="city"
            placeholder={t('city_placeholder')}
            defaultValue={city}
            onSelect={(value) => {
              setCity(value);
              navigate(keyword, value, dateFrom);
            }}
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-5 py-3 text-[14px] text-[var(--color-text-muted)] outline-none sm:w-44"
        />
      </div>
      <button
        type="submit"
        className="mt-3 w-full rounded-full bg-[var(--color-brand-muted)] py-3 text-[14px] font-medium text-white transition-colors hover:bg-[var(--color-brand)]"
      >
        {t('search')}
      </button>
    </form>
  );
}
```

Note: `SuggestInput`'s own internal input styling (rounded-full, bordered, padded) already matches `SearchBar`'s prior look — no visual regression expected, just wrapped in a sizing `<div>` since `SuggestInput` renders its own `relative` positioning wrapper for the dropdown.

- [ ] **Step 2: Type-check**

Run: `cd client && npm run check:types`
Expected: 0 errors.

- [ ] **Step 3: Manual verification**

Start both dev servers (`server`: `npm run dev`, `client`: `npm run dev`). Visit the homepage. Type 2+ characters into the keyword box — confirm a dropdown of real event names appears within ~300ms. Click a suggestion — confirm the field fills in and nothing navigates yet (this field alone doesn't submit the form on the homepage's own layout — actually it does per `onSelect` calling `navigate`; confirm it navigates to `/events?keyword=...`). Repeat for the city field, confirm it navigates to `/events?city=...`. Confirm the "Search" button still works for manually-typed, non-selected text.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/catalog/SearchBar.tsx
git commit -m "feat: wire homepage search bar to live TN suggestions"
```

---

### Task 7: Wire the Events page filter bar

**Files:**
- Create: `client/src/app/[locale]/(marketing)/events/EventsFilterBar.tsx`
- Modify: `client/src/app/[locale]/(marketing)/events/page.tsx`
- Modify: `client/src/locales/en.json`
- Modify: `client/src/locales/fr.json`

**Interfaces:**
- Consumes: `SuggestInput` (Task 3), `CountrySelect` (Task 4), `FilterChips`/`FilterChip` (Task 5), `getCountries` from `@/libs/CachedCatalogApi` (already exists), `EventParams.country` (Task 1)

- [ ] **Step 1: Add the `filter_country` i18n key**

In `client/src/locales/en.json`, inside `EventsPage` (alongside `filter_city`/`filter_category`):

```json
    "filter_country": "Country",
```

In `client/src/locales/fr.json`, inside `EventsPage`:

```json
    "filter_country": "Pays",
```

- [ ] **Step 2: Create the client filter bar component**

Create `client/src/app/[locale]/(marketing)/events/EventsFilterBar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';
import { SuggestInput } from '@/components/catalog/SuggestInput';
import { CountrySelect } from '@/components/catalog/CountrySelect';
import { FilterChips, type FilterChip } from '@/components/catalog/FilterChips';
import type { TnCountry } from '@/types/Catalog';

type Filters = {
  keyword: string;
  city: string;
  country: string;
  dateFrom: string;
  dateTo: string;
};

export function EventsFilterBar(props: {
  countries: TnCountry[];
  defaultKeyword?: string;
  defaultCity?: string;
  defaultCountry?: string;
  defaultDateFrom?: string;
  defaultDateTo?: string;
}) {
  const t = useTranslations('EventsPage');
  const router = useRouter();
  const [keyword, setKeyword] = useState(props.defaultKeyword ?? '');
  const [city, setCity] = useState(props.defaultCity ?? '');
  const [country, setCountry] = useState(props.defaultCountry ?? '');
  const [dateFrom, setDateFrom] = useState(props.defaultDateFrom ?? '');
  const [dateTo, setDateTo] = useState(props.defaultDateTo ?? '');

  function navigate(overrides: Partial<Filters>) {
    const next: Filters = { keyword, city, country, dateFrom, dateTo, ...overrides };
    const params = new URLSearchParams();
    if (next.keyword) params.set('keyword', next.keyword);
    if (next.city) params.set('city', next.city);
    if (next.country) params.set('country', next.country);
    if (next.dateFrom) params.set('dateFrom', next.dateFrom);
    if (next.dateTo) params.set('dateTo', next.dateTo);
    router.push(`/events?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({});
  }

  function removeFilter(key: string) {
    if (key === 'keyword') setKeyword('');
    if (key === 'city') setCity('');
    if (key === 'country') setCountry('');
    if (key === 'dateFrom') setDateFrom('');
    if (key === 'dateTo') setDateTo('');
    navigate({ [key]: '' } as Partial<Filters>);
  }

  const countryName = props.countries.find((c) => c.alphaCode === country)?.text.name;
  const chips: FilterChip[] = ([
    keyword ? { key: 'keyword', label: keyword } : null,
    city ? { key: 'city', label: city } : null,
    country ? { key: 'country', label: countryName ?? country } : null,
    dateFrom ? { key: 'dateFrom', label: `${t('filter_date_from')}: ${dateFrom}` } : null,
    dateTo ? { key: 'dateTo', label: `${t('filter_date_to')}: ${dateTo}` } : null,
  ] as const).filter((c): c is FilterChip => c !== null);

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-3">
        <SuggestInput
          key={`keyword-${keyword}`}
          type="events"
          name="keyword"
          placeholder={t('filter_keyword')}
          defaultValue={keyword}
          onSelect={(value) => {
            setKeyword(value);
            navigate({ keyword: value });
          }}
        />
        <SuggestInput
          key={`city-${city}`}
          type="cities"
          name="city"
          placeholder={t('filter_city')}
          defaultValue={city}
          onSelect={(value) => {
            setCity(value);
            navigate({ city: value });
          }}
        />
        <CountrySelect
          countries={props.countries}
          name="country"
          value={country}
          placeholder={t('filter_country')}
          onChange={(value) => {
            setCountry(value);
            navigate({ country: value });
          }}
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-[var(--color-text-muted)] outline-none"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-[var(--color-text-muted)] outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
        >
          {t('apply_filters')}
        </button>
      </form>
      <FilterChips chips={chips} onRemove={removeFilter} />
    </>
  );
}
```

- [ ] **Step 3: Wire it into the page**

In `client/src/app/[locale]/(marketing)/events/page.tsx`:

Add the import (alongside the existing `getEvents, searchEvents` import):

```ts
import { getEvents, searchEvents, getCountries } from '@/libs/CachedCatalogApi';
import { EventsFilterBar } from './EventsFilterBar';
```

In the `EventsGrid` function, add `country` to its props type and forward it to both `searchEvents` and `getEvents` calls, and to `searchParamsObj` (mirror exactly how `city` is already threaded through):

```ts
async function EventsGrid(props: {
  locale: string;
  keyword?: string;
  city?: string;
  country?: string;
  categoryPath?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}) {
```

```ts
  const result = props.keyword
    ? await searchEvents({
        keyword: props.keyword,
        city: props.city,
        country: props.country,
        categoryPath: props.categoryPath,
        dateFrom: props.dateFrom,
        dateTo: props.dateTo,
        pageNumber: props.page,
        pageSize,
      })
    : await getEvents({
        city: props.city,
        country: props.country,
        categoryPath: props.categoryPath,
        dateFrom: props.dateFrom,
        dateTo: props.dateTo,
        pageNumber: props.page,
        pageSize,
      });
```

```ts
  if (props.country) searchParamsObj.country = props.country;
```
(add this line next to the existing `if (props.city) searchParamsObj.city = props.city;` line)

In the default-exported `EventsPage` function, read `country` from search params (next to the existing `city` line):

```ts
  const country = typeof sp.country === 'string' ? sp.country : undefined;
```

Fetch the countries list and replace the inline `<form>` filter bar with `<EventsFilterBar>`. Replace this block:

```tsx
      {/* Filter bar */}
      <form method="GET" className="mb-8 flex flex-wrap gap-3">
        <input
          name="keyword"
          defaultValue={keyword}
          placeholder={t('filter_keyword')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <input
          name="city"
          defaultValue={city}
          placeholder={t('filter_city')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <input
          type="date"
          name="dateFrom"
          defaultValue={dateFrom}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-[var(--color-text-muted)] outline-none"
        />
        <input
          type="date"
          name="dateTo"
          defaultValue={dateTo}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-[var(--color-text-muted)] outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
        >
          {t('apply_filters')}
        </button>
      </form>
```

with:

```tsx
      {/* Filter bar */}
      <EventsFilterBar
        countries={(await getCountries({ pageSize: 250 })).results}
        defaultKeyword={keyword}
        defaultCity={city}
        defaultCountry={country}
        defaultDateFrom={dateFrom}
        defaultDateTo={dateTo}
      />
```

And pass `country` down to `<EventsGrid>` (next to the existing `city={city}` prop):

```tsx
        <EventsGrid
          locale={locale}
          keyword={keyword}
          city={city}
          country={country}
          categoryPath={categoryPath}
          dateFrom={dateFrom}
          dateTo={dateTo}
          page={page}
        />
```

- [ ] **Step 4: Type-check and i18n-check**

Run: `cd client && npm run check:types && npm run check:i18n`
Expected: 0 errors either command.

- [ ] **Step 5: Manual verification**

With both dev servers running, visit `/en/events`. Confirm: typing a keyword/city shows live suggestions and selecting one immediately updates the URL and results (no full page reload — watch the Network tab, only an RSC data request should fire, not a full document navigation). Confirm the Country dropdown filters results and narrows the count. Confirm chips appear for each active filter and clicking a chip's ✕ removes just that filter and re-navigates. Confirm typing free text and clicking "Apply Filters" without selecting a suggestion still works (fallback path).

- [ ] **Step 6: Commit**

```bash
git add client/src/app/"[locale]"/"(marketing)"/events/EventsFilterBar.tsx client/src/app/"[locale]"/"(marketing)"/events/page.tsx client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: wire Events page to live suggestions, country filter, and filter chips"
```

---

### Task 8: Wire the Venues page filter bar

**Files:**
- Create: `client/src/app/[locale]/(marketing)/venues/VenuesFilterBar.tsx`
- Modify: `client/src/app/[locale]/(marketing)/venues/page.tsx`
- Modify: `client/src/locales/en.json`
- Modify: `client/src/locales/fr.json`

**Interfaces:**
- Consumes: `SuggestInput` (Task 3), `CountrySelect` (Task 4), `FilterChips`/`FilterChip` (Task 5), `getCountries` (already exists), `VenueParams.country` (Task 1)

- [ ] **Step 1: Add the `filter_country` i18n key**

In `client/src/locales/en.json`, inside `VenuesPage` (alongside `filter_city`/`filter_state`):

```json
    "filter_country": "Country",
```

In `client/src/locales/fr.json`, inside `VenuesPage`:

```json
    "filter_country": "Pays",
```

- [ ] **Step 2: Create the client filter bar component**

Create `client/src/app/[locale]/(marketing)/venues/VenuesFilterBar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';
import { SuggestInput } from '@/components/catalog/SuggestInput';
import { CountrySelect } from '@/components/catalog/CountrySelect';
import { FilterChips, type FilterChip } from '@/components/catalog/FilterChips';
import type { TnCountry } from '@/types/Catalog';

type Filters = {
  city: string;
  stateProvince: string;
  country: string;
};

export function VenuesFilterBar(props: {
  countries: TnCountry[];
  defaultCity?: string;
  defaultStateProvince?: string;
  defaultCountry?: string;
}) {
  const t = useTranslations('VenuesPage');
  const router = useRouter();
  const [city, setCity] = useState(props.defaultCity ?? '');
  const [stateProvince, setStateProvince] = useState(props.defaultStateProvince ?? '');
  const [country, setCountry] = useState(props.defaultCountry ?? '');

  function navigate(overrides: Partial<Filters>) {
    const next: Filters = { city, stateProvince, country, ...overrides };
    const params = new URLSearchParams();
    if (next.city) params.set('city', next.city);
    if (next.stateProvince) params.set('stateProvince', next.stateProvince);
    if (next.country) params.set('country', next.country);
    router.push(`/venues?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({});
  }

  function removeFilter(key: string) {
    if (key === 'city') setCity('');
    if (key === 'stateProvince') setStateProvince('');
    if (key === 'country') setCountry('');
    navigate({ [key]: '' } as Partial<Filters>);
  }

  const countryName = props.countries.find((c) => c.alphaCode === country)?.text.name;
  const chips: FilterChip[] = ([
    city ? { key: 'city', label: city } : null,
    stateProvince ? { key: 'stateProvince', label: stateProvince } : null,
    country ? { key: 'country', label: countryName ?? country } : null,
  ] as const).filter((c): c is FilterChip => c !== null);

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-3">
        <SuggestInput
          key={`city-${city}`}
          type="cities"
          name="city"
          placeholder={t('filter_city')}
          defaultValue={city}
          onSelect={(value) => {
            setCity(value);
            navigate({ city: value });
          }}
        />
        <input
          name="stateProvince"
          value={stateProvince}
          onChange={(e) => setStateProvince(e.target.value)}
          placeholder={t('filter_state')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <CountrySelect
          countries={props.countries}
          name="country"
          value={country}
          placeholder={t('filter_country')}
          onChange={(value) => {
            setCountry(value);
            navigate({ country: value });
          }}
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
        >
          {t('apply_filters')}
        </button>
      </form>
      <FilterChips chips={chips} onRemove={removeFilter} />
    </>
  );
}
```

- [ ] **Step 3: Wire it into the page**

In `client/src/app/[locale]/(marketing)/venues/page.tsx`:

Replace the import line:

```ts
import { getVenues, getCountries } from '@/libs/CachedCatalogApi';
import { VenuesFilterBar } from './VenuesFilterBar';
```

Add `country` to `VenuesGrid`'s props type and forward it to `getVenues` and `searchParamsObj` (mirror the existing `city`/`stateProvince` threading):

```ts
async function VenuesGrid(props: { locale: string; city?: string; stateProvince?: string; country?: string; page: number }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'VenuesPage' });
  const pageSize = 24;
  const result = await getVenues({ city: props.city, stateProvince: props.stateProvince, country: props.country, pageNumber: props.page, pageSize });
```

```ts
  if (props.country) searchParamsObj.country = props.country;
```
(next to the existing `if (props.stateProvince) searchParamsObj.stateProvince = props.stateProvince;`)

In the default-exported `VenuesPage`, read `country` from search params:

```ts
  const country = typeof sp.country === 'string' ? sp.country : undefined;
```

Replace the inline `<form>` filter bar:

```tsx
      <form method="GET" className="mb-8 flex flex-wrap gap-3">
        <input
          name="city"
          defaultValue={city}
          placeholder={t('filter_city')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <input
          name="stateProvince"
          defaultValue={stateProvince}
          placeholder={t('filter_state')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
        >
          {t('apply_filters')}
        </button>
      </form>
```

with:

```tsx
      <VenuesFilterBar
        countries={(await getCountries({ pageSize: 250 })).results}
        defaultCity={city}
        defaultStateProvince={stateProvince}
        defaultCountry={country}
      />
```

And pass `country` to `<VenuesGrid>`:

```tsx
      <Suspense fallback={<VenuesGridSkeleton />}>
        <VenuesGrid locale={locale} city={city} stateProvince={stateProvince} country={country} page={page} />
      </Suspense>
```

- [ ] **Step 4: Type-check and i18n-check**

Run: `cd client && npm run check:types && npm run check:i18n`
Expected: 0 errors either command.

- [ ] **Step 5: Manual verification**

Visit `/en/venues`. Confirm city typeahead works, Country dropdown filters, chips appear/remove correctly, and the State/Province text field (unchanged) still filters as before.

- [ ] **Step 6: Commit**

```bash
git add client/src/app/"[locale]"/"(marketing)"/venues/VenuesFilterBar.tsx client/src/app/"[locale]"/"(marketing)"/venues/page.tsx client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: wire Venues page to live city suggestions and country filter"
```

---

### Task 9: Wire the Artists page filter bar

**Files:**
- Create: `client/src/app/[locale]/(marketing)/artists/ArtistsFilterBar.tsx`
- Modify: `client/src/app/[locale]/(marketing)/artists/page.tsx`

**Interfaces:**
- Consumes: `SuggestInput` (Task 3)

This page keeps its single keyword field — no Country dimension was requested for artist search (performers aren't tied to a single country the way events/venues are), and per the spec, category filtering elsewhere stays chip-based, not typeahead. Just the keyword field gets live suggestions, replacing the backend's `contains()` OData workaround with TN's purpose-built performer suggest.

- [ ] **Step 1: Create the client filter bar component**

Create `client/src/app/[locale]/(marketing)/artists/ArtistsFilterBar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';
import { SuggestInput } from '@/components/catalog/SuggestInput';

export function ArtistsFilterBar(props: { defaultKeyword?: string }) {
  const t = useTranslations('ArtistsPage');
  const router = useRouter();
  const [keyword, setKeyword] = useState(props.defaultKeyword ?? '');

  function navigate(nextKeyword: string) {
    const params = new URLSearchParams();
    if (nextKeyword) params.set('keyword', nextKeyword);
    router.push(`/artists?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(keyword);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap gap-3">
      <SuggestInput
        key={`keyword-${keyword}`}
        type="performers"
        name="keyword"
        placeholder={t('filter_keyword')}
        defaultValue={keyword}
        onSelect={(value) => {
          setKeyword(value);
          navigate(value);
        }}
      />
      <button
        type="submit"
        className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
      >
        {t('filter_submit')}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Wire it into the page**

In `client/src/app/[locale]/(marketing)/artists/page.tsx`, add the import:

```ts
import { ArtistsFilterBar } from './ArtistsFilterBar';
```

Replace this block:

```tsx
      <form method="GET" className="mb-8 flex flex-wrap gap-3">
        <input
          name="keyword"
          defaultValue={keyword}
          placeholder={t('filter_keyword')}
          className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-5 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
        >
          {t('filter_submit')}
        </button>
      </form>
```

with:

```tsx
      <ArtistsFilterBar defaultKeyword={keyword} />
```

- [ ] **Step 3: Type-check**

Run: `cd client && npm run check:types`
Expected: 0 errors.

- [ ] **Step 4: Manual verification**

Visit `/en/artists`. Type a partial performer name, confirm real matching performers appear in the dropdown, selecting one navigates to filtered results immediately.

- [ ] **Step 5: Commit**

```bash
git add client/src/app/"[locale]"/"(marketing)"/artists/ArtistsFilterBar.tsx client/src/app/"[locale]"/"(marketing)"/artists/page.tsx
git commit -m "feat: wire Artists page to live performer suggestions"
```

---

## Self-Review

### 1. Spec Coverage

| Spec requirement | Task |
|---|---|
| Route Handler `/api/suggest/[type]` | Task 2 |
| `SuggestInput` component, debounced, accessible combobox | Task 3 |
| `CountrySelect` component | Task 4 |
| Filter chips | Task 5 |
| `EventParams`/`VenueParams` gain `country` | Task 1 |
| Homepage search bar converted | Task 6 |
| Events page converted (keyword, city, country, chips) | Task 7 |
| Venues page converted (city, country, chips) | Task 8 |
| Artists page converted (keyword) | Task 9 |
| Categories page left unchanged | No task touches it — intentional per spec |
| i18n keys added, both locales | Tasks 3, 5, 7, 8 |
| `check:types`/`lint` pass | Every task's verification steps |

### 2. Placeholder Scan

No TBDs. The one skeleton-then-filled-in test block in Task 3 Step 1 is deliberately shown both ways (to fix exact test names, then filled) — not a placeholder left for the implementer to guess at; the real code follows immediately.

### 3. Type Consistency

- `SuggestInput`'s `onSelect: (value: string) => void` signature is identical across Tasks 3, 6, 7, 8, 9.
- `CountrySelect`'s `onChange: (value: string) => void` and `FilterChips`'s `onRemove: (key: string) => void` are identical across Tasks 4, 5, 7, 8.
- `FilterChip = { key: string; label: string }` matches its one producer (Task 5) and two consumers (Tasks 7, 8) exactly.
- `EventParams.country`/`VenueParams.country` (Task 1, backend) match the `country` prop threaded through `EventsGrid`/`VenuesGrid` and `EventsFilterBar`/`VenuesFilterBar` (Tasks 7, 8) — all `string | undefined`.
- `shouldFetchSuggestions(value: string): boolean` (Task 3) has no other consumers outside its own test — used internally by `SuggestInput`'s effect, not re-exported elsewhere.

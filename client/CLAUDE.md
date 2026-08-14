# CLAUDE.md — Project Intelligence for Claude

> This file is the single source of truth for how Claude should reason, write code, and behave in this repository. Read it fully before touching any file.

---

## 1. Project Identity

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript (strict mode, end-to-end)
- **Database**: Drizzle ORM → PGlite (file-based Postgres in dev; memory in CI)
- **Styling**: Tailwind CSS v4 (utility-first, no component libraries)
- **i18n**: next-intl (all user-visible strings must be translated)
- **Validation**: Zod (forms, API payloads, env vars)
- **Package manager**: npm (scripts via `npm run …`); runner is `bun run` per AGENTS.md
- **Auth**: session-based (see `src/app/[locale]/(auth)`)
- **Error tracking**: Sentry (`src/instrumentation.ts`, `src/instrumentation-client.ts`)
- **Testing**: Vitest (unit/integ) + Playwright (e2e) + Storybook (component isolation)

---

## 2. Repository Layout (memorise this)

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/         # Sign-in, sign-up routes
│   │   ├── (marketing)/    # Public-facing pages
│   │   └── layout.tsx      # Root locale layout
│   └── api/                # Next.js Route Handlers
├── components/             # Shared, reusable UI components
├── libs/
│   ├── Arcjet.ts           # Rate-limiting / security
│   ├── DB.ts               # Drizzle ORM singleton
│   ├── Env.ts              # T3 Env — ALL env var access goes here
│   ├── I18n.ts             # next-intl server config
│   ├── I18nNavigation.ts   # i18n-aware Link / useRouter
│   ├── I18nRouting.ts      # Routing rules (locales list)
│   └── Logger.ts           # LogTape → Better Stack
├── locales/                # en.json + other locale files
├── models/                 # Drizzle schema (Schema.ts)
├── styles/                 # global.css (Tailwind v4 entrypoint)
├── templates/              # Page-level layout skeletons
├── types/                  # Global TypeScript types
├── utils/                  # Helpers; AppConfig.ts = product config
└── validations/            # Zod schemas for forms & API
migrations/                 # SQL migration files (drizzle-kit output)
```

---

## 3. Allowed `npm run` Commands

Only ever run these scripts — never invent new ones or run raw binaries:

| Purpose | Command |
|---|---|
| Local dev (DB + Next.js) | `npm run dev` |
| Production-like build | `npm run build-local` |
| Lint (type-aware) | `npm run lint` |
| Type checking | `npm run check:types` |
| Unused deps / exports | `npm run check:deps` |
| i18n key coverage | `npm run check:i18n` |
| Unit + integration tests | `npm run test` |
| End-to-end tests | `npm run test:e2e` |
| Generate DB migration | `npm run db:generate` |
| Apply DB migration | `npm run db:migrate` |
| Drizzle Studio | `npm run db:studio` |

---

## 4. Core Coding Principles

### 4.1 TypeScript
- Strict TypeScript everywhere. **No `any`** unless isolated and explicitly commented.
- Never use type assertions (`as Foo`) — use type narrowing or runtime checks instead.
- Let the compiler infer return types unless an explicit annotation genuinely improves readability.
- Zod schemas use **type-only import**: `import type * as z from 'zod';`
- Prefer `unknown` over `any` for untyped external data.

### 4.2 Imports
- Absolute imports via `@/` for anything outside the current directory.
- Same-directory files use relative imports (`./foo`).
- Group order: external packages → `@/libs` → `@/models` → `@/components` → `@/utils` → local.
- **Never** import directly from `process.env`. Use `Env.ts` only.

### 4.3 Exports
- **Named exports only**. Default exports are allowed only for Next.js pages (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`).
- Default export name on pages must end with `Page` (e.g., `export default function HomePage`).

### 4.4 Functions & Parameters
- Keep functions and components short and focused. Extract when it improves clarity.
- Use an **options object** for functions with 3+ parameters, optional flags, or ambiguous positional args.
- No unnecessary `try/catch`. Let errors propagate unless you have a specific recovery strategy.

### 4.5 Environment Variables
- All env vars are declared and validated in `src/libs/Env.ts` using `@t3-oss/env-nextjs`.
- **Never** call `process.env.FOO` directly anywhere else in the codebase. Import from `Env.ts`.
- When adding a new env var: add it to `Env.ts`, add it to `.env`, document it in `.env.production`.

---

## 5. React & Next.js Rules

### 5.1 Components
- Default to **React Server Components (RSC)**. Only add `"use client"` when you need browser APIs, event handlers that can't be inlined, or client-only hooks.
- No `useMemo` / `useCallback` — the React compiler handles memoisation.
- Avoid `useEffect` — prefer server-side data fetching, URL state, or derived state.
- Wrap data-heavy RSC trees with `<Suspense>` and a skeleton fallback to enable streaming.
- Component props: single `props` parameter with an inline type. Access as `props.foo` — **do not destructure** in the function signature.

```tsx
// ✅ Correct
export function UserCard(props: { name: string; role: string }) {
  return <p>{props.name} — {props.role}</p>;
}

// ❌ Wrong
export function UserCard({ name, role }: { name: string; role: string }) { … }
```

- Use `React.ReactNode`, not the bare `ReactNode` import.

### 5.2 Pages
- Page files live in `src/app/[locale]/(group)/route/page.tsx`.
- Default export name ends with `Page`.
- Locale pages **must** `await props.params` then call `setRequestLocale(locale)` before any rendering.

```tsx
export default async function AboutPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  // …
}
```

- Dashboard / behind-auth pages: define `<head>` metadata once in the layout — never repeat it in each page.

### 5.3 Images & Fonts
- Always use `next/image` for images. Never use a bare `<img>` tag.
- Always use `next/font` for fonts.

### 5.4 Error Handling
- Use the project's standardised `ApiError` class for all API-layer errors.
- Never surface raw server-side error messages (stack traces, SQL errors) to the client.
- Use `global-error.tsx` and `error.tsx` boundaries for UI error recovery.

### 5.5 State Management
- Prefer **URL search parameters** for shareable, bookmarkable state.
- Use `useState` for local ephemeral UI state only.
- **Avoid** global state libraries (Zustand, Redux, Jotai) unless application complexity genuinely demands it — justify in a code comment if you add one.

---

## 6. Styling (Tailwind v4)

- Use Tailwind v4 utility classes. No inline `style` props unless values are truly dynamic (e.g., CSS custom properties from JS).
- Reuse existing shared components before creating new ones.
- All layouts must be responsive. Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`).
- Do not add classes that have no visible effect. Keep class lists as short as possible.
- Global design tokens (colours, spacing) live in `src/styles/global.css`.

---

## 7. Internationalisation (next-intl)

- **Never hard-code user-visible strings** in component or page files.
- All strings belong in `src/locales/en.json` (and sibling locale files).
- Namespace convention: page namespaces end with `Page` (e.g., `AboutPage`, `SignInPage`).
- Key naming: use context-specific, snake_case keys — `card_title`, `meta_description`, `submit_button`.
- Server components: `getTranslations({ locale, namespace })`.
- Client components: `useTranslations(namespace)`.
- Markup inside translations: use `t.rich('key', { b: (chunks) => <b>{chunks}</b> })`.
- Translation values: sentence case. Error messages: short, no "Please try again" filler.

---

## 8. Database & ORM (Drizzle)

- Schema lives in `src/models/Schema.ts`. All table and column definitions go here.
- DB singleton lives in `src/libs/DB.ts`. Import `DB` from there — never instantiate a new client.
- Never write raw SQL strings when Drizzle's query builder covers the case.
- After changing the schema:
  1. `npm run db:generate` — produces the SQL migration file in `migrations/`.
  2. `npm run db:migrate` — applies it.
  3. Commit both the schema change and the migration file together.
- In Route Handlers / Server Actions only — **never** import `DB.ts` in client components or pure-frontend code.

---

## 9. Validation (Zod)

- All incoming data (forms, API payloads, external API responses) must be validated with a Zod schema.
- Schemas live in `src/validations/`. Name files by domain: `UserValidation.ts`, `PostValidation.ts`.
- Compose schemas from smaller, reusable schemas rather than duplicating fields.
- Type-only import: `import type * as z from 'zod';` — use `z.infer<typeof MySchema>` for the TypeScript type.

---

## 10. API & Security

- Route Handlers live in `src/app/api/`.
- Use `src/libs/Arcjet.ts` for rate limiting on all public-facing endpoints.
- Validate the request body with a Zod schema before processing.
- Return appropriate HTTP status codes. Never return `200` for an error.
- Use `ApiError` for structured error responses. Never leak stack traces or internal details.

---

## 11. Testing

| Type | File pattern | Location |
|---|---|---|
| Unit | `*.test.ts` | Co-located with the implementation file |
| Integration | `*.integ.ts` | `tests/` directory |
| End-to-end | `*.e2e.ts` | `tests/` directory |
| Component (visual) | `*.stories.ts(x)` | Co-located or in `src/components/` |

**`describe` / `it` conventions:**
- Top-level `describe` = the subject (function name, component name, route).
- Nested `describe` groups scenarios or contexts (e.g., `when unauthenticated`).
- `it` titles: short, third-person present tense — `verb + object + context`. Sentence case, no trailing period.
- Omit filler words: "should", "works", "handles", "checks", "validates". State *what*, not *how*.
- Avoid mocking unless there is no other way.

```ts
// ✅ Correct
describe('createUser', () => {
  it('returns the created user record');
  it('throws when email already exists');
});

// ❌ Wrong
describe('createUser tests', () => {
  it('should work correctly');
  it('handles errors properly');
});
```

---

## 12. Git Commits (Conventional Commits)

Format: `type: summary` — **no scope**.

```
feat: add password-reset flow to auth routes
fix: correct locale redirect loop on sign-in page
refactor: extract PaginationControls from UserTable
```

- **Types**: `feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert`
- Summary: a short, specific sentence — what changed and where/why. Not "update stuff" or "fix bug".
- Breaking changes: add `BREAKING CHANGE:` in the commit footer.
- Use `npm run commit` (commitlint prompt) if unsure about format.

---

## 13. JSDoc

- Add JSDoc to all exported functions, classes, and types that are non-trivial.
- First line: short, sentence-case, present-tense description of intent.
- Order: description → `@param` → `@returns` → `@throws` (only if it throws).
- Start `/**` directly above the symbol — no blank line between JSDoc and declaration.

```ts
/**
 * Fetches a paginated list of users from the database.
 * @param page - The 1-based page number.
 * @param limit - Maximum number of records per page.
 * @returns An array of user records and the total count.
 */
export async function listUsers(options: { page: number; limit: number }) { … }
```

---

## 14. Architecture Modes

Before writing any code, determine which mode is active:

| Mode | Description | What to use |
|---|---|---|
| **Mode 1** — Landing page | Pure frontend; no DB or auth | `src/app`, `src/components`, `src/templates`. Ignore `src/models` and `DB.ts`. |
| **Mode 2** — Custom backend | Frontend consuming an external API | `src/libs/ApiClient.ts` for all data fetching. No Drizzle. |
| **Mode 3** — Full stack | Built-in backend with DB | Drizzle ORM in `src/models`, Route Handlers in `src/app/api`, Server Actions. |

> Always inspect the current feature area before writing code to confirm the active mode.

---

## 15. Accessibility (a11y)

- Use semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`, `<button>`, etc.
- All interactive elements must be keyboard-navigable.
- Images must have descriptive `alt` text (or `alt=""` if purely decorative).
- Use ARIA attributes only when semantic HTML is insufficient — do not over-ARIA.
- Target WCAG 2.1 AA compliance.
- Run `npm run lint` — oxlint includes a11y rules.

---

## 16. Performance

- Minimise client-side JavaScript: default to RSC, opt in to `"use client"` only when necessary.
- Stream data-heavy pages with `<Suspense>` + skeleton fallback.
- Use `next/image` with explicit `width` and `height` (or `fill` + sized container) to avoid layout shift.
- Code-split heavy third-party libraries with `dynamic(() => import(…), { ssr: false })` when appropriate.

---

## 17. Debugging Protocol

Apply hypothesis-driven debugging:

1. Identify **1–3 most likely root causes** before touching code.
2. Validate the most likely hypothesis first (add a log, read a value, check a type).
3. Fix only after you have confirmed the cause.
4. Do not make speculative changes. Revert any change that didn't fix the issue.

---

## 18. Communication & Token Efficiency

- **Skip recaps** unless the result is ambiguous or you need more input.
- When making a change, state *what* changed and *why* — not a line-by-line narration.
- If a task requires a significant architectural decision, surface the options and tradeoffs; don't silently pick one.
- Ask one focused question when blocked, not a list of five.

---

## 19. What Claude Must Never Do

- ❌ Read `process.env` directly anywhere outside `Env.ts`.
- ❌ Add `any` without a comment explaining why.
- ❌ Use default exports outside of Next.js page/layout/error files.
- ❌ Hard-code user-visible strings — use `next-intl` keys.
- ❌ Import `DB.ts` from client components.
- ❌ Skip Zod validation on incoming data.
- ❌ Use `<img>` instead of `next/image`.
- ❌ Add `useMemo` / `useCallback`.
- ❌ Destructure props in the function signature.
- ❌ Run any npm script not listed in Section 3.
- ❌ Reformat code unrelated to the current change.
- ❌ Commit with a vague message like "fix" or "update".

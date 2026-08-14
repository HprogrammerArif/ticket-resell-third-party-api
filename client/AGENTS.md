# AGENTS

## Principles
- Clarity and consistency over cleverness. Minimal changes. Match existing patterns.
- Keep components/functions short; break down when it improves structure.
- TypeScript everywhere; no `any` unless isolated and necessary.
- No unnecessary `try/catch`. Avoid casting; use narrowing.
- Named exports only (no default exports, except Next.js pages).
- Absolute imports via `@/` unless same directory.
- Follow existing OxLint/Ultracite setup; don't reformat unrelated code.
- Zod: `import type * as z from 'zod'` for types only; `import * as z from 'zod'` when using runtime values.
- Let compiler infer return types unless annotation adds clarity.
- Options object for 3+ params, optional flags, or ambiguous args.
- Hypothesis-driven debugging: 1-3 causes, validate most likely first.

## Token efficiency
- Skip recaps unless the result is ambiguous or you need more input.

## Commands
Only these `bun run` scripts: `build-local`, `lint`, `check:types`, `check:deps`, `check:i18n`, `test`, `test:e2e`.

## Git Commits
Conventional Commits: `type: summary` without scope. The summary should be a short, specific sentence that explains what changed and where or why, not a vague phrase. Types: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`. `BREAKING CHANGE:` footer when needed.

## Env
All env vars validated in `Env.ts`; never read `process.env` directly.

## Styling
Tailwind v4 utility classes. Reuse shared components. Responsive. No unnecessary classes.

## React
- No `useMemo`/`useCallback` (React compiler handles it). Avoid `useEffect`.
- Single `props` param with inline type; access as `props.foo` (no destructuring).
- Use `React.ReactNode`, not `ReactNode`.
- Inline short event handlers; extract only when complex.

## Pages
- Default export name ends with `Page`. Props alias (if reused) ends with `PageProps`.
- Locale pages: `props: { params: Promise<{ locale: string }> }` → `await props.params` → `setRequestLocale(locale)`.
- Escape glob chars in shell commands for Next.js paths.
- Dashboard pages (sit behind auth); define meta once in layout, not in each page.

## i18n (next-intl)
- Never hard-code user-visible strings. Page namespaces end with `Page`.
- Server: `getTranslations`; Client: `useTranslations`.
- Context-specific keys (`card_title`, `meta_description`). Use `t.rich(...)` for markup.
- Use sentence case for translations.
- Error messages: short, no "try again" variants.

## JSDoc
- Start each block with `/**` directly above the symbol.
- Short, sentence-case, present-tense description of intent.
- Order: description → `@param` → `@returns` → `@throws` (only if it can throw).

## Tests
- `*.test.ts` for unit tests; `*.integ.ts` for integration tests; `*.e2e.ts` for Playwright tests.
- `*.test.ts` co-located with implementation; `*.integ.ts` and `*.e2e.ts` in `tests/` directory.
- Top `describe` = subject; nested `describe` to group scenarios or contexts.
- `it` titles: short, third-person present, `verb + object + context`. Sentence case, no period.
- Omit "should/works/handles/checks/validates". State what, not how.
- Avoid mocking unless necessary.

## Architecture & Modes
- **Mode 1: Landing Page**: Pure frontend. Do not invoke database or ORM code. Ignore `src/models` and `DB.ts`.
- **Mode 2: Custom Backend**: Frontend-only relying on external APIs. Use `src/libs/ApiClient.ts` for all data fetching.
- **Mode 3: Full Stack**: Built-in backend. Use Drizzle ORM in `src/models` and Next.js Route Handlers / Server Actions for business logic.
- Always verify the current project context to determine the active mode before writing code or suggesting architectural patterns.

## Production Best Practices
- **Security**: Always sanitize inputs. Validate all incoming data and API responses with Zod.
- **Performance**: Use `next/image` for images and `next/font` for fonts. Leverage React Server Components (RSC) to minimize client-side JavaScript. Implement streaming with Suspense for data-heavy components.
- **Error Handling**: Use the standardized `ApiError` class for API interactions. Never expose sensitive internal server errors to the client.
- **Accessibility**: Use semantic HTML tags. Include appropriate ARIA attributes for interactive components. Ensure keyboard navigability and follow WCAG guidelines.
- **State Management**: Prefer URL search parameters for shareable state. Use React state for localized UI state. Avoid global state libraries unless the application complexity demands it.

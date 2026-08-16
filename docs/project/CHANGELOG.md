# Changelog

This file tracks all meaningful changes to the project documentation and architecture decisions. Add one entry per change — newest at the top.

Format:
```
## YYYY-MM-DD — Short description
- What changed
- Why it changed
- Which files were affected
```

---

## 2026-08-16 — Docs reconciled with actual repo state; MapWidget3 finding logged

- `02-phases.md` was stale: Phases 2 and 3 were marked `[NOT STARTED]` despite being fully implemented and committed. Corrected: Phase 2 → `[NEEDS REVIEW]`, Phase 3 → `[DONE]`, engineering checklists checked off to match git history.
- Logged a TicketNetwork support finding: CatalogAPI only returns a price-range summary, not real ticket groups or a seat map. The Seatics MapWidget3 (`docs/MapWidget3+Integration+Guide.pdf`) is required for that — affects the Phase 2 event detail page and overlaps Phase 5/7 (pre-checkout, checkout redirect) scope. Added to Feature Requests Log as `[LOGGED]`; needs brainstorming + design-doc update before any implementation, per the documentation-first rule.
- No code changed in this pass — documentation only.

---

## 2026-08-13 — Phase 0 post-review fixes

- Fixed `ApiError` prototype chain (`Object.setPrototypeOf`) — `instanceof` was silently broken in CommonJS TypeScript
- Fixed `server/CLAUDE.md` dev script (missing `--env-file=.env`)
- Added `server/.env.example` with all required keys and Windows note
- Made `vitest.config.mts` `setupFiles` path absolute via `fileURLToPath`
- Added schema comments: AdminUser is intentionally separate from User (super-admin credentials); GiftCardRedemption has no updatedAt by design (immutable financial record)
- Commit: `f7b4e25`

---

## 2026-08-13 — Phase 0 completed

- Express server scaffolded and running on port 8000 (`server/`)
- Prisma schema migrated (8 tables: User, AdminUser, GiftCard, GiftCardRedemption, CachedCategory, CachedEvent, CachedPerformer, CachedVenue)
- Health endpoint `GET /health` → `{"status":"ok"}` with passing test (1/1)
- `server/CLAUDE.md` created with agent instructions for backend work
- `vitest.config.mts` (renamed from .ts to silence ESM warning)
- `client/.env` — `BACKEND_API_URL=http://localhost:8000` uncommented
- Root `npm run dev` starts both services concurrently via `concurrently`
- `server/package.json` dev script updated to load `.env` via `--env-file` flag
- No secrets in git history; `.env` gitignored in both root and server

---

## 2026-08-13 — Initial documentation suite created

- Created full doc suite: 00-INDEX, 01-project-overview, 02-phases, 03-tech-decisions, 04-ai-tooling, 05-backend-spec, 06-frontend-spec
- Recorded all confirmed TicketNetwork integration details (Private Label model, OAuth2, CatalogAPI endpoints, WCID 12498)
- Recorded Figma design file: Ticket Love — https://www.figma.com/design/O1FzG0lsNLxynQw8oqqIhZ/Ticket-Love?node-id=0-1&m=dev
- Tech decisions: Prisma for backend ORM (not Drizzle), Drizzle remains in client but unused (Mode 2)
- Defined 8 build phases with status tracking and checklists
- Established documentation-first rule: no code until docs and plan are approved
- Defined MCP server stack: Figma MCP (active), Postgres MCP (to install), Browser Tools MCP (to install)

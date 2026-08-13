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

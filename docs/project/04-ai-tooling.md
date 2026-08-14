# 04 — AI Tooling

**Last Updated:** 2026-08-13

---

## Overview

This file documents everything needed to configure Claude Code for maximum effectiveness on this project. It covers MCP servers, skills, CLAUDE.md conventions, and the Figma design workflow.

Read this file at the start of every Claude Code session to ensure all tools are active.

---

## MCP Servers

MCP (Model Context Protocol) servers extend Claude Code with additional capabilities. Each server below should be installed and active.

### 1. Figma MCP (Official) — INSTALLED

**Purpose:** Design-to-code. Lets Claude read Figma designs, extract component specs, colours, typography, and spacing directly — eliminating the need to manually describe or screenshot UI to Claude.

**Status:** Already active in this Claude Code session.

**Figma file:** Ticket Love
**URL:** `https://www.figma.com/design/O1FzG0lsNLxynQw8oqqIhZ/Ticket-Love?node-id=0-1&m=dev`

**How to use in a session:**
1. Run `/figma-design-to-code` skill before calling any Figma MCP tool.
2. Pass the Figma URL above to `get_design_context` to pull the component spec.
3. Use `get_screenshot` to visually verify a component before implementing it.
4. Never implement a UI component from a screenshot alone — always pull the Figma spec first.

**Before every `use_figma` call:** run the `/figma-use` skill (mandatory prerequisite).

---

### 2. Postgres MCP

**Purpose:** Lets Claude query the PostgreSQL database directly during development — inspect schema, debug data issues, verify migrations applied correctly, check gift card records, etc.

**Status:** Needs to be installed.

**Install instructions:**
```bash
# In Claude Code settings, add this MCP server:
# Package: @modelcontextprotocol/server-postgres
# Connection string: your local PostgreSQL URL (from server/.env)
```

**When to use:**
- After running a Prisma migration — verify the schema was applied correctly.
- Debugging a gift card redemption issue — inspect the actual DB record.
- Checking that catalog cache tables have data.
- Never use in production without explicit intent — reads are safe, writes are risky.

**Security note:** Only connect the MCP to your local dev database, not production.

---

### 3. Browser Tools MCP

**Purpose:** Lets Claude inspect the running Ticket Love site in a real Chrome browser — read console errors, inspect network requests, take screenshots, check visual output, and verify API calls are working.

**Status:** Needs to be installed.

**Install instructions:**
```bash
# Package: @agentdesks/mcp-browser-tools
# Requires the companion Chrome extension to be installed
# See: github.com/AgentDeskAI/browser-tools-mcp
```

**When to use:**
- After implementing a new page — Claude can visually verify it matches the Figma design.
- When an API call fails on the frontend — Claude can inspect network requests.
- When debugging a layout or styling issue — Claude can take a screenshot and compare to Figma.
- During Phase 7 (checkout redirect) — verify the UTM params are being passed correctly.

---

### 4. Filesystem MCP

**Purpose:** Native to Claude Code — read and write files in the project directory.

**Status:** Always active. No setup needed.

---

## Skills

Skills are pre-defined workflows that Claude Code follows for specific task types. Always invoke the relevant skill before starting that type of work.

### Skills to use on this project

| Skill | When to invoke | Command |
|-------|---------------|---------|
| `brainstorming` | Before designing any new feature or significant change | `/brainstorming` |
| `writing-plans` | After brainstorming, before writing any code | `/writing-plans` |
| `feature-dev` | When implementing a feature with codebase context | `/feature-dev` |
| `frontend-design` | When implementing Figma designs as React components | `/frontend-design` |
| `figma-design-to-code` | Before calling any Figma MCP tool (mandatory) | `/figma-design-to-code` |
| `figma-use` | Before every `use_figma` MCP tool call (mandatory) | `/figma-use` |
| `systematic-debugging` | When a bug or unexpected behaviour is encountered | `/systematic-debugging` |
| `test-driven-development` | When writing backend modules or any testable unit | `/test-driven-development` |
| `code-review` | Before merging any feature branch | `/code-review` |
| `verification-before-completion` | Before claiming any task is done | `/verification-before-completion` |

### Skill priority order

1. Process skills first (`brainstorming`, `systematic-debugging`) — these determine HOW to approach the task.
2. Implementation skills second (`frontend-design`, `feature-dev`) — these guide execution.

---

## CLAUDE.md Files

CLAUDE.md files tell Claude Code the rules and context for a specific part of the project.

### `client/CLAUDE.md` — EXISTS AND IS COMPLETE

Location: `client/CLAUDE.md`
Status: Detailed, 14KB, covers all Next.js, TypeScript, Tailwind, Drizzle (unused), i18n, testing, and Git conventions.

**Key rules Claude must follow from this file:**
- Mode 2 architecture: frontend calls backend via `ApiClient.ts` — never touch DB directly.
- No `any`, no `useEffect`, no `useMemo`/`useCallback`, no props destructuring.
- All strings in `src/locales/en.json` — never hard-code.
- RSC by default — `"use client"` only when truly needed.
- Named exports only (except Next.js page/layout/error files).
- Never import `DB.ts` from any client code.

**TicketNetwork-specific rules to follow (not yet in CLAUDE.md — enforced here):**
- The TicketNetwork Consumer Key, Secret, and access tokens live ONLY in the Express backend's environment variables.
- Never expose TicketNetwork credentials in any `NEXT_PUBLIC_` variable.
- Never call TicketNetwork APIs from Next.js — always proxy through Express.

---

### `server/CLAUDE.md` — TO BE CREATED IN PHASE 0

Location: `server/CLAUDE.md`
Status: Does not exist yet. Create during Phase 0 when the Express backend is scaffolded.

**Content guidelines for when it is created:**

```markdown
# server/CLAUDE.md

## Architecture
- Express + TypeScript backend
- Prisma ORM → PostgreSQL
- This is a proxy/API server — it never serves HTML/UI

## Module structure
src/modules/ticketnetwork/  ← TN auth + catalog wrapper
src/modules/giftcards/      ← gift card service + routes
src/modules/users/          ← user service + routes
src/modules/admin/          ← admin service + routes
src/middleware/             ← rate limiter, error handler, authenticate
src/routes/                 ← route index
src/app.ts                  ← Express app (no listen())
src/server.ts               ← server entry point (listen here)

## TicketNetwork rules (non-negotiable)
- Consumer Key and Secret ONLY from environment variables — never hardcode
- Token is always cached in memory — never generate a new token per request
- All CatalogAPI calls include websiteConfigId=12498
- On 401 fault code 900901: fetch new token, retry once, then throw
- Respect 60 req/min rate limit — use rate limiter middleware

## Prisma rules
- Schema in prisma/schema.prisma
- Prisma client is a singleton — import from src/libs/db.ts
- Never instantiate PrismaClient directly — always use the singleton
- Run migrations with: npx prisma migrate dev (dev) or npx prisma migrate deploy (prod)

## Error handling
- Use ApiError class for all API-layer errors
- Never expose stack traces or Prisma error details to the client
- Log errors with a logger (e.g., pino) — never console.log in production

## Security
- All routes except /health and /api/auth/* require authentication middleware
- Admin routes require role check middleware
- Zod validation on all incoming request bodies
- Never return 200 for an error — use correct HTTP status codes
```

---

## Figma Workflow

**File name:** Ticket Love
**Figma URL:** `https://www.figma.com/design/O1FzG0lsNLxynQw8oqqIhZ/Ticket-Love?node-id=0-1&m=dev`

### How to implement a Figma screen

1. Open a Claude Code session.
2. Run `/figma-use` skill (mandatory before any `use_figma` call).
3. Run `/figma-design-to-code` skill (mandatory before reading design context).
4. Call `get_design_context` with the Figma URL and the specific node/frame to implement.
5. Call `get_screenshot` to get a visual reference.
6. Run `/frontend-design` skill to guide the implementation.
7. Implement the component/page in Next.js, matching the Figma spec exactly.
8. Use Browser Tools MCP to screenshot the running page and compare to Figma.

### Screens available in Figma

| Screen | Figma node | Next.js route |
|--------|-----------|--------------|
| Home Page (full) | node-id=0-1 | `/` |
| Home — Nav & Hero | separate section | `/` (hero component) |
| Home — Browse Category | separate section | `/` (categories component) |
| Home — Events This Weekend | separate section | `/` (weekend events component) |
| Home — Popular Artists | separate section | `/` (artists component) |
| Home — Browse by City | separate section | `/` (cities component) |
| Home — Gift Card | separate section | `/` (gift card promo component) |
| Home — How It Works | separate section | `/` (how it works component) |
| Home — Footer | separate section | layout footer |
| Event Details 1–4 | separate screens | `/events/[id]` |
| Artist Details 1–3 | separate screens | `/artists/[id]` |
| Checkout Process 1–3 | separate screens | `/checkout` |
| Gift Card Checkout 1–2 | separate screens | `/gift-cards` |
| User Dashboard 1–6 | separate screens | `/dashboard` |
| Log In | separate screen | `/sign-in` |
| Sign Up | separate screen | `/sign-up` |
| Forget Password | separate screen | `/forgot-password` |
| Change Password | separate screen | `/dashboard/change-password` |

---

## Session Start Checklist

At the start of every Claude Code session on this project:

- [ ] Read `00-INDEX.md` (conventions, status badges, update protocol)
- [ ] Read `02-phases.md` to see current phase status and any blockers
- [ ] Read the relevant spec file for today's work (`05-backend-spec.md` or `06-frontend-spec.md`)
- [ ] Confirm Figma MCP is active (can call `get_screenshot` on the Figma URL)
- [ ] Confirm Postgres MCP is active (can run a `SELECT 1` on the local DB)
- [ ] Invoke the relevant skill before starting any task

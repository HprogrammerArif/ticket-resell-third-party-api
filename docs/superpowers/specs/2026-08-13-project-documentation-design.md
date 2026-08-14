# Design Spec — Project Documentation Suite

**Date:** 2026-08-13
**Topic:** Ticket Love — Full project documentation setup
**Status:** Approved and implemented

---

## What Was Designed

A living documentation suite for the Ticket Love ticket reselling platform, covering business model, engineering architecture, AI tooling, and the phased build plan.

## Structure Chosen

Option B — Structured Doc Suite with Index. Located at `docs/project/`.

## Key Decisions Made in This Session

- Backend ORM: Prisma (not Drizzle)
- Frontend ORM: Drizzle remains in client boilerplate, intentionally unused (Mode 2)
- Figma file: Ticket Love — https://www.figma.com/design/O1FzG0lsNLxynQw8oqqIhZ/Ticket-Love?node-id=0-1&m=dev
- Documentation-first rule: no code until docs and plan approved
- MCP servers: Figma (active), Postgres (to install), Browser Tools (to install)
- 8 phases defined with status tracking

## Files Created

- `docs/project/00-INDEX.md`
- `docs/project/01-project-overview.md`
- `docs/project/02-phases.md`
- `docs/project/03-tech-decisions.md`
- `docs/project/04-ai-tooling.md`
- `docs/project/05-backend-spec.md`
- `docs/project/06-frontend-spec.md`
- `docs/project/CHANGELOG.md`

## Next Step

Run `/writing-plans` to create the Phase 0 implementation plan.

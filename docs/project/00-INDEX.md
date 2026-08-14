# Ticket Love — Project Documentation Suite

**Last Updated:** 2026-08-13
**Project:** Ticket Love (ticket reselling platform)
**Client:** Steven
**Author:** Mohammed Arif

---

## What This Suite Is

This is the single source of truth for the Ticket Love project — covering business decisions, engineering architecture, AI tooling setup, and the phased build plan. Every major decision, open question, and feature request is tracked here.

Both you (as developer/business owner) and AI agents (Claude Code) should read the relevant doc before starting any work on a phase or feature.

---

## File Map

| File | Purpose | Open When |
|------|---------|-----------|
| `00-INDEX.md` | This file — conventions, navigation, procedures | Start of every session |
| `01-project-overview.md` | Business model, stakeholders, TicketNetwork details, constraints | Onboarding, reviewing scope, business questions |
| `02-phases.md` | Phased build plan with status badges and checklists | Planning work, tracking progress, adding features |
| `03-tech-decisions.md` | Architecture Decision Records (ADRs) for every major tech choice | Before changing a tech pattern or stack choice |
| `04-ai-tooling.md` | MCP servers, skills, CLAUDE.md conventions, Figma workflow | Setting up a new dev machine, starting a Claude session |
| `05-backend-spec.md` | Express server module design, Prisma schema, TicketNetwork integration | Building or modifying the backend |
| `06-frontend-spec.md` | Next.js page structure, Figma-to-route mapping, component patterns | Building or modifying the frontend |
| `CHANGELOG.md` | Running log of doc and decision changes | After updating any doc |

---

## The Documentation-First Rule

> **No code execution begins until the relevant phase documentation and implementation plan are written and approved.**

This applies to every phase and every new feature. The workflow is always:

```
Brainstorm → Design doc → Implementation plan → Code → Review → Deploy
```

If a client requests a new feature mid-project, follow the Feature Request Procedure below before touching any code.

---

## Status Badge System

Used consistently in `02-phases.md` and throughout all docs:

| Badge | Meaning |
|-------|---------|
| `[NOT STARTED]` | Work has not begun |
| `[IN PROGRESS]` | Actively being worked on |
| `[DONE]` | Fully complete and verified |
| `[BLOCKED: reason]` | Cannot proceed — reason stated |
| `[DEFERRED]` | Intentionally postponed |
| `[NEEDS REVIEW]` | Complete but awaiting sign-off |

---

## Open Questions Protocol

Any unresolved question in any doc is tagged inline:

- `[OPEN]` — not yet answered, needs action
- `[RESOLVED: YYYY-MM-DD — answer]` — answered, date recorded
- `[DEFERRED: reason]` — not answering now, intentionally

When an open question is resolved, update the tag inline and add an entry to `CHANGELOG.md`.

---

## How to Update a Doc

1. Open the relevant file.
2. Make your changes.
3. Update the `Last Updated` date at the top of that file.
4. Add one line to `CHANGELOG.md` describing what changed and why.
5. If the change affects another doc (e.g., a tech decision that changes the backend spec), update that doc too and log it.

Keep edits focused — don't rewrite sections that haven't changed.

---

## Feature Request Procedure

When Steven (or anyone) requests a new feature after development has started:

1. **Log it** — add a row to the Feature Requests Log in `02-phases.md` with the date, description, and requestor.
2. **Assess impact** — does it fit into an existing phase, or does it need a new phase?
3. **Run brainstorming** — open a Claude Code session and run `/brainstorming` for the feature. This produces a design doc in `docs/superpowers/specs/`.
4. **Write an implementation plan** — Claude Code runs `/writing-plans` after brainstorming.
5. **Update `02-phases.md`** — add the feature to the appropriate phase or create a new one.
6. **Update `CHANGELOG.md`**.
7. Only then: start coding.

---

## AI Agent Instructions

When Claude Code opens a session on this project:

1. Read `00-INDEX.md` (this file) first.
2. Read `04-ai-tooling.md` to confirm MCP servers and skills are active.
3. Read the relevant spec doc for the area of work (`05-backend-spec.md` or `06-frontend-spec.md`).
4. Check `02-phases.md` to see current phase status and any blockers.
5. Follow the Documentation-First Rule — do not write code for an undocumented feature.

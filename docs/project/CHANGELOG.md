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

## 2026-08-20 — Seat map bound to an explicit env var, not `NODE_ENV`

The MapWidget3 embed rendered nothing once the app ran in Docker, having worked throughout local development.

**🔴 The Seatics host was selected from `NODE_ENV`.** `MapWidgetEmbed.tsx` loaded `mapwidget3.seatics.com` whenever `NODE_ENV === 'production'`. That conflates two unrelated questions: how the bundle was compiled, and which TicketNetwork catalog supplied the event ID. `npm run dev` gave `development` → sandbox Seatics → working map. The Docker image sets `NODE_ENV=production` → production Seatics → blank panel, because sandbox catalog event IDs do not exist there. Confirmed against event 5215228 (Hamilton, Richard Rodgers Theatre): sandbox host returns `emptyEvent:false` / `mapIsInteractive:true`, production host returns `emptyEvent:true` / `mapIsInteractive:false`, for both `690` and `12498`. Logged as R26.

Replaced with `NEXT_PUBLIC_MAPWIDGET_ENV` (`sandbox` | `production`), which must track `TN_BASE_URL`. Unlike the other `NEXT_PUBLIC_*` ARGs this one **does** carry a default, because the asymmetry is reversed: the dangerous value is `production`, so a forgotten value must fall back to sandbox. The default lives only in `client/Dockerfile` — not also in the workflow — to avoid recreating the two-layer silent fallback removed earlier today. Switching to production maps is an explicit `build-args:` edit.

**Q4 closed as non-blocking.** The Maps `websiteConfigId` was flagged `[LIKELY 12498]` with an open action to swap it from `690`. Both values return an identical live map on sandbox Seatics, so the value was left at `690` and the action struck. The config ID was never the fault; the host was.

**Files:** `client/src/components/catalog/MapWidgetEmbed.tsx`, `client/src/libs/Env.ts`, `client/Dockerfile`, `client/.env`, `client/.env.production.example`, `docker-compose.dev.yml`, `docs/project/07-ticketnetwork-liaison.md` (R26, Q4, Immediate Actions), `docs/project/08-deployment.md`.

---

## 2026-08-21 — Host changed: GoDaddy → Hostinger (D1 rewritten)

The GoDaddy VPS is being cancelled before anything was deployed to it. Two problems, and the second is the one that decided it.

**The cPanel problem (what we went looking for).** cPanel consumed 1.35 GB of 4 GB with zero sites deployed, held ports 80/443, and cost **$239.88/year** as a separate licence — confirmed by GoDaddy support. The intended fix was a rebuild without it. **That is not possible:** the rebuild wizard offers only `AlmaLinux 8/9/10 (cPanel)` under a heading reading *"Choose an operating system — Includes cPanel"*, and the server already ran AlmaLinux 10 (cPanel), so a rebuild would have produced an identical machine.

**The Docker problem (what actually decided it).** Asked directly, GoDaddy answered in writing: *"GoDaddy does not support the use of Docker applications or containers on our hosting environment. While installation may be possible, such applications may be restricted or blocked by system administrators."* The entire architecture is Docker (D2). A provider stating they may block the core technology is not a platform to build on, regardless of whether it would have worked in practice.

Two details reinforced it: their reply recommended **Remote Desktop Connection** — a Windows tool — for a Linux server, indicating a template answer for a different product; and their point 4 confirmed self-managed configurations fall outside their support scope.

**Timing.** Nothing was deployed, no DNS pointed at the server, no data existed. Migration cost was hours. After launch it would have meant downtime, DNS propagation, and migrating a live database holding customer accounts and gift-card balances. This was the cheapest possible moment to move.

**New target: Hostinger VPS KVM 2** — 2 vCPU / 8 GB / Ubuntu 24.04 LTS, no control panel, US region. Docker is a supported documented feature there. AWS was considered and rejected: variable billing suits a cost-sensitive client project poorly, its free-tier instances are too small for this stack (1 GB against ~1.3 GB needed), and its strengths apply to none of this workload yet. Recorded in D1 with revisit triggers.

**Doc changes:**

- **D1 rewritten** end to end — was "remove cPanel, rebuild as plain AlmaLinux", now "host on Hostinger, not GoDaddy"
- **Phase A rewritten for Ubuntu** — `apt` for `dnf`, `ufw` for `firewalld`, `unattended-upgrades` for `dnf-automatic`, `sudo` group for `wheel`, `systemctl restart ssh` for `sshd`. Two Ubuntu-specific traps documented: fail2ban needs `backend = systemd` on 24.04 because sshd logs to the journal rather than `auth.log`, and Docker must come from Docker's own repo rather than `apt install docker.io`. Added an A14 verification checklist
- **Phase H2 added — staging domain.** Caddy can only prove HTTPS by obtaining a real Let's Encrypt certificate against a real domain, so without one the first live test of certificate issuance happens on `ticketlove.net` itself. A throwaway domain lets the whole stack be rehearsed first, and keeps failed attempts off `ticketlove.net`'s issuance rate limit. Phase I now runs its checklist against staging before the real domain
- **Domain separation made explicit** in Phase H. The domain stays registered at GoDaddy; only a DNS record changes. Flagged that the hosting cancellation must not touch `ticketlove.net`, `rezerve.la`, or `funnwurkz.com` — a lapsed domain is effectively unrecoverable
- **Appendix B removed** (cPanel/Apache coexistence) — obsolete with no control panel
- Memory figures updated throughout: ~1.3 GB of **8 GB** rather than 4 GB. The pressure that motivated D3 and P10 is gone on this hardware; D3 (build in CI) is kept anyway, since server builds would still contend with a live Postgres and the pipeline already works
- Placeholder `<NEW_IP>` throughout until the server is provisioned

**Not affected:** nothing built so far is wasted. The Dockerfiles, Compose stack, CI pipeline, and published images move to any Linux host unchanged — which is exactly the portability D2 was chosen for. CI remains green.

**Files affected:** `08-deployment.md` (§1.1, D1, Phase A, Phase H, Phase I, Part 6, Appendix B), `02-phases.md` (Phase 0 and Phase 8 host references, new Steven action items).

---

## 2026-08-20 — Deployment review fixes + Sentry removed

Review pass over the Docker/CI work below. Three findings would have broken the deploy, one was a credential leak, and Sentry was removed at the client's request.

**🔴 Real TicketNetwork credentials in `.env.docker.example`.** `TN_CONSUMER_KEY` and `TN_CONSUMER_SECRET` were byte-identical to `server/.env`, and root `.gitignore` explicitly force-included the file via `!.env.docker.example`. One `git add .` would have published live TN Sandbox keys to a public repo. Caught while still untracked, so no history rewrite or key rotation was needed. Replaced with placeholders and renamed to `.env.example`; every other value in the file was already a correct placeholder.

**🔴 `${POSTGRES_PASSWORD}` interpolated to empty — the whole stack would not start.** Compose reads `${VAR}` interpolation from the shell environment or a file named literally `.env` in the project directory; `env_file:` only injects into containers and does **not** feed interpolation. With `/opt/ticketlove/.env.docker` and no `.env`, `POSTGRES_PASSWORD` resolved empty, `postgres:17-alpine` refuses to initialise without a password, and the failure cascades `db` → `migrate` → `api` → `web` → `caddy`. Fixed by standardising on the filename `.env` (Compose then covers both jobs, with no `--env-file` flag to forget in the workflow, `rollback.sh`, or `backup.sh`). *This error originated in `08-deployment.md` as first written.*

**🔴 The `migrate` service could not find the Prisma CLI.** `prisma` was a devDependency, but the runtime image builds `node_modules` with `npm ci --omit=dev`, so `npx prisma migrate deploy` would have downloaded the CLI from the registry on every deploy — slow, dependent on npm egress from the VPS, and a hard failure if the registry is unreachable. Moved `prisma` to `dependencies`; lockfile verified to record it as production.

**🟠 `docker-compose.override.yml` renamed to `docker-compose.dev.yml`.** Compose auto-merges the `override` filename on every `docker compose up`. A stray copy in `/opt/ticketlove` would have injected `build:` blocks and `NEXT_PUBLIC_APP_URL: http://localhost:3000` into a production deploy. Now requires an explicit `-f`, which removes the footgun rather than relying on remembering.

**🟠 CI fallback defaults removed.** `secrets.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID || '690'` in the workflow *and* an `ARG …=690` default in `client/Dockerfile` meant two independent layers of silent fallback for a value that is still `[OPEN]` with TicketNetwork — a wrong config ID could ship to production with no signal at all. Both defaults dropped, plus an explicit guard in the Dockerfile that fails the build naming the missing variable.

**Sentry removed entirely (client request) — ADR-012 superseded.** Uninstalled `@sentry/nextjs`; deleted `client/src/instrumentation.ts` and `client/src/instrumentation-client.ts`; stripped `withSentryConfig` from `next.config.ts`; removed the reporting call from `global-error.tsx`; cleared `NEXT_PUBLIC_SENTRY_DISABLED` from `client/Dockerfile`, `playwright.config.ts`, and `.vscode/launch.json`; dropped `@sentry/nextjs` from `.vscode/settings.json` and `.env.sentry-build-plugin` from `client/.gitignore`. Lockfile regenerated with `--package-lock-only`.

> **This leaves a real gap, recorded in ADR-012 and the Phase 8 checklist:** there is now no aggregated error tracking and no alerting. Backend errors go to Pino and land in `docker compose logs`, capped at 10 MB × 3 files. That is enough to debug an incident you already know about, and not enough to learn about one you do not. Uptime monitoring catches *down*, not *broken*. Options if it is wanted back: Sentry free tier, GlitchTip (self-hostable, Sentry-SDK-compatible), Highlight, or shipping Pino output to a log service.

**Minor:** de-duplicated the JSDoc block in `server/src/libs/cache.ts` (the original survived above the new `logger` import, leaving two copies with an import wedged between); restored the "sensitive tables" note dropped from ADR-009 in the rewrite; trimmed a stray trailing newline in `ticketnetwork/client.ts`.

**Verified:** `npm run build` emits `dist/server.js` at the expected path (confirming P2 is genuinely fixed), and the full suite passes — 46 tests across 8 files. The `/api/catalog/*` path corrections in `routes.test.ts` match the real mount in `routes/index.ts`; those tests were previously wrong.

**Files affected:** `.env.example` (replaces `.env.docker.example`), `docker-compose.yml`, `docker-compose.dev.yml` (renamed), `.gitignore`, `.github/workflows/deploy.yml`, `server/Dockerfile`, `server/package.json`, `server/package-lock.json`, `server/src/libs/cache.ts`, `server/src/modules/ticketnetwork/client.ts`, `client/Dockerfile`, `client/package.json`, `client/package-lock.json`, `client/next.config.ts`, `client/src/app/global-error.tsx`, `client/playwright.config.ts`, `client/.vscode/*`, `client/.gitignore`, and docs `02-phases.md`, `03-tech-decisions.md`, `05-backend-spec.md`, `08-deployment.md`.

---

## 2026-08-20 — Pre-flight fixes implemented, Dockerized stack, CI/CD pipeline, and gaps resolved

Applied all 11 pre-flight code fixes (P1–P11), implemented Docker and CI/CD configurations, and resolved documentation/config gaps in accordance with `08-deployment.md`:

- **P1**: Added `output: 'standalone'` to `client/next.config.ts` and made Sentry optional/disabled for initial deployment.
- **P2**: Added `server/tsconfig.build.json` and updated `server/package.json` build script. Fixed TypeScript compilation errors across modules and routes (`ZodError.issues`, index signatures).
- **P3 & P4**: Added `app.set('trust proxy', 1)`, `helmet()`, `compression()`, and request body limits in `server/src/app.ts`. Documented why CORS is intentionally absent.
- **P5**: Added graceful `SIGTERM`/`SIGINT` shutdown handlers with connection draining, Prisma disconnection, and TicketNetwork token revocation in `server/src/server.ts`.
- **P6 & P7**: Converted `client/.env.production` to `client/.env.production.example`, updated `.gitignore` across root and client, and removed duplicate `client/pnpm-lock.yaml`.
- **P8**: Expanded root `.gitignore` to cover build outputs, logs, and env files.
- **P9**: Added database-ping readiness check endpoint `GET /health/ready` in `server/src/app.ts`.
- **P10**: Bounded `node-cache` instance with `maxKeys: 5000` and protected `.set()` from throws in `server/src/libs/cache.ts`.
- **P11**: Adjusted `RATE_LIMIT_MAX_REQUESTS` to 45 (TN Production limit of 50 req/min).
- **Docker & Compose**: Created multi-stage `server/Dockerfile`, `client/Dockerfile`, `.dockerignore` files, `docker-compose.yml`, `docker-compose.override.yml`, `Caddyfile`, and `.env.docker.example`.
- **CI/CD & Ops**: Created `.github/workflows/deploy.yml`, `infra/backup.sh` (encrypted dumps + off-server sync), and `infra/rollback.sh`.
- **Documentation**: Synchronized `docs/project/03-tech-decisions.md` (ADR-009 & ADR-010) and `docs/project/02-phases.md`.

---

## 2026-08-20 — Phase 8 deployment plan written (`08-deployment.md`)

Comprehensive production deployment plan for the GoDaddy VPS. Written because hosting was the last unresolved Phase 0 business task and the server (`ticketlove.net`, 72.167.46.90, AlmaLinux 10 + cPanel, 2 vCPU / 4 GB / 100 GB) is provisioned and empty.

**Six architecture decisions recorded (Part 2):**

- **D1 — remove cPanel, rebuild as plain AlmaLinux.** It consumes 1.35 GB of 4 GB with zero sites deployed, owns ports 80/443, and serves a PHP/WordPress workflow this stack never uses. There are no cPanel sites yet, so the migration cost is zero today and only grows. Email should go to a dedicated provider, never self-hosted
- **D2 — Docker + Compose** for all four services
- **D3 — build images in GitHub Actions, never on the VPS.** `next build` (React Compiler + Tailwind 4 + Sentry source maps) peaks at 2–4 GB; building on a 4 GB box that is also running Postgres invites the OOM killer, which targets the largest process — usually Postgres. This is a hard constraint of the hardware, not a preference
- **D4 — Express and Postgres are never published to the host.** Enabled for free by an architecture discovery: `ApiClient.ts` uses `cookies()` from `next/headers` and `BACKEND_API_URL` sits in the `server:` block of `Env.ts`, so **the browser never talks to Express**. That BFF property means no public API subdomain, no CORS, and no TLS certificate for the backend. Every other decision depends on preserving it
- **D5 — Caddy over nginx + Certbot.** Automatic certificate renewal removes the most common way a small production site breaks
- **D6 — self-hosted Postgres in Docker + mandatory encrypted off-server backups.** This **resolves the open item in `03-tech-decisions.md`** ("Production uses a managed Postgres service — provider TBD in Phase 8"); GoDaddy offers no managed Postgres. Chosen over Neon/Supabase because the Next.js server issues DB-backed queries on every authenticated render and a 10–50 ms external round trip on each is a user-visible tax. Conditional on a tested restore drill — `GiftCard.balance` and the immutable `GiftCardRedemption` records are financial data on a single-VPS volume

**Twelve pre-flight code issues found and documented (Part 3).** Not yet fixed — Documentation-First. Four are production bugs rather than polish:

- **P3** — `trust proxy` is unset, so behind Caddy every user shares one rate-limit bucket. At `RATE_LIMIT_MAX_REQUESTS = 55`, roughly a dozen simultaneous visitors would 429 the entire site
- **P11** — that same constant is stale in the dangerous direction: its comment says "stay under TN's 60 req/min", but **R24/D6 above record Production at 50 calls/min**. Should drop to 45. (Caveat noted in the doc: it is a per-IP inbound limiter, never an exact outbound enforcement — a token bucket around `ticketnetwork/client.ts` is the real fix if volume ever approaches the ceiling)
- **P5** — no SIGTERM handler, so every deploy severs in-flight requests and orphans the TN OAuth token instead of revoking it
- **P2** — `server/tsconfig.json` has `include: ["src", "tests"]` with `rootDir: "src"`, which normally raises TS6059 on emit and may mean `dist/server.js` never lands where `npm start` and the Dockerfile expect it. **Flagged as unverified** — `server/node_modules` is not installed in the current checkout, so this could not be confirmed by running it. Check first
- Also: **P6** `client/.env.production` is git-tracked with a commented-out `SENTRY_AUTH_TOKEN` line (harmless today, a loaded gun), **P7** two competing lockfiles in `client/`, **P1** missing `output: 'standalone'`, **P10** the `maxKeys` gap on the cache discussed this session
- **P12** — the MapWidget3 iframe question (liaison **D4**) is recorded as a **launch gate, not a deployment gate**: build all the infrastructure, but do not point real customers at it until TN resolves the iframe recommendation

**Files affected:** `08-deployment.md` (new), `00-INDEX.md` (file map row), `02-phases.md` (Phase 8 expanded from 12 generic tasks to the P1–P12 + A–I checklist; hosting choice marked done; done-criteria tightened with a port scan and a verified restore)

**Still open:** whether GoDaddy permits an OS rebuild without cPanel (Appendix B documents the coexistence fallback), off-server backup provider, and transactional email provider.

---

## 2026-08-20 — Ian answered all 13 questions; scope reductions and one new risk

Recorded as R12–R25 and D1–D6 in `07-ticketnetwork-liaison.md`. What it means for the build:

- **D1 — the customer Orders area cannot be built.** No order data, no webhooks, no cancellation notifications: "I don't see this being possible since we are facilitating end to end." TicketNetwork gives the *customer* an account, linked from their receipt email. The Figma Orders and notification screens have no data source and never will. Remove, or replace with a pointer to that email link — needs Steven's decision and a `06-frontend-spec.md` update
- **D2 — venue pages get no seat map.** MapWidget is the only surface; no image endpoints exist
- **D3 — branding is capped at logo and button colour** on both checkout and transactional emails. The widget itself we can still restyle freely. Steven approved a Figma that implies more than this
- **D4 — new risk: TicketNetwork does not recommend iframes**, which our MapWidget3 embed depends on because their script uses `document.write`. Either Integration Support blesses it, supplies an SPA path, or the event page needs re-architecting. Do not promote to production until resolved
- **D5 — payout paperwork is off the critical path.** Banking details are submitted after go-live, not before. Bi-weekly payouts, ~$5 minimum, clawback on cancellations and lost chargebacks. This reverses the 2026-08-19 assessment that it was the biggest launch risk
- **D6 — Production is 50 calls/min, below Sandbox's 60.** Catalog caching in the Express layer is now a launch requirement, not an optimisation
- **Gift cards are possible after all** — via promo codes created ahead of time in TN Portal, with the discount coming out of our margin. But margin on Ian's own worked example is $12.50 on a $120 order, so a gift card can exceed the entire margin. Whether TN caps, rejects, or allows negative commission is unanswered and blocks pricing any denomination
- Maps `websiteConfigId` is believed to be **12498**, not the placeholder `690` currently in `client/.env:13` — testable now, pending Integration Support confirmation
- Ian routes technical questions to `IntegrationSupport@ticketnetwork.com` and keeps commercial, Portal access, branding and payouts himself. Two items are now blocked on *us*: the email address to open the TN Portal account under, and clarifying what we meant by "checkout information"
- Documentation only — no code changed in this pass

## 2026-08-19 — TicketNetwork liaison doc created; NDA signed; MapWidget3 guide analysed

- Created `07-ticketnetwork-liaison.md` — the single record of what TicketNetwork has confirmed (R1–R11), what we verified ourselves from their artifacts (V1–V14), what's still open (13 questions), and the blocking dependency map. Registered it in `00-INDEX.md`
- **NDA signed and returned by Steven** — the Phase 7 blocker recorded since 2026-08-11 is cleared on our side; Sandbox checkout access requested from Ian
- Read the full MapWidget3 guide (94pp). Findings that change plans:
  - Checkout hand-off is `Seatics.config.useC3` + `c3CheckoutDomain` — this is the Private Label handoff the NDA unlocks, and we still need our real domain value
  - **Promo codes reach TN checkout** via `c3PromoCode` / `sea_promo_code`. This reverses the working assumption that gift cards could never apply to ticket purchases, and now gates Steven's gift card design
  - TN cannot charge in non-USD — currency support is display-only. Affects the fr locale's scope
  - Mobile layout (<992px) requires hiding site header and footer or the widget's layout calculations break — not yet implemented, real bug risk
  - Widget bundles Bootstrap 3.4.1 + jQuery 3.6.0 unless suppressed via `includeBootstrap=false` / `includeJQuery=false` — we use neither
  - Widget exposes a tracking event listener (`Seatics.TrackingEvents.registerEventListener`) — this is the GTM/analytics hook for Phase 5
- Verified against `docs/swagger.json`: CatalogAPI v2 has **no image, photo, media or logo fields in any model**, and the only `description` in the schema is on category hierarchies. All imagery and editorial copy is ours to source and license — recorded as settled (V1), deliberately not raised with TN
- The two MapWidget3 follow-ups logged 2026-08-16 (iframe vs. top-level checkout navigation; `http://` sub-resources under HTTPS) are folded into open question 10 in the liaison doc
- Documentation only — no code changed in this pass

## 2026-08-16 — MapWidget3 integrated on event detail page

- Replaced the custom price-range-only "Tickets" tab with TicketNetwork's Seatics MapWidget3 embed (`MapWidgetEmbed` component), which shows real ticket-group listings, an interactive seat map, and owns the pre-checkout → TN-hosted-checkout hand-off
- Sidebar simplified to static event facts only (price/CTA removed — the widget now owns that)
- New env var `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` (placeholder value `690` from TN's public guide — not yet confirmed as our real Maps config ID)
- Updated `06-frontend-spec.md` and Phase 5 in `02-phases.md`: the custom `/checkout` review page is deprioritized since the widget now owns that flow
- Widget is embedded via an `<iframe srcDoc="...">` containing its own static HTML document with a blocking `<script>` tag, rather than `next/script` — TN's widget script relies on `document.write`, which browsers reject for scripts injected asynchronously by `next/script`, so the widget needs a real synchronously-parsed document context (see `docs/superpowers/specs/2026-08-16-mapwidget3-integration-design.md`)
- Follow-up: confirm the real `websiteConfigId` with TicketNetwork before treating this as fully verified
- Follow-up: verify whether TN's MapWidget3 checkout hand-off navigates the whole page (`window.top.location`) or just the iframe (`window.location`) on ticket-selection completion — untested; if it's the latter, checkout would render awkwardly inside the 900px embedded frame
- Follow-up: TN's widget script loads some sub-resources over plain `http://` even when the parent page is served over `https://` — the dev-only smoke test (HTTP end-to-end) couldn't exercise this, so HTTPS mixed-content behavior is unverified
- This integration should not be promoted to a user-facing/production environment until: the real `websiteConfigId` is confirmed with TicketNetwork, AND the checkout hand-off behavior is verified on an HTTPS environment

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

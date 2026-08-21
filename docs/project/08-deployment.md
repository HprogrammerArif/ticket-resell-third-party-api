# 08 — Production Deployment

**Last Updated:** 2026-08-21 (host changed GoDaddy → Hostinger; Phase A rewritten for Ubuntu; staging domain added)
**Status:** `[NOT STARTED]` — this document is the plan for Phase 8
**Target:** Hostinger VPS, Ubuntu 24.04 LTS (`ticketlove.net`, IP TBC)
**Audience:** written for someone deploying for the first time. Every step says *what* to run and *why* it matters.

---

## How to Read This Document

- **Part 1** — what you already have, and what the constraints actually are.
- **Part 2** — the six architecture decisions, each with the reasoning. Read this before running anything.
- **Part 3** — pre-flight code changes. **The app cannot deploy correctly without these.** Some are outright bugs in production.
- **Part 4** — the deployment itself, Phase A through Phase I, in order.
- **Part 5** — the runbook: how to deploy, roll back, restore, and debug once it is live.
- **Part 6** — cost, scaling, and what to do when you outgrow this.
- **Appendix** — glossary and troubleshooting.

> **Reality check before you start:** Phase 7 (checkout redirect) is `[BLOCKED: NDA not signed]` and the backend still points at TicketNetwork **Sandbox** (`TN_BASE_URL=https://sandbox.tn-apis.com/catalog/v2`). What you are building here is the *production infrastructure*. It is real, permanent, and worth doing now — but do not point real customers at it until TN production credentials exist. See Phase I.

---

## Part 1 — What You Have Today

### 1.1 The server

**Host changed 2026-08-21: GoDaddy → Hostinger.** See D1 for why. The original GoDaddy VPS was cancelled before anything was deployed to it.

| Property | Value | What it means |
|---|---|---|
| Provider | Hostinger VPS (KVM 2) | Docker is a supported, documented feature here — the reason for the move. |
| OS | Ubuntu 24.04 LTS, no control panel | Package manager is `apt`; firewall is `ufw`. |
| Control panel | **None** | Deliberate. Nothing competes for ports 80/443. |
| IP | `<NEW_IP>` — fill in once provisioned | DNS will point here. |
| CPU | 2 vCPU | Same as the old server. |
| RAM | **8 GB** | Double the old 4 GB. The headroom problem is gone. |
| Disk | ~100 GB NVMe | Plenty. |
| Region | United States | Near the US ticket-buying audience and TicketNetwork's API. |
| Access | SSH key set at provisioning | No password ever transmitted. |

### 1.2 The domain

`ticketlove.net`, registered at GoDaddy with Full Privacy protection. Privacy protection affects WHOIS only — it does not interfere with DNS records or TLS certificates.

You also own `rezerve.la` and `funnwurkz.com`. Neither is used here.

### 1.3 The application

| Piece | Stack | Notes |
|---|---|---|
| `client/` | Next.js 16, React 19, Tailwind 4, next-intl | SSR app. Also acts as the API gateway (see below). |
| `server/` | Express 4, TypeScript, Prisma 6, Pino, Zod | TicketNetwork catalog proxy + user auth. |
| Database | PostgreSQL via Prisma | 8 tables. `GiftCard.balance` is real money — backups are not optional. |
| Cache | `node-cache`, in-process | See `server/src/libs/cache.ts`. Deliberate; documented in `03-tech-decisions.md`. |

### 1.4 The single most important thing about this codebase

**The browser never talks to Express.**

Every call to the backend goes through the Next.js server:

- `client/src/libs/ApiClient.ts:51` reads `Env.BACKEND_API_URL` and uses `cookies()` from `next/headers` — that is a **server-only** API.
- `BACKEND_API_URL` is declared in the `server:` block of `client/src/libs/Env.ts`, not the `client:` block. `@t3-oss/env-nextjs` enforces this — referencing it from browser code throws.
- The eight route handlers in `client/src/app/api/auth/*` are Next.js server routes that forward to Express.

This is the **Backend-for-Frontend (BFF)** pattern, and it is a gift for deployment:

- Express **never needs a public IP, a domain, or a TLS certificate.**
- **No CORS configuration needed** — there is no cross-origin request to configure.
- **No `api.ticketlove.net` DNS record needed.**
- The entire attack surface of your API is removed from the internet.

Every decision below depends on preserving this property. If you ever add a browser `fetch()` straight to Express, you break it — and you would then need CORS, a public API subdomain, and its own public rate limiting.

---

## Part 2 — Architecture Decisions

These follow the ADR format used in `03-tech-decisions.md`.

---

### D1 — Host on Hostinger, not GoDaddy

**Decision:** Run on a Hostinger KVM 2 VPS with Ubuntu 24.04 LTS and no control panel. The GoDaddy VPS is cancelled.

**Context:** The project began on a GoDaddy VPS that shipped with cPanel. Two separate problems emerged, and only one of them was the one we went looking for.

**Problem 1 — cPanel.** It is built for PHP and WordPress hosting. It consumed 1.35 GB of 4 GB with zero sites deployed, held ports 80/443 that the reverse proxy needs, and cost **$239.88/year** as a separate licence. None of it was used by a Node.js application.

The intended fix was to rebuild without it. **That turned out to be impossible:** GoDaddy's rebuild wizard offers only `AlmaLinux 8/9/10 (cPanel)` under a heading that reads *"Choose an operating system — Includes cPanel."* The server already ran AlmaLinux 10 (cPanel), so rebuilding would have produced an identical machine.

**Problem 2 — the decisive one.** Asked directly, GoDaddy support answered in writing:

> *"GoDaddy does not support the use of Docker applications or containers on our hosting environment. While installation may be possible, such applications may be restricted or blocked by system administrators."*

The entire architecture is Docker (D2). A provider stating they may block the core technology is not a platform to build a business on — regardless of whether it would have worked in practice.

Two further details informed the call. Their reply recommended **Remote Desktop Connection**, a Windows tool, for a Linux server — evidence the answer was a template for a different product. And their point 4 confirmed self-managed configurations fall outside their support scope entirely.

**Why now rather than later:** at the time of the decision nothing was deployed — no DNS pointed at the server, no data existed, no site was live. Migration cost was a few hours. After launch it would have meant downtime, DNS propagation, and migrating a live database holding real customer accounts and gift-card balances. This was the cheapest possible moment to move.

**Why Hostinger:** Docker is a supported, documented feature rather than a tolerated one. No control-panel licence. The KVM 2 tier ships 8 GB against the old 4 GB, which removes the memory-headroom constraint that shaped several decisions below. AWS was considered and rejected — variable billing is a poor fit for a cost-sensitive client project, its free tier instances are too small for this stack, and its strengths (elasticity, managed services, global scale) apply to none of this workload yet.

**Consequences:**
- Phase A is written for Ubuntu (`apt`, `ufw`, `unattended-upgrades`), not AlmaLinux.
- No control panel means nothing competes for ports 80/443 — Caddy binds them directly.
- **The domain stays registered at GoDaddy.** Registrar and host are independent; only a DNS record changes. Cancelling hosting must not touch `ticketlove.net`, `rezerve.la`, or `funnwurkz.com`.
- Nothing built to this point is wasted. The containerised app, Compose file, CI pipeline, and images move to any Linux host unchanged — which is precisely the portability D2 was chosen for.
- **Revisit AWS when** traffic outgrows one server, managed database backups matter more than a predictable bill, or infrastructure spend becomes noise against revenue.

---

### D2 — Docker + Docker Compose

**Decision:** Every process runs in a container, orchestrated by a single `docker-compose.yml`.

**Context:** The alternative is installing Node, PostgreSQL, and a process manager (PM2/systemd) directly on the server.

**Why Docker here:**

- **The image you test is the image that runs.** No "works on my machine" caused by a Node version difference between your Windows box and the server.
- **Your stack is genuinely multi-service.** Next.js + Express + PostgreSQL + a reverse proxy is exactly the shape Compose is for.
- **Rollback is one command.** Images are tagged by git commit; reverting is re-pointing a tag and restarting.
- **Network isolation is free.** Postgres and Express bind to the internal Docker network only and are unreachable from the internet — which is precisely what §1.4 enables.

**Consequences:** You must learn about ten Docker commands (Part 5 lists them). Images consume disk — prune periodically.

---

### D3 — Build images in GitHub Actions, never on the VPS

**Decision:** CI builds and pushes images to GitHub Container Registry (GHCR). The VPS only ever **pulls** and runs them.

**Context:** The obvious beginner approach is `git pull && docker compose up --build` on the server.

**Why that fails on this specific server:** `next build` on this project runs the React Compiler and Tailwind 4 over a large dependency tree. That routinely peaks at **2–4 GB of RAM**. You have 4 GB total, shared with a running Postgres and the currently-live version of the app. The build will trigger the OOM killer, and the OOM killer will usually kill Postgres, because it targets the largest resident process.

**A production site must not go down in order to deploy.** Building elsewhere is not a stylistic preference here — it is a hard requirement of a 4 GB box.

**Secondary benefits:** builds are reproducible, tests gate deploys, and build-time secrets never touch the server.

**Consequences:** Requires GitHub Actions setup (Phase G). Your repo is already at `github.com/HprogrammerArif/ticket-resell-third-party-api`, so the prerequisite is in place.

---

### D4 — Express and PostgreSQL are never published to the host

**Decision:** Only the reverse proxy publishes ports (80, 443). `api` and `db` are reachable exclusively over the internal Docker network.

**Context:** See §1.4 — the BFF pattern makes this free.

**Why it matters:** A published port on a cloud VPS is scanned within minutes. An exposed Postgres is the single most common cause of database ransoming. By omitting the `ports:` key on those services, they are not merely firewalled — **they have no host-side listener at all.**

In Compose, `expose:` (container-to-container) and `ports:` (published to the host) are different things. We use only the former for `api` and `db`.

**Consequences:** To inspect the database you must go through the server (`docker compose exec db psql`) or open a temporary SSH tunnel. Both are covered in Part 5. This is a small inconvenience in exchange for removing your largest risk.

---

### D5 — Caddy as the reverse proxy and TLS terminator

**Decision:** Use **Caddy** rather than nginx + Certbot.

**Context:** Something must terminate HTTPS and forward to Next.js.

**Why Caddy:** It obtains and renews Let's Encrypt certificates automatically, with no cron job, no `certbot renew`, and no separate ACME challenge configuration. The complete config for this project is about eight lines. The most common way a small production site breaks is an expired TLS certificate after a renewal hook silently failed months earlier — Caddy removes that failure mode entirely.

nginx is more widely known, and there is nothing wrong with it. But for a solo operator deploying for the first time, "certificates cannot silently expire" is worth more than familiarity. Caddy is mature and widely used in production, and if you later need nginx, the reverse-proxy layer is the easiest piece to swap — nothing else in the stack depends on it.

**Consequences:** Fewer engineers know Caddy syntax. Advanced tuning has less Stack Overflow coverage. Neither applies at your scale.

---

### D6 — Self-hosted PostgreSQL in Docker, with mandatory off-server backups

**Decision:** Run PostgreSQL as a container on the VPS with a named volume, plus **automated nightly encrypted dumps pushed to off-server object storage** and a **quarterly tested restore**.

**Context:** `03-tech-decisions.md` currently says *"Production uses a managed Postgres service (provider TBD in Phase 8)."* GoDaddy does not offer managed PostgreSQL, so that decision must be resolved here.

**Options considered:**

| | Self-hosted in Docker | Managed (Neon / Supabase) |
|---|---|---|
| Cost | $0 | $0 on free tier, then ~$25/mo |
| Latency | ~0.1 ms (same host) | 10–50 ms per query, every query |
| Backups | **You own this** | Automated, point-in-time |
| Ops burden | Patching, tuning, monitoring | None |
| Failure mode | Disk loss = total loss without backups | Vendor terms change; cold starts |

**Decision rationale:** Self-hosted keeps one stack, one mental model, and one `docker-compose.yml`. Your data volume is small and the VPS disk is 100 GB. Critically, **your Next.js server issues database-backed queries on every authenticated page render** — a 30 ms round trip to an external provider on each one is a real, user-visible tax that a local socket does not pay.

**The condition attached:** self-hosting is only acceptable *with disciplined off-server backups*. `GiftCard.balance` and `GiftCardRedemption` are financial records — the schema explicitly documents `GiftCardRedemption` as an immutable financial record. Losing them is unrecoverable, and a Docker volume on a single VPS is a single point of failure. A backup that has never been restored is not a backup; that is why Phase F includes a mandatory restore drill.

**Revisit this if:** you take on a second app server, you need point-in-time recovery, or backup discipline slips. Migrating later is a `pg_dump` and a connection-string change — this is not a one-way door.

---

## Part 3 — Pre-Flight Code Changes

Ten changes the codebase needs before it can deploy correctly. Several are production bugs, not polish. **None have been made yet** — this document is the plan; per the Documentation-First Rule, code follows approval.

Legend: 🔴 blocker · 🟠 production bug · 🟡 hygiene

---

### 🔴 P1 — `next.config.ts` needs `output: 'standalone'`

**File:** `client/next.config.ts`

Without it, the Docker image must contain the full `node_modules` tree — this project has a very large dev dependency set (Storybook, Playwright, Vitest, lint tooling), producing an image well over 1 GB. With `standalone`, Next traces only the files actually reached at runtime and emits a self-contained `server.js`.

**Measured on 2026-08-20:** the web image is **426 MB**, of which the application payload (`/app`) is only **70 MB** — the rest is the `node:22-bookworm-slim` base. Without `standalone` this would be several times larger.

On a 4 GB / 100 GB server that pulls a new image on every deploy, this is the difference between a fast deploy and a slow, disk-hungry one.

```ts
const baseConfig: NextConfig = {
  output: 'standalone',   // <- add
  devIndicators: { position: 'bottom-right' },
  poweredByHeader: false,
  reactStrictMode: true,
  reactCompiler: process.env.NODE_ENV === 'production',
  logging: { browserToTerminal: process.env.BROWSER_TO_TERMINAL_DISABLED !== 'true' },
};
```

---

### 🔴 P2 — `tsconfig.json` will likely break `npm run build`

**File:** `server/tsconfig.json`

```jsonc
"outDir": "dist",
"rootDir": "src",
"include": ["src", "tests"]   // <- tests/ is OUTSIDE rootDir
```

`server/tests/` sits outside `rootDir: "src"`. When `tsc` emits — which `npm run build` does — files outside `rootDir` normally raise **TS6059** and the build fails. It has not been noticed because development uses `tsx watch`, which never emits, and `vitest` does its own transpilation.

Even if the installed TypeScript version tolerates it, emitting tests into `dist/` shifts the output layout so that `dist/server.js` — the path both `npm start` and the Dockerfile depend on — may not exist where expected.

**Fix:** add a build-only config and point the build script at it.

```jsonc
// server/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests", "**/*.test.ts"]
}
```

```jsonc
// server/package.json
"build": "tsc -p tsconfig.build.json"
```

> **Verify this first.** `server/node_modules` is not installed in the current checkout, so this could not be confirmed by running it. Run `cd server && npm install && npm run build && ls dist/` and confirm `dist/server.js` exists. Do this *before* writing the Dockerfile — it is the fastest thing to check and it invalidates the image build if wrong.

---

### 🟠 P3 — `trust proxy` is unset, which breaks rate limiting

**File:** `server/src/app.ts`

Behind Caddy, every request arrives at Express from the proxy's IP. Express's `req.ip` therefore returns the *proxy's* address for all traffic, and `express-rate-limit` keys its buckets on `req.ip`.

The result: **all users worldwide share one rate-limit bucket.** `RATE_LIMIT_MAX_REQUESTS` is 55/minute (`server/src/config/constants.ts`, sized to stay under TicketNetwork's 60/min ceiling). With a shared bucket, roughly a dozen simultaneous visitors would trigger HTTP 429 for everyone — the whole site would appear broken under mild load.

```ts
const app = express();
app.set('trust proxy', 1);   // exactly 1 proxy hop (Caddy)
```

`1` means "trust one hop." Using `true` trusts the entire `X-Forwarded-For` chain, which lets a client spoof its IP and evade the limiter completely. Never use `true` on a public app.

---

### 🟠 P4 — No security headers

**File:** `server/src/app.ts`

`app.use(express.json())` is the only middleware. Add `helmet` for standard security headers and `compression` for response size. Also bound the JSON body explicitly.

```ts
import helmet from 'helmet';
import compression from 'compression';

app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '100kb' }));
```

This is defence in depth: Express is not internet-facing under D4, and Caddy handles headers for the public surface.

---

### 🟠 P5 — No graceful shutdown

**File:** `server/src/server.ts`

Currently:

```ts
app.listen(env.PORT, () => { logger.info(...); });
```

Docker sends `SIGTERM` and waits 10 seconds before `SIGKILL`. With no handler, three things go wrong on every deploy:

1. In-flight HTTP requests are severed mid-response — users see connection resets during each deploy.
2. Prisma's connection pool is not drained, leaving sockets for Postgres to time out.
3. `revokeToken()` in `server/src/modules/ticketnetwork/auth.ts` is never called, so the TicketNetwork OAuth token is orphaned rather than revoked.

```ts
const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    try {
      await revokeToken();
      await prisma.$disconnect();
    } catch (err) {
      logger.error(err, 'Error during shutdown');
    }
    process.exit(0);
  });
  // Never let a hung connection block shutdown past Docker's grace period
  setTimeout(() => process.exit(1), 9000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
```

---

### 🟠 P6 — `client/.env.production` is committed to git

`git ls-files` confirms `client/.env.production` is **tracked**. It is currently harmless — every sensitive value is commented out — but it is a loaded gun:

```
# SENTRY_AUTH_TOKEN=
```

The moment anyone fills that in locally, `git add` commits a live credential. (That specific key is gone now that Sentry has been removed — the pattern is what matters.) `client/.gitignore` only ignores `.env*.local`, so `.env.production` is not covered.

**Fix:**
```bash
git rm --cached client/.env.production
mv client/.env.production client/.env.production.example
# then add to client/.gitignore:
#   .env
#   .env.production
```

Commit `.env.production.example` with placeholder values so the required keys stay documented.

---

### 🟠 P7 — Two lockfiles in `client/`

`client/` contains **both** `package-lock.json` and `pnpm-lock.yaml`. Docker builds use `npm ci`, which requires `package-lock.json` and fails outright if it disagrees with `package.json`. Two lockfiles means two sources of truth and a real chance CI resolves different versions than your machine.

**Fix:** standardise on npm — the rest of the repo already does, since the root `dev` script calls `npm run dev --prefix`. Then `rm client/pnpm-lock.yaml`.

---

### 🟡 P8 — Root `.gitignore` is too thin

Currently five lines. Build output is not ignored, so `server/dist/` can be committed by accident. (`client/.gitignore` covers `.next`; the root does not, and `server/` has no `.gitignore` at all.)

```gitignore
node_modules/
.DS_Store
*.log
.env
.env.local
.env.production

# build output
dist/
.next/
out/
*.tsbuildinfo

```

---

### 🟡 P9 — `/health` is shallow

**File:** `server/src/app.ts` — `/health` returns `{status:'ok'}` without touching the database. Docker and any uptime monitor will report "healthy" while Postgres is unreachable.

Split liveness from readiness — the standard distinction:

```ts
// Liveness — is the process alive? Used by Docker's HEALTHCHECK.
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Readiness — can it actually serve? Used by uptime monitoring.
app.get('/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});
```

Keep `HEALTHCHECK` pointed at `/health`. If liveness required the database, a brief Postgres restart would make Docker kill and restart a perfectly healthy API.

---

### 🟡 P10 — Cache has no `maxKeys`

**File:** `server/src/libs/cache.ts:11` — `new NodeCache({ stdTTL: 0, checkperiod: 120, useClones: false })`.

TTLs do expire entries, so this is not unbounded forever — but it *is* unbounded **within a TTL window**, and the suggest endpoints are the exposure. `TTL.SUGGEST` is 5 minutes (`server/src/routes/catalog.ts:44`) and the cache key is built from raw user input, so the key space is attacker-controlled. A typeahead loop or a crawler hitting distinct `q` values can accumulate several minutes' worth of distinct large payloads.

On a 4 GB box also hosting Postgres and Next.js, that is an OOM waiting to happen — and the OOM killer will most likely take Postgres, not the API.

```ts
const cache = new NodeCache({
  stdTTL: 0,
  checkperiod: 120,
  useClones: false,
  maxKeys: 5000,   // <- bound it
});
```

`NodeCache` **throws** when `maxKeys` is exceeded, so wrap the `cache.set` call inside `cacheGet` in a try/catch that logs and returns the fetched value uncached. Never let a full cache turn into a 500.

---

### 🟠 P11 — The rate-limit constant exceeds TicketNetwork's *production* ceiling

**File:** `server/src/config/constants.ts`

```ts
export const RATE_LIMIT_MAX_REQUESTS = 55;   // stay under TN's 60 req/min
```

That comment describes **Sandbox**. `07-ticketnetwork-liaison.md` R24/D6 records Ian's answer of 2026-08-19: **Production starts at 50 calls/min**, lower than Sandbox Trial's 60. The constant and its comment are now stale in the direction that breaks things.

```ts
export const RATE_LIMIT_MAX_REQUESTS = 45;   // TN Production ceiling is 50 req/min (R24); Sandbox was 60
```

Two caveats worth being precise about:

- This limiter is **per-client-IP inbound**, not a global outbound throttle to TicketNetwork, so it was never an exact enforcement of the TN ceiling — it is a coarse guard.
- The `node-cache` layer absorbs the large majority of catalog reads, so real outbound volume is far below inbound. D6 in the liaison log is explicit that this caching is *"a launch requirement rather than an optimisation"* — which the code already satisfies.

If sustained traffic ever approaches the ceiling, the correct fix is an outbound token-bucket around the TicketNetwork client (`server/src/modules/ticketnetwork/client.ts`), not a lower inbound limit. TN will raise the cap on request if you hit errors (R24).

---

### 🔴 P12 — MapWidget3 iframe risk is an explicit go-live blocker

Not a code change — a gate. `07-ticketnetwork-liaison.md` **D4** records that TicketNetwork *does not recommend iframes*, and the MapWidget3 embed depends on one because their script uses `document.write`. The liaison log states plainly: **"Do not promote to production until resolved."**

This does not block building the infrastructure in Part 4 — build all of it. It blocks **Phase I4**, pointing real customers at the result. Resolution paths, per D4: Integration Support blesses the iframe, they supply an SPA-friendly path, or the event page is re-architected.

Track it as a launch gate, not a deployment gate.

---

### Pre-flight checklist

```
[ ] P1  next.config.ts -> output: 'standalone'
[ ] P2  tsconfig.build.json + verify `npm run build` emits dist/server.js   <- DO THIS FIRST
[ ] P3  app.set('trust proxy', 1)
[ ] P4  helmet + compression
[ ] P5  graceful SIGTERM/SIGINT shutdown
[ ] P6  untrack client/.env.production
[ ] P7  delete client/pnpm-lock.yaml
[ ] P8  expand root .gitignore
[ ] P9  /health/ready with db ping
[ ] P10 cache maxKeys + throw handling
[ ] P11 RATE_LIMIT_MAX_REQUESTS -> 45 (TN Production ceiling is 50, not 60)
[ ] P12 MapWidget3 iframe question resolved with TN   <- launch gate, not deploy gate
```

---

## Part 4 — The Deployment

### Target topology

```
                        Internet
                            |
        ticketlove.net  ->  A record  ->  <NEW_IP>
        www.ticketlove.net ->  A record ->  <NEW_IP>
                            |
                            v
              +---------------------------+
              |  caddy   :80  :443        |   <- ONLY published ports
              |  auto Let's Encrypt TLS   |
              +---------------------------+
                            | reverse_proxy web:3000
                            v
              +---------------------------+
              |  web  (Next.js)  :3000    |   internal only
              +---------------------------+
                            | fetch http://api:8000
                            v
              +---------------------------+
              |  api  (Express)  :8000    |   internal only
              +---------------------------+
                            | postgresql://db:5432
                            v
              +---------------------------+
              |  db  (PostgreSQL) :5432   |   internal only
              |  volume: pgdata           |
              +---------------------------+

  All four services share one private Docker network ("internal").
  Only caddy is attached to the host's public interface.
```

---

### Phase A — Prepare the server

Written for **Ubuntu 24.04 LTS**. Run every command as `root` unless stated otherwise. Substitute the real IP for `<NEW_IP>` throughout.

**A1. Provision.** Hostinger VPS → KVM 2 → **Ubuntu 24.04 LTS, no control panel** → US region. Paste your SSH **public** key into the key field during setup, so no password is ever transmitted.

**A2. First login.** From PowerShell on Windows:

```powershell
ssh root@<NEW_IP>
```

Type `yes` at the host-key prompt. With the key set at provisioning, no password is requested.

**A3. Update, and install what Phase A needs.**

```bash
apt update && apt upgrade -y
apt install -y ufw fail2ban unattended-upgrades git curl vim ca-certificates
```

**A4. Timezone and clock sync.** Correct clocks matter for TLS validation and for correlating logs.

```bash
timedatectl set-timezone UTC
timedatectl set-ntp true
```

**A5. Create a non-root user.** Never run the app as root, and never SSH as root day to day.

```bash
adduser deploy                    # prompts for a password; set a strong one
usermod -aG sudo deploy           # 'sudo' is the admin group on Ubuntu (not 'wheel')
```

**A6. Give `deploy` your SSH key.** Copy root's authorised key across rather than re-pasting it:

```bash
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy/
```

> **Open a second terminal and confirm `ssh deploy@<NEW_IP>` works before continuing.**
> A7 disables password login. If the key is wrong and you have already run A7, you are locked out of your own server and need Hostinger's emergency console to recover.

**A7. Harden SSH.** Edit `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
sshd -t && systemctl restart ssh    # sshd -t validates config first; the unit is 'ssh' on Ubuntu
```

**A8. Firewall.** Deny everything inbound except SSH, HTTP, and HTTPS.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

Note what is absent: **no rule for 8000 or 5432.** The API and database are never published to the host (D4), so there is nothing to allow.

**A9. fail2ban.** Bans IPs after repeated failed SSH logins — a public VPS sees thousands of brute-force attempts daily.

```bash
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
bantime  = 1h
EOF

systemctl enable --now fail2ban
fail2ban-client status sshd
```

`backend = systemd` matters on Ubuntu 24.04: sshd logs to the journal, not to `/var/log/auth.log`, and the default file backend silently finds nothing.

**A10. Automatic security updates.**

```bash
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

systemctl enable --now unattended-upgrades
```

**A11. Add swap.** Less critical at 8 GB than it was at 4 GB, but it still converts a hard OOM kill into temporary slowness.

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10          # prefer RAM; use swap only under pressure
echo 'vm.swappiness=10' >> /etc/sysctl.conf
free -h
```

**A12. Install Docker** from Docker's official Ubuntu repository — not `apt install docker.io`, which ships an older build.

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
usermod -aG docker deploy           # lets 'deploy' run docker without sudo
docker --version && docker compose version
```

Log out and back in as `deploy` for the group change to take effect.

**A13. Cap Docker's logs.** The default JSON driver grows without limit and will eventually fill the disk. Create `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```

```bash
systemctl restart docker
```

**A14. Verify before moving on.**

```
[ ] ssh deploy@<NEW_IP> works with a key, no password
[ ] ssh root@<NEW_IP> is REFUSED
[ ] ufw status shows only 22, 80, 443
[ ] docker run --rm hello-world succeeds as the deploy user
[ ] free -h shows ~8 GB RAM and 2 GB swap
```

---

### Phase B — Dockerize the Express API

Create `server/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7

# ---- deps: install production dependencies only ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- build: full deps, generate Prisma client, compile TypeScript ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# tini reaps zombies and forwards signals correctly (pairs with P5)
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

USER node
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.js"]
```

**Why Debian slim rather than Alpine:** Prisma's query engine links against OpenSSL. On Alpine (musl libc) you must add `apk add openssl` *and* set `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` in `schema.prisma`, and the resulting errors are cryptic when it goes wrong. Debian slim costs ~40 MB and eliminates that entire class of bug. Take the 40 MB.

**Why `USER node`:** a container escape as root becomes root on the host. Running unprivileged is a one-line mitigation.

**Why `tini`:** PID 1 in Linux does not get default signal handlers. Without an init, your `SIGTERM` handler from P5 may never fire.

Create `server/.dockerignore`:

```
node_modules
dist
tests
.env
.env.*
*.log
coverage
vitest.config.mts
```

---

### Phase C — Dockerize the Next.js client

Create `client/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* are INLINED INTO THE BUNDLE AT BUILD TIME.
# They must be present here, not at runtime.
# No defaults on purpose: a missing value must fail the build loudly rather than
# silently shipping a wrong websiteConfigId or app URL to production.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID
# Which Seatics deployment serves the maps. Defaulted rather than required:
# it must track the TN catalog we point at, NOT NODE_ENV, and sandbox is the
# safe default while TN's production map path is unconfirmed (liaison D4/Q10).
ARG NEXT_PUBLIC_MAPWIDGET_ENV=sandbox
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID=$NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID \
    NEXT_PUBLIC_MAPWIDGET_ENV=$NEXT_PUBLIC_MAPWIDGET_ENV \
    NODE_ENV=production

RUN for v in NEXT_PUBLIC_APP_URL NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID; do \
      eval "val=\$$v"; \
      if [ -z "$val" ]; then echo "ERROR: required build-arg $v is empty" >&2; exit 1; fi; \
    done

# JWT_SECRET only satisfies build-time env validation; the real value arrives at
# runtime via env_file. Mounted as a secret so it never enters layer history.
RUN --mount=type=secret,id=jwt_secret \
    JWT_SECRET="$(cat /run/secrets/jwt_secret)" \
    npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
```

#### Two Next.js gotchas that will bite you

**1. `NEXT_PUBLIC_*` is build-time, not runtime.** Next inlines those values into the JavaScript sent to the browser during `next build`. Setting them in `docker-compose.yml` at runtime does nothing for browser code. They must be `ARG`s passed at build time — which means **changing `NEXT_PUBLIC_APP_URL` requires rebuilding the image**, not just restarting the container. This surprises nearly everyone the first time.

**2. `next.config.ts` imports `./src/libs/Env` on line 1.** That runs `@t3-oss/env-nextjs` validation *at build time*. Looking at `client/src/libs/Env.ts`, two variables have no default and will fail the build if absent:

- `JWT_SECRET` — `z.string().min(32)`
- `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` — `z.string()`, required

**Your CI build will fail unless both are supplied.** This is exactly the kind of thing that costs an afternoon if you meet it for the first time in a red CI log.

> `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` is flagged `[OPEN]` in `07-ticketnetwork-liaison.md` — the real `websiteConfigId` is still unconfirmed with TicketNetwork. Use the sandbox value to get the pipeline green, and treat swapping in the production value as a rebuild-and-redeploy, not a config edit.

**Why `JWT_SECRET` uses `--mount=type=secret` instead of `ARG`:** every `ARG` value is recorded in the image's layer history and is readable by anyone who pulls the image via `docker history`. A mounted secret exists only during that one `RUN` and leaves no trace in the final image.

**Why the ARGs have no defaults:** a default turns a misconfigured pipeline into a silent wrong-value deploy. `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` is still `[OPEN]` with TicketNetwork, so a baked-in fallback would ship an unverified config ID to production with no signal. The guard above fails the build instead.

**The one deliberate exception is `NEXT_PUBLIC_MAPWIDGET_ENV`, which defaults to `sandbox`.** The reasoning inverts here: the unsafe value is the *production* one. Sandbox catalog event IDs do not exist in production Seatics — the widget returns `emptyEvent:true` and renders a blank panel (R26). Since `TN_BASE_URL` points at the TN sandbox, a forgotten value must fall back to sandbox maps, not production ones. Failing the build would be worse than a correct default here, and shipping production maps against a sandbox catalog is the actual silent failure this guards against. Note it is deliberately **not** also defaulted in the workflow: that would recreate the two-layer silent fallback removed on 2026-08-20. The Dockerfile is the single source of the default. To serve production maps, add an explicit `NEXT_PUBLIC_MAPWIDGET_ENV=production` line to the `build-args:` block — a code change, reviewed and traceable, not a dashboard toggle.

**Verified 2026-08-20:** both images build clean from these Dockerfiles. The build-arg guard was tested by omitting `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID`, and the build failed with `ERROR: required build-arg NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID is empty` — naming the specific missing variable, which is the point of it.

Create `client/.dockerignore`:

```
node_modules
.next
out
.env
.env.*
!.env.production.example
*.log
coverage
test-results
playwright-report
storybook-static
.storybook
```

---

### Phase D — Compose the stack

Create `docker-compose.yml` in the repository root:

```yaml
name: ticketlove

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data          # certificates live here - MUST persist
      - caddy_config:/config
    networks: [internal]
    depends_on:
      web:
        condition: service_healthy

  web:
    image: ghcr.io/hprogrammerarif/ticketlove-web:${TAG:-latest}
    restart: unless-stopped
    env_file: [.env]
    environment:
      BACKEND_API_URL: http://api:8000     # Docker DNS resolves 'api'
    networks: [internal]
    depends_on:
      api:
        condition: service_healthy

  api:
    image: ghcr.io/hprogrammerarif/ticketlove-api:${TAG:-latest}
    restart: unless-stopped
    env_file: [.env]
    environment:
      NODE_ENV: production
      PORT: 8000
      DATABASE_URL: postgresql://ticketlove:${POSTGRES_PASSWORD}@db:5432/ticketlove
    networks: [internal]
    depends_on:
      migrate:
        condition: service_completed_successfully

  migrate:
    image: ghcr.io/hprogrammerarif/ticketlove-api:${TAG:-latest}
    restart: "no"
    command: ["npx", "prisma", "migrate", "deploy"]
    environment:
      DATABASE_URL: postgresql://ticketlove:${POSTGRES_PASSWORD}@db:5432/ticketlove
    networks: [internal]
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ticketlove
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ticketlove
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks: [internal]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ticketlove -d ticketlove"]
      interval: 10s
      timeout: 5s
      retries: 5
    command:
      - postgres
      - -c
      - shared_buffers=256MB       # ~25% of what we allot Postgres on a 4GB box
      - -c
      - max_connections=50

volumes:
  pgdata:
  caddy_data:
  caddy_config:

networks:
  internal:
    driver: bridge
```

**Note what is absent:** `api` and `db` have **no `ports:` key**. They are unreachable from the internet by construction, per D4. Only `caddy` publishes anything.

**The `migrate` service** is a one-shot container that runs `prisma migrate deploy` and exits. This is why `prisma` sits in `dependencies`, not `devDependencies`, in `server/package.json` — the runtime image is built with `npm ci --omit=dev`, so a devDependency CLI would be absent and `npx` would try to download it from the registry on every deploy.

> **The size cost of that choice, measured.** The api image is **709 MB**. `node_modules` accounts for 279 MB of it, and the Prisma CLI's subtree is the bulk: `prisma` 51 MB, plus its transitive `effect` (34 MB) and `typescript` (23 MB) — roughly **108 MB attributable to keeping the CLI in the runtime image**. (`@prisma` at 121 MB is the client and query engines, needed at runtime regardless.)
>
> This is accepted rather than optimised, for two reasons. First, Docker layer caching means the 267 MB `node_modules` layer transfers **once** — a normal code-only deploy changes just the `dist` layer, which is 258 KB. Second, the alternative (a third image built from a stage that keeps dev dependencies, purely for migrations) adds a build and a push to every CI run to save 15% on an image that is pulled rarely.
>
> Revisit only if deploys become disk- or bandwidth-bound on the VPS. `api` waits on `service_completed_successfully`, so the API never starts against an out-of-date schema. This is the standard pattern for running migrations in Compose — it beats putting migrations in an entrypoint script, where a failure is easy to miss.

A companion `docker-compose.dev.yml` holds the local `build:` blocks. It is deliberately **not** named `docker-compose.override.yml`, because Compose auto-merges that filename on every `docker compose up` — a stray copy on the server would inject local build settings (and `http://localhost:3000`) into a production deploy. Use it explicitly:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Three things about that overlay are easy to get wrong:

- **Only `api` carries a `build:` block for the server image, never `migrate`.** The two services deliberately share one tag (`ticketlove-api`), so giving both a `build:` makes Compose emit two bake targets exporting to the same name concurrently, and the containerd image store rejects the loser with `image "…ticketlove-api:latest": already exists`. `api` builds the tag; `migrate` reuses it from the local store. The practical consequence is that any hand-picked service list must include `api` — `up --build db migrate api web` works, `up --build db migrate` falls through to a registry pull.
- **The overlay must define the `jwt_secret` build secret.** `client/Dockerfile` mounts it to satisfy `@t3-oss/env-nextjs` validation in `next.config.ts`. CI supplies it through `build-push-action`'s `secrets:` (A17); locally it comes from a top-level `secrets:` block sourced from `JWT_SECRET` in `.env`. Without it the mount resolves to an empty string and the web build fails with `JWT_SECRET must be at least 32 characters`.
- **The `db` host port is 55432, not 5432.** A natively installed Postgres commonly holds 5432 on `0.0.0.0`, so the mapping fails to bind outright (`bind: An attempt was made to access a socket in a way forbidden by its access permissions`) and, more insidiously, a GUI pointed at `localhost:5432` would open that other database instead of this one. Point TablePlus/DBeaver at `localhost:55432`. Nothing inside the Compose network changes — `DATABASE_URL` still uses `db:5432`.

Only `docker-compose.yml`, `Caddyfile`, and `.env` belong in `/opt/ticketlove`.

Create `Caddyfile` in the repo root:

```
ticketlove.net, www.ticketlove.net {
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}

	reverse_proxy web:3000

	log {
		output file /data/access.log {
			roll_size 10MB
			roll_keep 5
		}
	}
}
```

That is the entire TLS setup. On first start Caddy contacts Let's Encrypt, proves domain ownership over port 80, installs the certificate, and renews it automatically thereafter. The `caddy_data` volume must persist — losing it means re-issuing certificates, and Let's Encrypt rate-limits that.

---

### Phase E — Secrets and environment

**E1. Generate strong secrets.** On the server:

```bash
openssl rand -hex 32     # JWT_SECRET
openssl rand -hex 24     # POSTGRES_PASSWORD
```

**E2. Create `/opt/ticketlove/.env`** on the server. This file **never** enters git.

```bash
sudo mkdir -p /opt/ticketlove
sudo chown deploy:deploy /opt/ticketlove
cd /opt/ticketlove
vi .env
```

```bash
# --- Database ---
POSTGRES_PASSWORD=<from openssl rand -hex 24>

# --- Auth (MUST be identical for api and web: Next verifies JWTs with jose) ---
JWT_SECRET=<from openssl rand -hex 32>
JWT_EXPIRES_IN=7d

# --- TicketNetwork (Sandbox until production credentials arrive) ---
TN_CONSUMER_KEY=<from TN DevPortal>
TN_CONSUMER_SECRET=<from TN DevPortal>
TN_WCID=12498
TN_BASE_URL=https://sandbox.tn-apis.com/catalog/v2
TN_TOKEN_URL=https://key-manager.tn-apis.com/oauth2/token
TN_REVOKE_URL=https://key-manager.tn-apis.com/oauth2/revoke

# --- Deploy ---
TAG=latest
```

```bash
chmod 600 .env     # owner-read-only
```

> **`JWT_SECRET` must match across both containers.** The Express backend signs tokens with it (`server/src/config/env.ts`) and the Next.js server verifies them with `jose` (`client/src/libs/Env.ts` requires it). A mismatch means every login silently fails authorization with no obvious error. Both services read the same `.env`, which is exactly why.

**E3. GitHub Actions secrets.** Repo → Settings → Secrets and variables → Actions:

| Secret | Purpose |
|---|---|
| `VPS_HOST` | the Hostinger VPS IP |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private key for a **separate deploy-only** keypair |
| `JWT_SECRET` | Needed at build time for Next env validation |
| `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` | Required by env validation |
| `NEXT_PUBLIC_APP_URL` | `https://ticketlove.net` |

Generate a **separate** keypair for CI (`ssh-keygen -t ed25519 -f deploy_ci`) and append its public key to `/home/deploy/.ssh/authorized_keys`. Never put your personal private key in GitHub — you want to be able to revoke CI's access without rotating your own.

---

### Phase F — Database, migrations, and backups

**F1. Migrations run automatically** via the `migrate` service (Phase D). Nothing manual on deploy.

**F2. Nightly encrypted backups.** This is the non-negotiable half of Decision D6.

Create `/opt/ticketlove/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

STAMP=$(date +%Y%m%d-%H%M%S)
DIR=/opt/ticketlove/backups
mkdir -p "$DIR"

# Dump from inside the container; compress; encrypt with a passphrase
docker compose -f /opt/ticketlove/docker-compose.yml exec -T db \
  pg_dump -U ticketlove -d ticketlove --format=custom \
  | gzip \
  | gpg --batch --yes --symmetric --cipher-algo AES256 \
        --passphrase-file /opt/ticketlove/.backup-passphrase \
        -o "$DIR/ticketlove-$STAMP.dump.gz.gpg"

# Ship off-server (Backblaze B2 / Cloudflare R2 via rclone)
rclone copy "$DIR/ticketlove-$STAMP.dump.gz.gpg" remote:ticketlove-backups/

# Retain 7 days locally; the remote holds the long tail
find "$DIR" -name '*.gpg' -mtime +7 -delete
```

```bash
chmod +x /opt/ticketlove/backup.sh
openssl rand -hex 32 > /opt/ticketlove/.backup-passphrase
chmod 600 /opt/ticketlove/.backup-passphrase
```

> **Store the backup passphrase somewhere other than this server.** A password manager. An encrypted backup you cannot decrypt because the key burned with the server is worth exactly nothing.

**F3. Schedule it.** `crontab -e` as `deploy`:

```cron
15 3 * * * /opt/ticketlove/backup.sh >> /opt/ticketlove/backup.log 2>&1
```

**F4. Off-server storage.** Backblaze B2 or Cloudflare R2. Your dumps will be a few MB; cost is cents per month. Configure with `rclone config`. **Choose a different region from your VPS** (which is US West) so a regional incident cannot take both.

**F5. The restore drill — do this once now, then quarterly.**

A backup you have never restored is a hypothesis, not a backup. Restoring is also the step where you discover the passphrase was wrong, or the dump was empty, or `pg_dump` was silently failing because the container name changed. Find that out on a Tuesday afternoon, not during an outage.

```bash
# Decrypt and restore into a scratch database
gpg --batch --decrypt --passphrase-file /opt/ticketlove/.backup-passphrase \
    backups/ticketlove-YYYYMMDD-HHMMSS.dump.gz.gpg | gunzip > /tmp/restore.dump

docker compose exec -T db createdb -U ticketlove restore_test
docker compose exec -T db pg_restore -U ticketlove -d restore_test < /tmp/restore.dump

# Verify real rows came back
docker compose exec -T db psql -U ticketlove -d restore_test \
  -c 'SELECT count(*) FROM "User";' \
  -c 'SELECT count(*) FROM "GiftCard";'

docker compose exec -T db dropdb -U ticketlove restore_test
rm /tmp/restore.dump
```

Record the date of each successful drill in `CHANGELOG.md`.

---

### Phase G — CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  # IMAGE_PREFIX is computed per-job — see note below on lowercase.

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: server/package-lock.json }
      - run: npm ci
        working-directory: server
      - run: npx prisma generate
        working-directory: server
      - run: npm run build
        working-directory: server
      - run: npm test
        working-directory: server

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API
        uses: docker/build-push-action@v6
        with:
          context: ./server
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-api:${{ github.sha }}
            ${{ env.IMAGE_PREFIX }}-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push web
        uses: docker/build-push-action@v6
        with:
          context: ./client
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-web:${{ github.sha }}
            ${{ env.IMAGE_PREFIX }}-web:latest
          build-args: |
            NEXT_PUBLIC_APP_URL=${{ secrets.NEXT_PUBLIC_APP_URL }}
            NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID=${{ secrets.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID }}
          secrets: |
            jwt_secret=${{ secrets.JWT_SECRET }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/ticketlove
            echo "TAG=${{ github.sha }}" > .tag
            docker compose pull
            docker compose up -d --remove-orphans
            docker image prune -f
```

> **Container registry names must be lowercase.** `github.repository_owner` preserves the account casing (`HprogrammerArif`), and buildx rejects that with `invalid tag: repository name must be lowercase`. Compute it instead, as the first step of the build job:
>
> ```yaml
> - name: Compute lowercase image prefix
>   run: echo "IMAGE_PREFIX=ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/ticketlove" >> "$GITHUB_ENV"
> ```
>
> `${VAR,,}` is bash lowercase expansion. This must match the hardcoded lowercase image names in `docker-compose.yml`.

**Why tag by `github.sha`:** every deploy is traceable to a commit, and rollback is re-running Compose with an older SHA. `latest` alone gives you no way back.

**GHCR authentication on the VPS.** Packages are private by default. Create a PAT with `read:packages` scope, then once on the server:

```bash
echo "<PAT>" | docker login ghcr.io -u HprogrammerArif --password-stdin
```

**One-time bootstrap on the server** — copy `docker-compose.yml` and `Caddyfile` to `/opt/ticketlove/`. They are the only two repo files the server needs; everything else arrives as an image.

---

### Phase H — DNS

**The domain stays registered at GoDaddy.** Registrar and host are separate concerns: the registrar holds the *name*, the host runs the *server*. Moving hosts changes one DNS record, nothing more. Transferring the domain would cost a renewal fee, can trigger a 60-day ICANN lock, and buys nothing.

> **When cancelling GoDaddy hosting, state explicitly that domains are not to be touched.** `ticketlove.net`, `rezerve.la`, and `funnwurkz.com` must stay registered and active. A lapsed domain can be registered by anyone, and is effectively unrecoverable.

At GoDaddy: **My Products → Domains → ticketlove.net → DNS → Manage DNS.**

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `<NEW_IP>` | 600 |
| A | `www` | `<NEW_IP>` | 600 |

**Delete any existing parking or forwarding records** for `@` and `www` — GoDaddy adds these by default and they will shadow yours.

Use TTL 600 (10 minutes) during setup so mistakes are cheap to correct. Raise it to 3600 once stable.

**Do DNS before the first `docker compose up`.** Caddy needs the domain to already resolve to this server to complete the Let's Encrypt challenge. If it starts first and fails, you burn Let's Encrypt rate-limit attempts.

Verify from your machine:

```powershell
nslookup ticketlove.net
```

#### H2 — The staging domain (strongly recommended)

If a second domain is available — a free one bundled with hosting is ideal — point it at the same server first:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `<NEW_IP>` | 600 |

Then add it to the `Caddyfile` alongside the real domain:

```
ticketlove-staging.example, ticketlove.net, www.ticketlove.net {
```

**Why this is worth the trouble:** Caddy can only prove HTTPS works by obtaining a real certificate from Let's Encrypt against a real domain. Without a staging address, the first live test of certificate issuance happens on `ticketlove.net` itself — the address customers use. With one, the entire stack can be rehearsed end to end on a throwaway name nobody knows, and the real domain is only pointed across once everything is proven.

Let's Encrypt also rate-limits certificate issuance per domain. Burning failed attempts on a staging name costs nothing; burning them on `ticketlove.net` can lock you out of HTTPS for hours.

Remove the staging hostname from the `Caddyfile` once the real domain is live, or keep it as a permanent pre-deploy rehearsal target.

---

### Phase I — Go live and verify

**I1. First launch.** On the server:

```bash
cd /opt/ticketlove
docker compose pull
docker compose up -d
docker compose ps            # every service Up; db healthy; migrate Exited (0)
docker compose logs -f caddy # watch the certificate get issued
```

**I2. Verification checklist.** Do not call this done until every line passes:

```
[ ] (if staging exists) the full checklist below passes on the staging domain FIRST
[ ] https://ticketlove.net loads with a valid padlock
[ ] http://ticketlove.net redirects to https (Caddy does this automatically)
[ ] https://www.ticketlove.net works
[ ] Sign-up creates a user; sign-in returns a session
[ ] A protected page (account) renders while logged in
[ ] Catalog/events page returns real TicketNetwork data
[ ] `docker compose exec db psql -U ticketlove -c '\dt'` lists all 8 tables
[ ] `curl -s localhost` from the server does NOT reach the API directly
[ ] `nmap <NEW_IP>` from elsewhere shows only 22, 80, 443
[ ] backup.sh runs and produces a .gpg file
[ ] The restore drill (F5) succeeds
[ ] Server logs capture a deliberately triggered error (`docker compose logs api`)
```

**I3. Uptime monitoring.** Point UptimeRobot (free) or Better Stack at `https://ticketlove.net/` every 5 minutes, with alerts to your email. Add a second check against the API readiness endpoint once you decide whether to expose `/health/ready` through Caddy — a dedicated `handle /health/ready` block in the Caddyfile forwarding to `api:8000` is the clean way, and it stays off the public app surface otherwise.

> **No error-tracking service is wired up.** Sentry was removed from the project on 2026-08-20 (see ADR-012). Until a replacement is chosen, production errors exist only in `docker compose logs`, which are capped at 10 MB × 3 files by the Docker daemon config in A13. That is enough to debug an incident you already know about, and not enough to learn about one you don't. Decide on a replacement before launch — see ADR-012 for options.

**I4. Before real customers arrive.** This stack runs against TicketNetwork **Sandbox**. Before launch:

- **Resolve the MapWidget3 iframe question (P12 / liaison D4).** The liaison log says do not promote to production until this is settled.
- **Lower `RATE_LIMIT_MAX_REQUESTS` to 45** (P11) — Production allows 50 calls/min, not Sandbox's 60.
- Obtain TN production credentials (blocked on the NDA — see `07-ticketnetwork-liaison.md`).
- Update `TN_BASE_URL`, `TN_CONSUMER_KEY`, `TN_CONSUMER_SECRET` in `.env`, then `docker compose up -d api`.
- Confirm the real `websiteConfigId` and **rebuild the web image** — it is a `NEXT_PUBLIC_*` value, so a restart is not enough (Phase C, gotcha 1).
- Re-run the full I2 checklist against production data.

---

## Part 5 — Runbook

### Daily commands

```bash
cd /opt/ticketlove

docker compose ps                  # what is running
docker compose logs -f api         # tail API logs
docker compose logs -f web         # tail Next.js logs
docker compose logs --tail=200 db  # recent Postgres logs
docker stats                       # live CPU/RAM per container
df -h                              # disk
free -h                            # memory and swap
```

### Deploy

Push to `master`. GitHub Actions handles the rest. To deploy manually:

```bash
cd /opt/ticketlove
docker compose pull && docker compose up -d
```

### Roll back

```bash
cd /opt/ticketlove
TAG=<previous-git-sha> docker compose up -d web api
```

If the bad deploy included a migration, roll the schema back first — Prisma has no automatic down-migration, so you either write a corrective migration or restore from backup. **This is the strongest argument for keeping migrations additive**: add columns, do not drop them in the same release that stops using them.

### Open a database shell

```bash
docker compose exec db psql -U ticketlove -d ticketlove
```

### Connect a GUI (TablePlus, DBeaver) from your laptop

The database has no public port by design, so tunnel over SSH:

```powershell
ssh -L 5433:localhost:5432 deploy@<NEW_IP>
```

Then point your GUI at `localhost:5433`. This requires the `db` service to publish to the host loopback; if it does not, tunnel to a temporary `socat` container or use `psql` in the container instead. Prefer the container shell — it keeps D4 intact.

### Restart one service

```bash
docker compose restart api
```

### Free up disk

```bash
docker image prune -a -f
docker system df            # see what is using space
```

### "The site is down" — triage order

1. `docker compose ps` — is anything not `Up`?
2. `docker compose logs --tail=100 <service>` — what did it say on the way down?
3. `free -h` — did something get OOM-killed? Check `dmesg | grep -i oom`.
4. `df -h` — is the disk full? Full disks stop Postgres writes cold.
5. `systemctl status docker` — is the daemon alive?
6. `curl -I https://ticketlove.net` — TLS or application failure?

---

## Part 6 — Cost and Scaling

### Running cost

| Item | Cost |
|---|---|
| Hostinger VPS (KVM 2) | fixed monthly, no variable billing |
| Domain (stays at GoDaddy) | already paid |
| cPanel license | **eliminated** — was $239.88/year (D1) |
| GHCR | free (public), generous free tier (private) |
| Backblaze B2 / R2 | ~$0.01–0.50/mo at this data volume |
| Error tracking | none — removed (ADR-012) |
| UptimeRobot | free tier |
| **Additional** | **≈ $0–5/month** |

### Expected resource use

| Service | Typical RSS |
|---|---|
| Ubuntu 24.04 base | ~250 MB |
| Docker daemon | ~100 MB |
| Caddy | ~30 MB |
| PostgreSQL | ~350 MB |
| Express API | ~200 MB |
| Next.js | ~400 MB |
| **Total** | **≈ 1.3 GB of 8 GB** |

That leaves ~6.7 GB of headroom, plus 2 GB of swap. The memory pressure that shaped D3 and P10 is gone on this hardware — but **keep building in CI anyway** (D3): builds on the server would still contend with a live Postgres, and the pipeline already works.

### When to scale

| Signal | Action |
|---|---|
| Sustained RAM > 6 GB | Upgrade the VPS tier (KVM 4) |
| CPU pinned during traffic peaks | Add a second `web` replica behind Caddy |
| Postgres becomes the bottleneck | Move it to managed (revisit D6) |
| You need zero-downtime deploys | Two `web` replicas + Caddy load balancing |
| Multiple app servers | **This is when Redis finally earns its place** — for shared rate limiting first, cache second |

The `cacheGet` abstraction in `server/src/libs/cache.ts` already isolates the cache behind one interface, so swapping `node-cache` for Redis later is a change to a single file. Do not do it before you have a second instance.

---

## Appendix A — Glossary

| Term | Meaning |
|---|---|
| **VPS** | Virtual Private Server — your own virtual machine with root access. |
| **SSH** | Encrypted remote shell. How you administer a Linux server. |
| **Docker image** | A frozen filesystem + startup command. Built once, run anywhere. |
| **Container** | A running instance of an image. |
| **Volume** | Storage that survives container replacement. Your database lives in one. |
| **Reverse proxy** | Public-facing server that forwards requests to internal apps and terminates HTTPS. |
| **TLS / SSL** | The encryption behind `https://`. The padlock. |
| **Let's Encrypt** | Free, automated certificate authority. |
| **GHCR** | GitHub Container Registry — where your built images are stored. |
| **CI/CD** | Automation that tests, builds, and deploys on every push. |
| **Migration** | A versioned schema change. Prisma generates and applies them. |
| **BFF** | Backend-for-Frontend — the browser talks only to Next.js, which talks to Express. |
| **OOM killer** | The Linux kernel killing the largest process when RAM runs out. |

---

## Appendix B — *(removed)*

This appendix covered coexisting with cPanel's Apache on the GoDaddy VPS. **Obsolete as of 2026-08-21** — D1 moved the project to a Hostinger VPS with no control panel, so nothing competes for ports 80/443. Retained as a heading only so Appendix C keeps its letter.

---

## Appendix C — Common first-deploy failures

| Symptom | Cause | Fix |
|---|---|---|
| Caddy cannot get a certificate | DNS not propagated, or port 80 blocked | `nslookup ticketlove.net`; check `ufw status` |
| Locked out after hardening SSH | A7 ran before the key was tested | Hostinger panel → emergency console |
| `next build` fails in CI on env validation | `JWT_SECRET` or `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` missing | Add both as Actions secrets (Phase E3) |
| Login succeeds, protected pages 401 | `JWT_SECRET` differs between `api` and `web` | Both must read the same `.env` |
| `dist/server.js` not found in the image | The P2 tsconfig issue | Apply `tsconfig.build.json` |
| Browser shows a stale `NEXT_PUBLIC_*` value | It is baked in at build time | Rebuild the image, do not just restart |
| API healthy but every request 429s | `trust proxy` unset (P3) | `app.set('trust proxy', 1)` |
| Postgres killed at random | OOM, usually from a build on the server | Build in CI (D3); confirm swap is on |
| `permission denied` on the docker socket | `deploy` not yet in the `docker` group | Log out and back in |
| Deploy succeeds, site unchanged | Compose reused the cached image tag | Deploy by SHA tag, not `latest` |
| `db` exits immediately; "superuser password is not specified" | The env file is not named `.env`, so `${POSTGRES_PASSWORD}` interpolated empty | Rename to `/opt/ticketlove/.env` (Phase E2) |
| `migrate` hangs or fails fetching prisma | `prisma` is in devDependencies | It belongs in `dependencies` (Phase D) |
| Production build has localhost URLs | `docker-compose.dev.yml` was copied to the server | Only `docker-compose.yml`, `Caddyfile`, `.env` go there |

---

## Related Documents

- `02-phases.md` — Phase 8 checklist mirrors Part 4 of this document
- `03-tech-decisions.md` — D6 here resolves the open "managed Postgres provider TBD"
- `05-backend-spec.md` — Express module design; P3–P5 and P9–P10 modify it
- `06-frontend-spec.md` — Next.js structure; P1 modifies `next.config.ts`
- `07-ticketnetwork-liaison.md` — Sandbox vs production credentials, `websiteConfigId` `[OPEN]`

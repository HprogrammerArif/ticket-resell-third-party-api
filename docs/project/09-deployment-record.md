# 09 — Deployment Record (As-Built)

**Last Updated:** 2026-08-22
**Status:** Infrastructure `[DONE]` — live at **https://ticketlove.net**
**Companion docs:** `08-deployment.md` (the plan) · `10-remaining-work.md` (what's left)

---

## What This Document Is

`08-deployment.md` is the *plan*. This is the *record* — what was actually built, in what order, what broke along the way, and how it was fixed.

Read this when you need to answer "how does production actually work?" or "why is it done that way?" without re-deriving it. The **Problems Hit** section in Part 9 is the most valuable part: fifteen real failures, several of which would have been very hard to diagnose after the fact.

---

## Part 0 — Where It Ended Up

```
                          Internet
                             │
     ticketlove.net ────────►│◄──────── www.ticketlove.net
     (A → 31.220.54.150)     │          (CNAME → apex)
                             ▼
              ┌──────────────────────────────┐
              │  caddy  :80 :443             │  ← only published ports
              │  Let's Encrypt, auto-renew   │
              └──────────────────────────────┘
                             │ reverse_proxy web:3000
                             ▼
              ┌──────────────────────────────┐
              │  web   Next.js 16  :3000     │  internal only
              └──────────────────────────────┘
                             │ fetch http://api:8000
                             ▼
              ┌──────────────────────────────┐
              │  api   Express 4   :8000     │  internal only
              └──────────────────────────────┘
                             │ postgresql://db:5432
                             ▼
              ┌──────────────────────────────┐
              │  db    PostgreSQL 17         │  internal only
              │  volume: pgdata              │
              └──────────────────────────────┘

  One private Docker network. Only caddy touches the public interface.
  Nightly 03:15 UTC: encrypted pg_dump → /opt/ticketlove/backups/
```

**Host:** Hostinger VPS KVM 2 — 2 vCPU, 8 GB RAM, 100 GB NVMe, Ubuntu 24.04 LTS, US (Phoenix), IP `31.220.54.150`
**Registrar:** GoDaddy (domain only — DNS records also at GoDaddy)
**Registry:** GitHub Container Registry, public packages
**Repo:** `github.com/HprogrammerArif/ticket-resell-third-party-api`, branch `master`

---

## Part 1 — The Host Change (GoDaddy → Hostinger)

The project began on a GoDaddy VPS. It was abandoned before anything was deployed, for two reasons.

**cPanel.** The server shipped with it. cPanel is built for PHP/WordPress hosting: it consumed **1.35 GB of 4 GB with zero sites deployed**, held ports 80/443 that the reverse proxy needs, and cost **$239.88/year** as a separate licence. The intended fix — rebuild without it — proved impossible: GoDaddy's rebuild wizard offers only `AlmaLinux 8/9/10 (cPanel)` under a heading reading *"Choose an operating system — Includes cPanel."* Rebuilding would have produced a byte-identical machine.

**Docker.** The decisive one. GoDaddy support, asked directly, replied in writing:

> *"GoDaddy does not support the use of Docker applications or containers on our hosting environment. While installation may be possible, such applications may be restricted or blocked by system administrators."*

The entire architecture is Docker. A provider stating they may block the core technology is not a platform to build on, regardless of whether it would have worked in practice. Two details reinforced it: the same reply recommended **Remote Desktop Connection** — a Windows tool — for a Linux server, and their point 4 confirmed self-managed setups fall outside their support scope entirely.

**Timing made it cheap.** Nothing was deployed, no DNS pointed at the server, no data existed. Migration cost hours. After launch it would have meant downtime, DNS propagation, and migrating a live database of customer accounts and gift-card balances.

**AWS was considered and rejected.** Variable billing is a poor fit for a cost-sensitive client project; free-tier instances (1 GB) are too small for this stack (~1.3 GB); and its strengths — elasticity, managed services, global scale — apply to none of this workload yet. Revisit triggers are recorded in `08-deployment.md` D1.

---

## Part 2 — Pre-Flight Code Changes

Twelve issues found by reviewing the codebase against the deployment target. Four were production bugs, not polish.

| # | Change | Why it mattered |
|---|---|---|
| P1 | `output: 'standalone'` in `next.config.ts` | Without it the image carries the full dev dependency tree (Storybook, Playwright, Vitest) — over 1 GB instead of 426 MB |
| P2 | `server/tsconfig.build.json` | `include: ["src","tests"]` with `rootDir: "src"` raises TS6059 on emit; `dist/server.js` might never land where `npm start` and the Dockerfile expect it |
| **P3** | `app.set('trust proxy', 1)` | **Production bug.** Behind Caddy every request appears to come from the proxy IP, so `express-rate-limit` put all users in one bucket. At 55 req/min, ~a dozen simultaneous visitors would 429 the entire site |
| P4 | `helmet()` + `compression()` | Security headers and response size |
| **P5** | Graceful SIGTERM/SIGINT | **Production bug.** Every deploy severed in-flight requests, left Prisma's pool undrained, and orphaned the TN OAuth token instead of calling the existing `revokeToken()` |
| P6 | Untrack `client/.env.production` | Contained a commented-out `SENTRY_AUTH_TOKEN` line — a loaded gun awaiting the first person to fill it in |
| P7 | Delete `client/pnpm-lock.yaml` | Two lockfiles; `npm ci` fails outright when the lockfile disagrees with `package.json` |
| P8 | Expand root `.gitignore` | Build output and env files were not ignored |
| P9 | `/health/ready` with a DB ping | `/health` returned OK while Postgres was unreachable. Split liveness (Docker) from readiness (monitoring) |
| P10 | `maxKeys: 5000` on node-cache | Unbounded *within a TTL window*, and the suggest endpoints key on raw user input — attacker-controlled. `NodeCache` throws at the limit, so `cache.set` is wrapped |
| **P11** | `RATE_LIMIT_MAX_REQUESTS` 55 → 45 | **Stale in the dangerous direction.** The comment said "stay under TN's 60/min", but liaison R24/D6 records TN **Production at 50/min** |
| P12 | MapWidget3 iframe — launch gate | Not a code change. Recorded so it blocks launch, not deployment |

**Sentry was removed entirely** at the client's request (ADR-012 superseded): `@sentry/nextjs` uninstalled, both instrumentation files deleted, `withSentryConfig` stripped, and every `NEXT_PUBLIC_SENTRY_*` reference cleared from the Dockerfile, Playwright config, and VS Code settings. **This leaves a real gap** — see `10-remaining-work.md`.

---

## Part 3 — Dockerization

### The API image (`server/Dockerfile`) — 709 MB

Three stages: `deps` (production deps only), `build` (full deps → `prisma generate` → `tsc`), `runtime`.

- **Debian slim, not Alpine.** Prisma's query engine links against OpenSSL; on musl you must add `openssl` *and* set `binaryTargets = ["linux-musl-openssl-3.0.x"]`, and the failures are cryptic. The ~40 MB is worth eliminating that class of bug.
- **`USER node`** — a container escape as root becomes root on the host.
- **`tini` as PID 1** — PID 1 gets no default signal handlers, so without an init the P5 SIGTERM handler may never fire.
- **`prisma` is a runtime dependency, not a devDependency** — the one-shot `migrate` service runs `prisma migrate deploy` from this image, and `npm ci --omit=dev` would otherwise leave the CLI absent, forcing an npm download on every deploy.

**Size breakdown, measured:** `node_modules` 279 MB, of which `@prisma` 121 MB (client + query engines, needed at runtime) and the Prisma CLI subtree ~108 MB (`prisma` 51 + `effect` 34 + `typescript` 23). The CLI cost is accepted rather than optimised: Docker layer caching means the 267 MB layer transfers **once**, and a normal code-only deploy moves the `dist` layer — **258 KB**.

### The web image (`client/Dockerfile`) — 426 MB

Application payload is only **70 MB**; the rest is the Node base image.

Two Next.js traps are handled explicitly:

- **`NEXT_PUBLIC_*` is baked in at build time**, not read at runtime. Changing `NEXT_PUBLIC_APP_URL` requires a **rebuild**, not a restart. They are `ARG`s with **no defaults** plus a guard that fails the build naming the missing variable — because a default silently ships a wrong value to production.
- **`next.config.ts` imports `./src/libs/Env` on line 1**, so `@t3-oss/env-nextjs` validation runs at *build* time. `JWT_SECRET` (min 32 chars) and `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` must be present or CI fails.

`JWT_SECRET` is passed via `--mount=type=secret`, never `ARG`: every ARG value is recorded in image layer history and readable by anyone who pulls the image.

---

## Part 4 — The Compose Stack

Five services on one private bridge network. **`api` and `db` have no `ports:` key at all** — they are not merely firewalled, they have no host-side listener. This is possible because of an architectural property discovered during review:

> **The browser never talks to Express.** `ApiClient.ts` uses `cookies()` from `next/headers` (server-only), and `BACKEND_API_URL` sits in the `server:` block of `Env.ts`. Every backend call routes through Next.js — the Backend-for-Frontend pattern.

That means **no CORS configuration, no `api.` subdomain, no certificate for the backend**, and the API's entire attack surface is off the internet. Every other decision depends on preserving it; a browser `fetch()` straight to Express would break all three.

**The `migrate` service** is a one-shot container running `prisma migrate deploy`, with `api` gated on `condition: service_completed_successfully`. The API can never start against an out-of-date schema.

**`docker-compose.dev.yml`** holds local build overrides. It is deliberately *not* named `docker-compose.override.yml`, which Compose auto-merges on every `up` — a stray copy on the server would inject `http://localhost:3000` into a production deploy.

---

## Part 5 — CI/CD

`.github/workflows/deploy.yml`, three jobs:

```
test  → npm ci, prisma generate, build, vitest        (~30s)
build → buildx both images → GHCR, tagged :sha + :latest  (~6m)
deploy→ ssh → docker compose pull → up -d              (~35s)
```

**Builds happen in CI, never on the VPS.** This was a hard requirement on the original 4 GB server — `next build` peaks at 2–4 GB, and the OOM killer targets the largest process, usually Postgres. It's retained on 8 GB because server builds would still contend with a live database, and a production site must not go down in order to deploy.

**Deploy key is separate from the developer key** and passphraseless (unavoidable for automation), stored only in GitHub secrets. It can be revoked by deleting one line from `authorized_keys` without affecting developer access.

> **Known and accepted:** that key grants Docker access, which is root-equivalent on the host — anyone with Docker can mount the filesystem into a container. Inherent to this deploy model; the mitigation is independent revocability.

**GitHub secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID`
**GitHub variables:** `DEPLOY_ENABLED=true`

---

## Part 6 — Server Build (Phase A)

Ubuntu 24.04 LTS, `deploy` user with sudo and docker group, key-only SSH.

| Step | State |
|---|---|
| SSH | Key-only. `PermitRootLogin no`, `PasswordAuthentication no` — both verified refused |
| Firewall | `ufw` — 22, 80, 443 only. No rule for 8000 or 5432 because nothing listens there |
| fail2ban | sshd jail, `backend = systemd`, 5 retries / 1 h ban |
| Updates | `unattended-upgrades` active |
| Swap | 2 GB, `vm.swappiness=10` |
| Docker | 29.7.2 + Compose v5.5.0 — **pre-installed by Hostinger**, so Phase A12 was skipped |
| Logs | `json-file`, capped 10 MB × 3 per container |
| Malware scanner | Monarx uninstalled and the unit **masked** so updates can't revive it |

**Idle resource use:** 742 MB of 7.8 GB RAM, 4.8 GB of 96 GB disk.

---

## Part 7 — DNS and TLS

The domain is registered at GoDaddy. It was found pointing at **Hostinger's parking nameservers** (`ns1/ns2.dns-parking.com`) serving a zone that existed in neither account — orphaned records nobody could edit. Fixed by returning the domain to GoDaddy's own nameservers, then setting a single A record.

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `31.220.54.150` | 600 |
| CNAME | `www` | `ticketlove.net.` | 1 h |

`www` as a CNAME to the apex means one record to maintain, not two.

**Certificates:** Caddy obtained Let's Encrypt certs for both names on first start, valid to **20 Nov 2026**, renewing automatically. The `caddy_data` volume must persist — losing it forces re-issuance against Let's Encrypt's rate limits.

---

## Part 8 — Backups

`infra/backup.sh` → `/opt/ticketlove/backup.sh`, cron `15 3 * * *` UTC.

`pg_dump --format=custom | gzip | gpg --symmetric --cipher-algo AES256`, 7-day local retention, off-server upload via rclone when a remote is configured.

Four safeguards that are not obvious:

- **`PIPESTATUS` on every stage.** The pipeline's exit code comes from `gpg`, which encrypts an empty stream happily. Without this, a failing `pg_dump` yields a directory of healthy-looking backups containing nothing.
- **Minimum size check** (1 KB) as a second line of defence.
- **`cd` into the project directory**, because cron runs elsewhere and Compose resolves `${POSTGRES_PASSWORD}` from `./.env`.
- **Loud warning when no remote is configured**, so local-only cannot be mistaken for safe.

### Restore drill — 2026-08-22 ✅ PASS

Not a row count. A sentinel gift card (`drill-001`, balance 123.45) was planted, backed up, **deleted from the live database**, then restored into a scratch DB and confirmed present — proving the record came from the encrypted file and not from production. 9 tables restored, scratch DB dropped.

**Repeat quarterly.** Log results in `08-deployment.md` F5.

> ⚠️ **Off-server copy is still missing.** Backups exist only on the machine they came from, which protects against bad migrations and `DELETE` mistakes but *not* against disk or server loss — the scenario you are actually insuring against. Blocked on Steven choosing Backblaze B2 or Cloudflare R2.

> ⚠️ **The passphrase must live off-server.** `/opt/ticketlove/.backup-passphrase` protects every dump. If the server dies with the only copy, every backup is permanently undecryptable.

---

## Part 9 — Problems Hit

The reason to keep this document. Several of these fail *silently*.

| # | Problem | Detection | Fix |
|---|---|---|---|
| 1 | Real TN credentials in `.env.docker.example`, force-un-ignored via `!.env.docker.example` | Diffed against `server/.env` — byte identical | Placeholders; caught while untracked, so no history rewrite or key rotation |
| 2 | `${POSTGRES_PASSWORD}` interpolated empty → whole stack fails to start | Reasoned through Compose semantics before deploy | Compose reads `${VAR}` from `./.env` only; `env_file:` does **not** feed interpolation. Standardised the filename on `.env` |
| 3 | `prisma` CLI absent from runtime image | `npm ci --omit=dev` excludes devDependencies | Moved `prisma` to `dependencies`; verified the lockfile dropped its `dev: true` flag |
| 4 | `docker-compose.override.yml` auto-merges on every `up` | Named filename has special meaning to Compose | Renamed `docker-compose.dev.yml`, requires explicit `-f` |
| 5 | CI fallback defaults (`… \|\| '690'`) in **two** layers | Both workflow and Dockerfile ARG had defaults | Removed both; added a guard that fails naming the missing variable |
| 6 | GHCR push failed: `repository name must be lowercase` | First CI run, 11s | `github.repository_owner` preserves casing; compute via `${GITHUB_REPOSITORY_OWNER,,}` |
| 7 | `PasswordAuthentication yes` survived hardening | `sshd -T` showed the effective value | Two drop-ins conflicted; sshd takes the **first** value and `50-cloud-init.conf` shipped `yes`. Added `00-hardening.conf` sorting ahead of both |
| 8 | fail2ban watched nothing | Checked jail status after enabling | Ubuntu 24.04 logs sshd to the journal, not `auth.log` — needs `backend = systemd` |
| 9 | CI key silently swallowed into a comment | `wc -l` showed 1 line, not 2 | `authorized_keys` had no trailing newline, so `>>` fused both keys. SSH treats the remainder as a free-form comment — the developer key kept working, so nothing looked wrong. Rewrote and validated with `ssh-keygen -l` |
| 10 | `crontab -l` came back empty after install | Verified immediately instead of trusting it | `grep -v` returns 1 on empty input and `set -e` killed the subshell before the schedule line |
| 11 | Domain served by nameservers nobody controlled | Queried the registry directly | Hostinger parking NS with no zone in either account. Returned to GoDaddy nameservers |
| 12 | GoDaddy panel claimed "DNS managed elsewhere" after the change | Compared registry (1.1.1.1) against the panel | UI cache. Registry already showed `domaincontrol.com` and SOA `dns.jomax.net` |
| 13 | Rate limit constant stale against TN Production | Cross-read the liaison log while writing docs | Comment said 60/min; R24 records Production at 50 |
| 14 | Monarx malware scanner running as root | `ss -tlnp` showed `monarx-agent` | Uninstalled and masked. It scans for PHP web shells — irrelevant to a Docker/Node host, and its auto-removal feature could quarantine container files |
| 15 | Actions 3 majors behind, Node 20 deprecation | CI annotations | Checked actual latest releases rather than assuming "v5"; checkout/setup-node were at **v7** |

**The pattern worth internalising:** nine of these fail *quietly*. Empty crontabs, swallowed SSH keys, un-applied SSH settings, backups of nothing, silently-wrong config IDs. In every case the fix was the same discipline — **verify the effect, not the action.** `sshd -T` rather than reading the file; `wc -l` rather than trusting `>>`; a planted sentinel rather than a row count.

---

## Part 10 — Operations Quick Reference

```bash
ssh deploy@31.220.54.150
cd /opt/ticketlove

docker compose ps                    # what's running
docker compose logs -f api           # tail API
docker compose logs -f web           # tail Next.js
docker stats                         # live CPU/RAM
free -h ; df -h /                    # memory, disk

docker compose exec db psql -U ticketlove -d ticketlove   # DB shell
./backup.sh                          # manual backup
```

**Deploy:** push to `master`. **Rollback:** `TAG=<git-sha> docker compose up -d web api`.

**Triage order when the site is down:** `docker compose ps` → `logs --tail=100 <service>` → `free -h` and `dmesg | grep -i oom` → `df -h` → `systemctl status docker` → `curl -I https://ticketlove.net`.

### Where things live

| Item | Location |
|---|---|
| Compose stack, `.env`, backups | `/opt/ticketlove/` on the VPS |
| Backup passphrase | `/opt/ticketlove/.backup-passphrase` — **also needs a password-manager copy** |
| Images | `ghcr.io/hprogrammerarif/ticketlove-{api,web}` (public) |
| CI secrets | GitHub → Settings → Secrets and variables → Actions |
| DNS | GoDaddy → ticketlove.net → DNS Records |
| Server panel | Hostinger hPanel (Arif has collaborator access) |
| TLS certificates | `caddy_data` Docker volume — **must persist** |

---

## Related Documents

- `08-deployment.md` — the plan, decisions D1–D6, phase-by-phase instructions
- `10-remaining-work.md` — what is still outstanding and who owns it
- `03-tech-decisions.md` — ADR-009 (self-hosted Postgres), ADR-010 (rate limits), ADR-012 (error tracking removed)
- `07-ticketnetwork-liaison.md` — TN answers, open questions, launch gates
- `CHANGELOG.md` — dated running log

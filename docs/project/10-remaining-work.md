# 10 — Remaining Work

**Last Updated:** 2026-08-22
**Companion docs:** `09-deployment-record.md` (what's built) · `02-phases.md` (phase detail) · `07-ticketnetwork-liaison.md` (TN questions)

---

## The One-Line Summary

**The infrastructure is finished. The product is not.**

`https://ticketlove.net` is live, secure, automatically deployed and backed up. What remains is three unbuilt product phases, one unfinished TicketNetwork conversation that **we are blocking**, and one genuine data risk.

---

## 🔴 Do These This Week

> **Deferred by Arif on 2026-09-02, to be done around 2026-09-04/05.**
> Items 1–3 below are the credential and infrastructure work; nothing is
> blocked on them, but item 1 is the one that turns a survivable incident
> into total loss if left.

### 0a. Rotate the backup passphrase

**Owner:** Arif · **Takes:** ten minutes · **Risk:** exposure, low but real

The passphrase was read out over chat on 2026-09-02, so treat it as exposed.
Backups are `gpg --symmetric --cipher-algo AES256` and `RETAIN_DAYS=7`, which
makes rotation clean: anything encrypted with the old passphrase ages out
within a week.

```bash
ssh deploy@31.220.54.150
cd /opt/ticketlove
cp .backup-passphrase .backup-passphrase.old   # old backups still need this
openssl rand -hex 32 > .backup-passphrase
chmod 600 .backup-passphrase
```

Save **both** to a password manager — the new one permanently, the old one
labelled *"retired 2026-09-02, needed for backups before this date"*. Delete
the old one and `.backup-passphrase.old` after 7 days.

Then prove it, because an untested backup is a hypothesis:

```bash
sudo /opt/ticketlove/infra/backup.sh
LATEST=$(ls -t /opt/ticketlove/backups/*.gpg | head -1)
gpg --batch --quiet --decrypt --passphrase-file /opt/ticketlove/.backup-passphrase "$LATEST" | gunzip | head -c 200
```

### 0b. Rotate the TicketNetwork production credentials

**Owner:** Arif

`TN_CONSUMER_KEY` and `TN_CONSUMER_SECRET` were passed through chat during the
production cutover. Regenerate in the TN DevPortal, update
`/opt/ticketlove/.env`, and recreate the `api` container so `env_file` is
re-read. Append with `printf '
...'` rather than `echo`, per the newline
hazard that fused two keys in `authorized_keys` during setup.

### 0c. Reboot the VPS

**Owner:** Arif · **Takes:** two minutes

`*** System restart required ***` has shown on every login since at least
2026-09-01, with 9 pending updates including a kernel one. Containers return
on their own via `restart: unless-stopped`. Do it at a quiet hour and confirm
the site afterwards.

---


### 1. Reply to Ian at TicketNetwork — we are the blocker

**Owner:** Arif · **Blocks:** Phase 7, and therefore launch

Liaison item **A2** is marked `[OPEN — WE ARE THE BLOCKER]`. Ian asked us to clarify what we meant by "checkout information" — *"Are you referring to integration with our hosted checkout?"* — and the thread has been sitting on our reply ever since. Sandbox checkout access is waiting on it.

This is the single highest-value action in the project right now. It costs one email, and nothing downstream of Phase 7 can start until it's answered. Everything else on this list is work; this is just a reply we owe someone.

Once access is granted, we still need `useC3` and `c3CheckoutDomain` values from Integration Support (**Q6**).

### 2. Get the backups off the server

**Owner:** Steven decides, Arif implements · **Risk:** total, unrecoverable data loss

Backups run nightly and the restore has been tested — but every copy lives **on the machine it came from**. That protects against a bad migration or an accidental `DELETE`. It does **not** protect against disk failure or losing the server, which is the scenario worth insuring against.

`GiftCard.balance` and the immutable `GiftCardRedemption` records are real money. There is no reconstructing them.

Steven picks **Backblaze B2** or **Cloudflare R2** — pennies per month at this data volume. Pick a region other than US Phoenix so one incident can't take both. Then it's a single `rclone config` on the server; the script already detects the remote and starts uploading with no code change.

### 3. Save the backup passphrase off-server

**Owner:** Arif · **Takes:** two minutes

```bash
ssh deploy@31.220.54.150 'cat /opt/ticketlove/.backup-passphrase'
```

Into a password manager. **If the server dies with the only copy of that passphrase, every backup is permanently undecryptable** — which turns a recoverable incident into total loss. Doing item 2 without this one achieves nothing.

---

## 🟠 Decisions Waiting on Steven

None of these block engineering. All should be settled before launch.

| Decision | Detail | Consequence of delay |
|---|---|---|
| **GoDaddy refund** | VPS created 24 Jul, cancellation requested. Refund amounts on the VPS and the $239.88 cPanel licence need confirming in writing | Money, and the 30-day window |
| **Error tracking** | None since Sentry was removed (ADR-012) | Production errors are invisible until someone reads logs or a customer complains. See below |
| **Transactional email** | Resend / Postmark / SES — never self-hosted | Password reset can't ship without it |
| **Gift card economics** | Liaison **A4**: what happens when a code exceeds the order margin — capped, negative commission, or rejected? | **No denomination can be priced.** Blocks all of Phase 4 |
| **Promo code mechanics** | Liaison **A5**: single/multi-use, fixed or percentage, partial redemption, expiry, issuance API | Blocks the gift card data model |
| **TN Portal handover** | **A1 answered 2026-08-22** — account under `work.mohammedarif@gmail.com`, ownership transfers to Steven after go-live | **Post-launch action — do not lose this.** Markup, promo codes and sales reporting are Steven's to run |

### On error tracking specifically

Sentry was removed at the client's request, and that was a reasonable call — it was never configured with a real DSN, so it produced nothing while adding a dependency and build complexity.

But it leaves a real gap worth stating plainly: **there is no aggregated error tracking and no alerting.** Backend errors go to Pino and land in `docker compose logs`, capped at 10 MB × 3 files. That is enough to debug an incident you already know about, and not enough to learn about one you don't. Uptime monitoring catches *down*, not *broken*.

Options: Sentry's free tier, **GlitchTip** (self-hostable, Sentry-SDK-compatible), Highlight, or shipping Pino output to a log service. If any Sentry-compatible SDK returns, the scrubbing rule from ADR-012 applies — passwords, tokens, and gift card codes must never leave the server.

---

## 🟡 Product Work — The Actual Remaining Build

This is the bulk of what's left, and it is feature work, not infrastructure.

| Phase | Status | Blocked by |
|---|---|---|
| **2 — Frontend** | `[NEEDS REVIEW]` | MapWidget3 renders live maps; `websiteConfigId` resolved 2026-08-20 (both `690` and `12498` work — R26/Q4). **Remaining risk:** TN does not recommend the iframe the embed depends on (D4/Q10) |
| **4 — Gift Card System** | `[NOT STARTED]` | A4 + A5 above. Viable via TN promo codes, but margin on Ian's own worked example is $12.50 on a $120 order — a gift card can exceed the entire margin |
| **5 — Pre-Checkout UI** | `[NOT STARTED]` | Nothing external |
| **6 — Admin Dashboard** | `[NOT STARTED]` | Nothing external |
| **7 — Checkout Redirect** | `[NOT STARTED]` | A2 (our reply) → Sandbox access → Q6 values |

**Also outstanding from Phase 2 review:** liaison **D1** established that the customer Orders area cannot be built — TicketNetwork gives the customer their own account and no order data, webhooks, or cancellation notifications reach us. The Figma Orders and notification screens have no data source and never will. That needs Steven's decision and a `06-frontend-spec.md` update.

---

## 🔵 Engineering Backlog

Genuine improvements, none urgent. Roughly in value order.

**1. Staging domain (Phase H2).** If Hostinger bundled a free domain, point it at the same server and add it to the `Caddyfile`. Today the first live test of anything — certificates included — happens on `ticketlove.net` itself. A throwaway name lets the whole stack be rehearsed first, and keeps failed Let's Encrypt attempts off the real domain's issuance rate limit.

**1a. Switching to TicketNetwork production — the exact steps.** Recorded here because several of these are build-time and a restart will not pick them up:

- Set the repo variable **`MAPWIDGET_ENV=production`** (Settings → Secrets and variables → Actions → Variables). This changes the Seatics host from `mapwidget3-sandbox.seatics.com` to `mapwidget3.seatics.com`. Production Seatics does not recognise sandbox event IDs, so a mismatch here yields an empty map with no error.
- Update `TN_BASE_URL`, `TN_CONSUMER_KEY`, `TN_CONSUMER_SECRET` in `/opt/ticketlove/.env`, then `docker compose up -d api`.
- Confirm the production `websiteConfigId` and update the `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` secret.
- **Push a commit to rebuild the web image.** `NEXT_PUBLIC_*` values are baked in at build time — changing the secret or variable alone does nothing until a rebuild.
- Lower nothing else: `RATE_LIMIT_MAX_REQUESTS` is already 45, under TN Production's 50/min ceiling.

**2. Make GHCR packages private.** They're public, so anyone can pull and inspect the compiled server code. No secrets are in the images (build secrets were mounted, and `NEXT_PUBLIC_*` values are public by definition), but for a client project the source shouldn't be freely pullable. Requires a `read:packages` PAT on the server — `docker login ghcr.io`.

**3. Uptime monitoring.** UptimeRobot or Better Stack against `https://ticketlove.net/` every 5 minutes, alerting to email. Consider exposing `/health/ready` through Caddy via a dedicated `handle` block so monitoring can see database health, not just that the page loads.

**4. Rotate the TicketNetwork credentials.** They were briefly present in an untracked example file. It was caught before any commit and the file is now placeholders — but rotating is cheap insurance and closes the question permanently.

**5. Log rotation for `backup.log`.** Small and slow-growing, but unbounded. A `logrotate` stanza or a `find -mtime` line.

**6. Outbound rate limiting to TN.** `RATE_LIMIT_MAX_REQUESTS = 45` is a per-client-IP *inbound* limiter — a coarse guard, never exact enforcement of TN's 50/min ceiling. The caching layer absorbs most catalog reads, so real outbound volume is far lower. If sustained traffic ever approaches the ceiling, the correct fix is a token bucket around `server/src/modules/ticketnetwork/client.ts`. TN will raise the cap on request (R24).

**7. Quarterly restore drill.** Next due **2026-11-22**. Use the sentinel method in `08-deployment.md` F5 — plant a record, delete it from live, prove it returns. Log the result.

**8. Certificate expiry check.** Current certs expire **20 Nov 2026** and Caddy renews automatically. Worth one calendar reminder for the first renewal window to confirm it happened, then trust it.

---

## Explicitly Not Doing

Recorded so these don't get re-litigated:

| | Why |
|---|---|
| **Redis** | The `cacheGet` abstraction already isolates the cache behind one interface, so swapping is a single file. Don't, until there is a second app instance — at which point *shared rate limiting* is the stronger argument, not caching |
| **AWS** | Variable billing suits a cost-sensitive client project poorly; free-tier instances are too small. Revisit when traffic outgrows one server or infrastructure spend becomes noise against revenue |
| **Managed Postgres** | Chosen against in ADR-009 — the Next.js server queries the database on every authenticated render, and a 10–50 ms external round trip per query is a user-visible tax. Revisit if backup discipline slips or point-in-time recovery becomes necessary |
| **Self-hosted email** | SPF, DKIM, DMARC, reverse DNS and IP reputation, with VPS ranges widely blocklisted. Password resets would land in spam |
| **Building on the server** | `next build` peaks at 2–4 GB and would contend with a live Postgres. A production site must not go down in order to deploy |

---

## Suggested Order

**This week** — reply to Ian (A2); pick B2 or R2 and wire up off-server backups; save the passphrase.

**Next** — chase Steven on gift card economics (A4/A5), since Phase 4 can't start without them; resolve the MapWidget3 iframe question with TN Integration Support; decide on error tracking.

**Then** — Phase 5 and Phase 6, neither of which is blocked by anything external. These are the two phases that can proceed today with no waiting.

**Before launch** — TN production credentials, full regression against production data, error tracking in place, off-server backups confirmed working, and Steven's sign-off.

The critical path runs through TicketNetwork, and the first step on it is an email we already owe them.

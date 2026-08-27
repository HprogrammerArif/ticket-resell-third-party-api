# Admin Dashboard Shell — Design

**Date:** 2026-08-27
**Phase:** 6 (`02-phases.md`)
**Status:** Design approved, spec awaiting review

---

## Goal

Steven can sign in to an admin area on Ticket Love, see how the platform is doing, look up customers, and reach TicketNetwork's sales reporting. Today he has no way to log in at all.

Gift card management is deliberately excluded — it belongs to Phase 4, which is blocked on TicketNetwork answering the gift card economics question (liaison A4/A5).

---

## Decisions

### D1 — Admins are a separate identity, not a flag on customers

The schema currently carries **two** contradictory admin models:

```prisma
// Regular customers. role=ADMIN grants admin-panel access to a customer account.
model User { role Role @default(USER) }   // enum: USER | ADMIN

// Separate credential table for super-admin (Steven / back-office staff).
// Intentionally not merged with User — admins never appear in customer flows.
model AdminUser { ... }                    // referenced by zero lines of code
```

**Decision: use `AdminUser`.** Admin and customer identity never mix, so an admin cannot accidentally hold a shopping profile, a gift card balance, or appear in a customer list. This matches the intent already written in the schema comment.

`User.role` stays for now — removing the enum is a migration with no benefit to this phase — but it is not the admin mechanism and nothing should read it as one.

### D2 — Token audience separates the two session types

Both token types are signed with the same `JWT_SECRET` and are otherwise identical in shape. Without an audience claim, the only thing distinguishing them would be a `role` field, which is exactly the kind of check that gets forgotten on one route.

- Admin tokens: `aud: 'admin'`, **8 hour** expiry
- Customer tokens: `aud: 'user'`, 7 day expiry (unchanged)

Each verifier passes its expected audience to `jwtVerify`, so a token for the wrong side fails at signature verification rather than at an application check.

**Why 8 hours for admin:** Steven signing in once a week is a minor inconvenience. An admin token sitting in a browser for seven days is a standing risk.

**Migration cost, accepted:** `Auth.ts` currently calls `jwtVerify(token, secret)` with no audience, so today *any* validly-signed token is accepted as a customer session — including an admin token. Adding `aud: 'user'` and enforcing it closes that, and **logs out every currently signed-in customer**. The site went live on 2026-08-27 with effectively no users, so the cost is near zero now and rises with every signup.

### D3 — TicketNetwork reporting is a link, not an embed

TN sends `X-Frame-Options: SAMEORIGIN` on `checkout.tickettransaction.com` (verified 2026-08-25), and their portal is expected to do the same, so an embed would render an empty box. Embedding also means fighting their login session inside our page.

A styled link opening TN Portal in a new tab. This closes the open business question in `02-phases.md`.

### D4 — Admin pages sit outside the locale segment

The customer site runs next-intl with `localePrefix: 'as-needed'`, so `/policies` serves directly and `/fr/policies` also works. There is no `middleware.ts`; routing is handled by the `[locale]` segment alone.

Admin lives at `client/src/app/admin/...`, outside `[locale]`. Next.js prefers a static segment over a dynamic one, so `/admin` resolves there. English only — it is one person's back office, and translating it would be work with no reader.

### D5 — Customer records are read-only in v1

List, search and view. No editing, no deletion, no impersonation. Each of those needs an audit trail to be defensible, and an audit log is out of scope for this phase.

---

## Architecture

```
Browser -> Next.js -> Express -> Postgres
           (BFF)      (private)

Customer:  /sign-in      -> cookie auth_token   (aud:user)   -> User
Admin:     /admin/login  -> cookie admin_token  (aud:admin)  -> AdminUser
```

Admin uses the same Backend-for-Frontend path as customers: the browser talks to Next.js routes under `/api/admin/*`, which forward to Express. Express stays off the public internet, so **decision D4 in `08-deployment.md` is unaffected** — no new DNS, no firewall change, no public API surface.

---

## Backend

### New files

```
server/src/modules/admin/service.ts
server/src/modules/admin/routes.ts
server/src/middleware/authenticateAdmin.ts
```

### Endpoints — mounted at `/api/admin`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/login` | none | email + password, returns token and admin |
| GET | `/me` | admin | current admin |
| PUT | `/password` | admin | change own password |
| GET | `/stats` | admin | customer count, signups in last 7 days |
| GET | `/customers` | admin | paginated list, `?q=` `?page=` `?pageSize=` |
| GET | `/customers/:id` | admin | one customer |

### `authenticateAdmin`

Mirrors `authenticate`, with two differences: it passes `{ audience: 'admin' }` to `jwt.verify`, and it loads the `AdminUser` row rather than trusting the token payload alone — so a deleted admin cannot keep using a token until it expires.

Attaches `req.admin`, not `req.user`. Keeping them separate means no route can confuse the two.

### Service notes

- `bcryptjs` for hashing, same cost factor as `users/service.ts`
- `login` returns the same error for unknown email and wrong password, so the endpoint does not confirm which addresses exist
- `/customers` selects only what the list needs — never `passwordHash`
- `?q=` searches `email`, `firstName`, `lastName`, `displayName`, case-insensitive
- Page size capped server-side (default 25, max 100) so a crafted `pageSize` cannot pull the whole table

### Rate limiting

`/api/admin/login` gets its own limiter, stricter than the catalog one — it is the only publicly reachable admin surface and the obvious brute-force target.

---

## Frontend

### New files

```
client/src/libs/AdminAuth.ts
client/src/app/api/admin/login/route.ts
client/src/app/api/admin/logout/route.ts
client/src/app/api/admin/me/route.ts
client/src/app/api/admin/password/route.ts
client/src/app/api/admin/stats/route.ts
client/src/app/api/admin/customers/route.ts
client/src/app/admin/layout.tsx
client/src/app/admin/login/page.tsx
client/src/app/admin/page.tsx
client/src/app/admin/customers/page.tsx
client/src/app/admin/account/page.tsx
```

`AdminAuth.ts` mirrors `Auth.ts`: `getAdminSession`, `setAdminSession`, `deleteAdminSession`, `getAdmin`. Cookie `admin_token`, `httpOnly`, `secure` in production, `sameSite: 'lax'`, `maxAge` 8 hours, and `jwtVerify(token, secret, { audience: 'admin' })`.

### Pages

- **`/admin/login`** — email and password. The only public admin page.
- **`/admin/layout.tsx`** — server component; calls `getAdmin()` and redirects to `/admin/login` when null. Renders the shell: sidebar, admin name, sign out.
- **`/admin`** — stat tiles (total customers, signups this week) and a link to TN Portal.
- **`/admin/customers`** — table with search. Search term is a URL parameter, per the project's preference for URL state over component state.
- **`/admin/account`** — change own password.

Server components throughout except the login form and the search input, which need event handlers.

### Customer-side change

`client/src/libs/Auth.ts` gains `{ audience: 'user' }` on `jwtVerify`, and `server/src/modules/users/service.ts` adds `audience: 'user'` when signing. See D2 for the accepted cost.

---

## Creating the first admin

No public admin signup — a permanently reachable "create an admin" endpoint is an open door regardless of what guards it.

```bash
npm run admin:create -- --email steven@example.com --name "Steven Imes III"
```

A script at `server/scripts/create-admin.ts`, run once over SSH on the server. It prompts for a password rather than accepting one as an argument, so the password does not land in shell history. Refuses to overwrite an existing email.

---

## Testing

`server/tests/admin/`:

| Test | Why it matters |
|---|---|
| `/api/admin/customers` returns 401 without a token | The whole point of the boundary |
| a **customer** token is rejected by `authenticateAdmin` | D2's audience separation actually works |
| login succeeds with correct credentials | Happy path |
| login fails with a wrong password | And returns the same error as unknown email |
| `/customers?q=` filters | Search behaves |
| `pageSize` is capped | A crafted parameter cannot dump the table |

The second row is the one worth writing carefully — it is the test that would catch the audience claim being dropped in a future refactor.

---

## Out of scope

Gift card management (Phase 4), multiple staff accounts, audit logging, customer editing or deletion, impersonation, and any embedding of TN's reporting dashboard.

Each can be added as a new page without reworking this shell — that is the point of building the boundary first.

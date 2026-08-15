# Phase 3 — User Account System: Design Spec

**Date:** 2026-08-15  
**Status:** Approved

---

## Goal

End users can register, sign in, view their dashboard, edit their profile, change their password, and delete their account. Auth is session-based via a signed JWT stored in an `httpOnly` cookie.

## Architecture

**Request flow:**
```
Browser → Next.js /api/auth/* route handler → Express /api/auth/* → Prisma DB
                        ↓
           Sets httpOnly auth_token cookie (JWT signed by Express)
                        ↓
           Auth.ts verifies JWT signature via jose (Edge-safe)
```

- Forms call Next.js route handlers (`/api/auth/sign-in`, `/api/auth/sign-up`, `/api/auth/sign-out`)
- Route handlers forward to Express backend (`BACKEND_API_URL/api/auth/*`)
- Express signs JWTs with `JWT_SECRET`; Next.js sets the cookie
- `Auth.ts` uses `jose` to verify JWT signature (replaces current mock decoder)
- `proxy.ts` middleware stays unchanged (checks cookie presence for redirect)

## Token Strategy

- Library: `jsonwebtoken` (Express), `jose` (Next.js, Edge-compatible)
- Algorithm: HS256
- Payload: `{ id, email, role }`
- Expiry: 7 days (`JWT_EXPIRES_IN=7d` already in server `.env`)
- Cookie: `auth_token`, `httpOnly`, `sameSite: lax`, `secure` in production, `maxAge: 7d`

## Database Changes (Prisma)

Add to `User` model in `server/prisma/schema.prisma`:

```prisma
model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  passwordHash        String
  displayName         String?
  firstName           String?   // optional, legacy
  lastName            String?   // optional, legacy
  gender              Gender?
  dateOfBirth         DateTime?
  marketingConsent    Boolean   @default(false)
  role                Role      @default(USER)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  giftCardRedemptions GiftCardRedemption[]
}

enum Gender {
  FEMALE
  MALE
  NON_BINARY
}
```

Migration required after schema change.

## Backend — Express (`server/`)

### New files
- `src/modules/users/service.ts` — business logic
- `src/modules/users/routes.ts` — route handlers
- `src/middleware/authenticate.ts` — JWT verification middleware

### Endpoints

| Method | Path | Auth required | Description |
|--------|------|---------------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in, returns JWT |
| POST | `/api/auth/logout` | No | Returns instruction to clear cookie |
| GET | `/api/auth/me` | Yes | Return current user |
| PUT | `/api/auth/profile` | Yes | Update displayName |
| PUT | `/api/auth/password` | Yes | Change password (requires current password) |
| DELETE | `/api/auth/account` | Yes | Delete account |

### Register body
```json
{ "email": "string", "password": "string (8+ chars)", "displayName": "string?", "gender": "FEMALE|MALE|NON_BINARY|null", "dateOfBirth": "ISO date string|null", "marketingConsent": "boolean" }
```

### Service functions
- `register(data)` — hash password (bcrypt, 12 rounds), create user, return JWT
- `login(email, password)` — compare hash, return JWT
- `me(userId)` — return user record (no passwordHash)
- `updateProfile(userId, { displayName })` — update and return user
- `changePassword(userId, { currentPassword, newPassword })` — verify current, hash new
- `deleteAccount(userId)` — delete user record

### `authenticate` middleware
Reads `Authorization: Bearer <token>` header OR falls back to `auth_token` cookie on the request. Verifies with `jsonwebtoken`. Attaches `req.user = { id, email, role }`. Returns 401 if missing or invalid.

### Password validation
8+ characters. Validated with Zod on the route handler.

### Error responses
```json
{ "error": "string" }
```
With appropriate HTTP status codes (400, 401, 404, 409 for duplicate email).

## Frontend — Next.js (`client/`)

### New Next.js Route Handlers
- `src/app/api/auth/sign-in/route.ts` — POST, forwards to Express login
- `src/app/api/auth/sign-up/route.ts` — POST, forwards to Express register
- `src/app/api/auth/sign-out/route.ts` — POST, clears cookie

### Updated files
- `src/libs/Auth.ts` — replace `decodeJwt` (no-verify) with `jose` `jwtVerify`. Add `NEXT_PUBLIC_` or server-side `JWT_SECRET` env var to client `.env`.
- `src/libs/Env.ts` — add `JWT_SECRET` server-side env var

### Sign-in page (`/sign-in`)
Matches Figma `Log In.png`:
- Dark background, TicketLove logo
- Email field, password field with show/hide toggle
- "Log In" button (pill, dark border)
- "Forget your password?" link (brand red, links to `/forgot-password` — page stub only, no functionality)
- "Don't have an account? Sign up" link
- Google sign-in button: **omitted in Phase 3**

### Sign-up page (`/sign-up`)
Matches Figma `Sign up.png`:
- Profile name field (→ `displayName`)
- Email field
- Password field with show/hide toggle + "8+ chars" hint
- Gender radio (Female / Male / Non-binary) — optional
- Date of birth: Month / Day / Year dropdowns — optional
- Marketing consent checkbox (default checked)
- Terms of use + Privacy Policy links (link to `#` for now)
- "Sign up" button
- "Already have an account? Log in" link
- Google sign-up button: **omitted in Phase 3**

### Dashboard layout
Matches Figma dashboard screens. Shared sidebar navigation component:
- TicketLove logo
- Nav links: Overview, Profile, My Orders, My Tickets, Notifications, Settings
- Logout button at bottom
- Active state highlight (brand red)
- Background: dark with concert image overlay (matches Figma)

### Dashboard screens (6)

**Overview** (`/dashboard`):
- Greeting: "Hey, {displayName}! 👋"
- "Your best show" placeholder card (empty state if no orders)
- Stats: upcoming shows count, orders count (0 for Phase 3)
- Recent orders section (empty state: "No orders yet")
- Recent alerts section (empty state: "No alerts yet")

**Profile** (`/dashboard/profile`):
- Avatar circle with initial (brand red background)
- Full name input (editable, saves to `displayName`)
- Email field (read-only)
- "Save changes" button (brand red)

**My Orders** (`/dashboard/orders`):
- Table: Order ID, Event, Date, Total, Status
- Empty state for Phase 3 ("No orders yet")

**My Tickets** (`/dashboard/tickets`):
- Upcoming / Past tabs
- Empty state for Phase 3 ("No tickets yet")

**Notifications** (`/dashboard/notifications`):
- "Mark all read" link (brand red)
- Empty state for Phase 3 ("No notifications yet")

**Settings** (`/dashboard/settings`):
- Security section: "Change password" link → `/dashboard/settings/change-password`
- Change password sub-page: current password, new password, confirm new password fields
- Notifications section: Email notifications toggle, Price alerts toggle (UI only, no backend for Phase 3)
- Danger zone: "Delete account" button (red, confirm dialog before submitting)

### i18n
All user-visible strings added to `en.json` and `fr.json` under new namespaces:
- `SignIn`, `SignUp` (already exist, will be extended)
- `Dashboard`, `DashboardOverview`, `DashboardProfile`, `DashboardOrders`, `DashboardTickets`, `DashboardNotifications`, `DashboardSettings`

### Route protection
`proxy.ts` already redirects unauthenticated users away from `/dashboard`. No changes needed. The dashboard layout also calls `getUser()` server-side and redirects if null.

## Testing

Backend unit tests (Vitest):
- `register`: creates user, rejects duplicate email, hashes password
- `login`: returns JWT on valid credentials, 401 on wrong password
- `changePassword`: updates hash, rejects wrong current password
- `deleteAccount`: removes user record
- `authenticate` middleware: valid token passes, missing/expired token returns 401

## Done Criteria

- User can register (all fields), sign in, view dashboard, edit profile, change password, delete account
- JWT is signed and verified (not mock)
- Protected routes redirect unauthenticated users to sign-in
- Sign-in and sign-up pages match Figma visually
- Dashboard 6 screens match Figma layout
- All strings in i18n files
- `npm run check:types` and `npm run lint` pass
- Backend tests pass

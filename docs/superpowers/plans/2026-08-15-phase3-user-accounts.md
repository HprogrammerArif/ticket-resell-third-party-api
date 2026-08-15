# Phase 3: User Account System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** End users can register, sign in, view their dashboard, edit their profile, change their password, and delete their account using a real JWT-based auth system.

**Architecture:** Browser forms call Next.js `/api/auth/*` route handlers, which forward to Express backend endpoints. Express signs JWTs with `jsonwebtoken`; Next.js verifies them with `jose` (Edge-safe). The signed JWT is stored in an `httpOnly` cookie named `auth_token` set by the Next.js route handler. The `proxy.ts` middleware already guards `/dashboard` routes — no changes needed there.

**Tech Stack:** Express 4 + Prisma + bcryptjs + jsonwebtoken (server); Next.js 16 App Router + jose + react-hook-form (client); next-intl for all strings; Vitest for backend tests.

## Global Constraints

- Password minimum: 8 characters (validated with Zod on the route handler)
- bcrypt rounds: 12
- JWT algorithm: HS256; payload `{ id, email, role, displayName }`; expiry 7 days
- Cookie: `auth_token`, httpOnly, sameSite: lax, secure in production, path `/`, maxAge: 604800 (7 days in seconds)
- All user-visible strings in `en.json` and `fr.json` — never hardcode
- TypeScript strict mode — no `any`; use `unknown` then narrow
- Named exports everywhere except Next.js page/layout/error files
- Props: single `props` parameter, no destructuring in the function signature
- No `useMemo`, `useCallback`; default to RSC, add `"use client"` only for event handlers / browser APIs
- All env access through `src/config/env.ts` (server) or `src/libs/Env.ts` (client)
- All errors use `ApiError` from `src/middleware/errorHandler.ts` (server)
- Brand red: `#ea2a43` → `var(--color-brand)`; surface: `#0f0f0f` → `var(--color-surface)`
- Spec file: `docs/superpowers/specs/2026-08-15-phase3-user-accounts-design.md`

---

## File Map

### Server (`server/`)
| File | Action |
|---|---|
| `prisma/schema.prisma` | Modify — add displayName, gender, DOB, marketingConsent; make firstName/lastName optional; add Gender enum |
| `src/types/express.d.ts` | Create — extend Express Request with `user` |
| `src/modules/users/service.ts` | Create — register, login, me, updateProfile, changePassword, deleteAccount |
| `src/modules/users/service.test.ts` | Create — Vitest tests for all service functions |
| `src/middleware/authenticate.ts` | Create — JWT verification middleware |
| `src/middleware/authenticate.test.ts` | Create — Vitest tests for middleware |
| `src/modules/users/routes.ts` | Create — Express route handlers for all auth endpoints |
| `src/routes/index.ts` | Modify — mount users routes |

### Client (`client/`)
| File | Action |
|---|---|
| `src/libs/Env.ts` | Modify — add `JWT_SECRET` server env var |
| `src/libs/Auth.ts` | Modify — replace mock `decodeJwt` with jose `jwtVerify`; export `getSession` |
| `src/app/api/auth/sign-in/route.ts` | Create — forward to Express login, set cookie |
| `src/app/api/auth/sign-up/route.ts` | Create — forward to Express register, set cookie |
| `src/app/api/auth/sign-out/route.ts` | Create — clear cookie |
| `src/app/api/auth/me/route.ts` | Create — forward GET to Express with Bearer token |
| `src/app/api/auth/profile/route.ts` | Create — forward PUT to Express with Bearer token |
| `src/app/api/auth/password/route.ts` | Create — forward PUT to Express with Bearer token |
| `src/app/api/auth/account/route.ts` | Create — forward DELETE to Express with Bearer token |
| `src/app/[locale]/(auth)/(center)/layout.tsx` | Modify — dark background for auth pages |
| `src/components/SignInForm.tsx` | Modify — Figma design (dark theme) |
| `src/components/SignUpForm.tsx` | Modify — Figma design (all fields: displayName, gender, DOB, consent) |
| `src/app/[locale]/(auth)/(center)/forgot-password/page.tsx` | Create — stub page |
| `src/components/DashboardSidebar.tsx` | Create — sidebar nav (RSC) |
| `src/app/[locale]/(auth)/dashboard/layout.tsx` | Modify — full dashboard shell with sidebar |
| `src/app/[locale]/(auth)/dashboard/page.tsx` | Modify — Overview screen |
| `src/app/[locale]/(auth)/dashboard/profile/page.tsx` | Create — Profile screen |
| `src/components/DashboardProfileForm.tsx` | Create — client component for profile editing |
| `src/app/[locale]/(auth)/dashboard/orders/page.tsx` | Create — empty state |
| `src/app/[locale]/(auth)/dashboard/tickets/page.tsx` | Create — empty state with tabs |
| `src/app/[locale]/(auth)/dashboard/notifications/page.tsx` | Create — empty state |
| `src/app/[locale]/(auth)/dashboard/settings/page.tsx` | Create — Settings with change-password link, notification toggles, danger zone |
| `src/app/[locale]/(auth)/dashboard/settings/change-password/page.tsx` | Create — Change password screen |
| `src/components/DashboardChangePasswordForm.tsx` | Create — client component |
| `src/components/DashboardDeleteAccountButton.tsx` | Create — client component with confirm dialog |
| `src/locales/en.json` | Modify — add all new namespaces |
| `src/locales/fr.json` | Modify — add all new namespaces |

---

### Task 1: Prisma Schema Update

**Files:**
- Modify: `server/prisma/schema.prisma`
- Auto-generated: `server/prisma/migrations/*/migration.sql`

**Interfaces:**
- Produces: `User` model with `displayName String?`, `gender Gender?`, `dateOfBirth DateTime?`, `marketingConsent Boolean @default(false)`, `firstName String?`, `lastName String?`, `role Role @default(USER)`; new `Gender` enum

- [ ] **Step 1: Update the schema**

Replace the entire `User` model and add the `Gender` enum in `server/prisma/schema.prisma`. The final schema should look like this (keep all other models untouched):

```prisma
model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  passwordHash        String
  displayName         String?
  firstName           String?
  lastName            String?
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

- [ ] **Step 2: Run the migration**

```bash
cd server
npm run db:generate
```

When prompted for a migration name, enter: `add_user_profile_fields`

Expected: A new directory `server/prisma/migrations/<timestamp>_add_user_profile_fields/` with `migration.sql` is created.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add user profile fields to Prisma schema (displayName, gender, DOB, consent)"
```

---

### Task 2: Backend Auth Service

**Files:**
- Create: `server/src/modules/users/service.ts`
- Create: `server/src/modules/users/service.test.ts`

**Interfaces:**
- Consumes: `db` from `../../libs/db`; `env` from `../../config/env`; `ApiError` from `../../middleware/errorHandler`
- Produces:
  - `register(data: RegisterData): Promise<{ token: string }>`
  - `login(email: string, password: string): Promise<{ token: string }>`
  - `me(userId: string): Promise<SafeUser>`
  - `updateProfile(userId: string, data: { displayName: string }): Promise<SafeUser>`
  - `changePassword(userId: string, data: { currentPassword: string; newPassword: string }): Promise<void>`
  - `deleteAccount(userId: string): Promise<void>`
  - `type RegisterData = { email: string; password: string; displayName?: string; gender?: 'FEMALE' | 'MALE' | 'NON_BINARY' | null; dateOfBirth?: string | null; marketingConsent: boolean }`
  - `type SafeUser = { id: string; email: string; displayName: string | null; gender: string | null; dateOfBirth: Date | null; marketingConsent: boolean; role: string; createdAt: Date }`

- [ ] **Step 1: Install server dependencies**

```bash
cd server
npm install bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

Expected: `package.json` and `package-lock.json` updated with bcryptjs and jsonwebtoken.

- [ ] **Step 2: Write the failing tests**

Create `server/src/modules/users/service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../libs/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpw'),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock.jwt.token'),
  },
}));

vi.mock('../../config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!', JWT_EXPIRES_IN: '7d' },
}));

import { db } from '../../libs/db';
import bcrypt from 'bcryptjs';
import { register, login, me, updateProfile, changePassword, deleteAccount } from './service';
import { ApiError } from '../../middleware/errorHandler';

const mockUser = {
  id: 'user_1',
  email: 'test@example.com',
  passwordHash: '$2b$12$hashedpw',
  displayName: 'Test User',
  firstName: null,
  lastName: null,
  gender: null,
  dateOfBirth: null,
  marketingConsent: false,
  role: 'USER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  giftCardRedemptions: [],
};

describe('register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user and returns a JWT token', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue(mockUser);

    const result = await register({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      marketingConsent: false,
    });

    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'test@example.com', passwordHash: '$2b$12$hashedpw' }),
      }),
    );
    expect(result.token).toBe('mock.jwt.token');
  });

  it('throws 409 when email already exists', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

    await expect(
      register({ email: 'test@example.com', password: 'password123', marketingConsent: false }),
    ).rejects.toThrow(ApiError);
  });

  it('hashes the password before storing', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue(mockUser);

    await register({ email: 'test@example.com', password: 'plaintext', marketingConsent: false });

    expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 12);
  });
});

describe('login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a JWT token on valid credentials', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await login('test@example.com', 'password123');

    expect(result.token).toBe('mock.jwt.token');
  });

  it('throws 401 on wrong password', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(login('test@example.com', 'wrongpass')).rejects.toThrow(ApiError);
  });

  it('throws 401 when user not found', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    await expect(login('nobody@example.com', 'password')).rejects.toThrow(ApiError);
  });
});

describe('changePassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the password hash when current password is correct', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(db.user.update).mockResolvedValue({ ...mockUser, passwordHash: '$2b$12$newhashedpw' });

    await changePassword('user_1', { currentPassword: 'oldpass', newPassword: 'newpass123' });

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_1' },
        data: { passwordHash: '$2b$12$hashedpw' },
      }),
    );
  });

  it('throws 401 when current password is wrong', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      changePassword('user_1', { currentPassword: 'wrong', newPassword: 'newpass123' }),
    ).rejects.toThrow(ApiError);
  });
});

describe('deleteAccount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the user record', async () => {
    vi.mocked(db.user.delete).mockResolvedValue(mockUser);

    await deleteAccount('user_1');

    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'user_1' } });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd server
npm test -- --reporter=verbose src/modules/users/service.test.ts
```

Expected: FAIL — module `./service` not found.

- [ ] **Step 4: Implement the service**

Create `server/src/modules/users/service.ts`:

```ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../libs/db';
import { env } from '../../config/env';
import { ApiError } from '../../middleware/errorHandler';

export type RegisterData = {
  email: string;
  password: string;
  displayName?: string;
  gender?: 'FEMALE' | 'MALE' | 'NON_BINARY' | null;
  dateOfBirth?: string | null;
  marketingConsent: boolean;
};

export type SafeUser = {
  id: string;
  email: string;
  displayName: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  marketingConsent: boolean;
  role: string;
  createdAt: Date;
};

function signToken(user: { id: string; email: string; role: string; displayName: string | null }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
  );
}

function toSafeUser(user: {
  id: string;
  email: string;
  displayName: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  marketingConsent: boolean;
  role: string;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    marketingConsent: user.marketingConsent,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function register(data: RegisterData): Promise<{ token: string }> {
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await db.user.create({
    data: {
      email: data.email,
      passwordHash,
      displayName: data.displayName ?? null,
      gender: data.gender ?? null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      marketingConsent: data.marketingConsent,
    },
  });

  return { token: signToken(user) };
}

export async function login(email: string, password: string): Promise<{ token: string }> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return { token: signToken(user) };
}

export async function me(userId: string): Promise<SafeUser> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return toSafeUser(user);
}

export async function updateProfile(
  userId: string,
  data: { displayName: string },
): Promise<SafeUser> {
  const user = await db.user.update({
    where: { id: userId },
    data: { displayName: data.displayName },
  });
  return toSafeUser(user);
}

export async function changePassword(
  userId: string,
  data: { currentPassword: string; newPassword: string },
): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'INVALID_PASSWORD', 'Current password is incorrect');
  }

  const newHash = await bcrypt.hash(data.newPassword, 12);
  await db.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
}

export async function deleteAccount(userId: string): Promise<void> {
  await db.user.delete({ where: { id: userId } });
}
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
cd server
npm test -- --reporter=verbose src/modules/users/service.test.ts
```

Expected: All 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/users/service.ts server/src/modules/users/service.test.ts server/package.json server/package-lock.json
git commit -m "feat: add user auth service (register, login, me, updateProfile, changePassword, deleteAccount)"
```

---

### Task 3: Authenticate Middleware + Auth Routes

**Files:**
- Create: `server/src/types/express.d.ts`
- Create: `server/src/middleware/authenticate.ts`
- Create: `server/src/middleware/authenticate.test.ts`
- Create: `server/src/modules/users/routes.ts`
- Modify: `server/src/routes/index.ts`

**Interfaces:**
- Consumes: `register`, `login`, `me`, `updateProfile`, `changePassword`, `deleteAccount` from `../modules/users/service`
- Produces: `authenticate` middleware that sets `req.user = { id, email, role, displayName }`; Express router mounted at `/api/auth`

- [ ] **Step 1: Create the Express type extension**

Create `server/src/types/express.d.ts`:

```ts
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
      displayName: string | null;
    };
  }
}
```

- [ ] **Step 2: Write failing tests for authenticate middleware**

Create `server/src/middleware/authenticate.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock('../config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

import jwt from 'jsonwebtoken';
import { authenticate } from './authenticate';
import { ApiError } from './errorHandler';

function mockReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

function mockNext(): NextFunction {
  return vi.fn() as NextFunction;
}

describe('authenticate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets req.user and calls next when token is valid', () => {
    const payload = { id: 'u1', email: 'a@b.com', role: 'USER', displayName: 'Alice' };
    vi.mocked(jwt.verify).mockReturnValue(payload as never);

    const req = mockReq('Bearer valid.token.here') as Request;
    const res = {} as Response;
    const next = mockNext();

    authenticate(req, res, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with 401 ApiError when no token provided', () => {
    const req = mockReq() as Request;
    const res = {} as Response;
    const next = mockNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
  });

  it('calls next with 401 ApiError when token is invalid', () => {
    vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('invalid'); });

    const req = mockReq('Bearer bad.token') as Request;
    const res = {} as Response;
    const next = mockNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd server
npm test -- --reporter=verbose src/middleware/authenticate.test.ts
```

Expected: FAIL — `./authenticate` not found.

- [ ] **Step 4: Implement the authenticate middleware**

Create `server/src/middleware/authenticate.ts`:

```ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './errorHandler';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      displayName: string | null;
    };
    req.user = { id: payload.id, email: payload.email, role: payload.role, displayName: payload.displayName };
    next();
  } catch {
    next(new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
  }
}
```

- [ ] **Step 5: Run authenticate tests and verify they pass**

```bash
cd server
npm test -- --reporter=verbose src/middleware/authenticate.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 6: Create the auth routes**

Create `server/src/modules/users/routes.ts`:

```ts
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { register, login, me, updateProfile, changePassword, deleteAccount } from './service';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional(),
  gender: z.enum(['FEMALE', 'MALE', 'NON_BINARY']).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  marketingConsent: z.boolean().default(false),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input', status: 400 } });
      return;
    }
    const result = await register(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', status: 400 } });
      return;
    }
    const result = await login(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await me(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input', status: 400 } });
      return;
    }
    const user = await updateProfile(req.user!.id, parsed.data);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/password', authenticate, async (req, res, next) => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input', status: 400 } });
      return;
    }
    await changePassword(req.user!.id, parsed.data);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/account', authenticate, async (req, res, next) => {
  try {
    await deleteAccount(req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 7: Mount auth routes in the router**

Replace the entire contents of `server/src/routes/index.ts`:

```ts
import { Router } from 'express';
import { catalogRateLimiter } from '../middleware/rateLimiter';
import catalogRouter from './catalog';
import usersRouter from '../modules/users/routes';

const router = Router();

router.use('/api', catalogRateLimiter, catalogRouter);
router.use('/api/auth', usersRouter);

export default router;
```

- [ ] **Step 8: Run all server tests**

```bash
cd server
npm test
```

Expected: All tests pass (service.test.ts + authenticate.test.ts).

- [ ] **Step 9: Commit**

```bash
git add server/src/types/express.d.ts server/src/middleware/authenticate.ts server/src/middleware/authenticate.test.ts server/src/modules/users/routes.ts server/src/routes/index.ts
git commit -m "feat: add authenticate middleware and auth route handlers (register, login, logout, me, profile, password, account)"
```

---

### Task 4: Client Config + Auth.ts + Route Handlers

**Files:**
- Modify: `client/src/libs/Env.ts`
- Modify: `client/src/libs/Auth.ts`
- Create: `client/src/app/api/auth/sign-in/route.ts`
- Create: `client/src/app/api/auth/sign-up/route.ts`
- Create: `client/src/app/api/auth/sign-out/route.ts`
- Create: `client/src/app/api/auth/me/route.ts`
- Create: `client/src/app/api/auth/profile/route.ts`
- Create: `client/src/app/api/auth/password/route.ts`
- Create: `client/src/app/api/auth/account/route.ts`

**Interfaces:**
- Consumes: `Env.JWT_SECRET` (server), `Env.BACKEND_API_URL` (server)
- Produces: `getUser(): Promise<UserSession | null>` — verified JWT; `getSession(): Promise<string | undefined>` — raw token for route handlers; `setSession(token)`, `deleteSession()`

- [ ] **Step 1: Install jose in the client**

```bash
cd client
npm install jose
```

- [ ] **Step 2: Update Env.ts to add JWT_SECRET**

Replace the entire contents of `client/src/libs/Env.ts`:

```ts
import { createEnv } from '@t3-oss/env-nextjs';
import * as z from 'zod';

export const Env = createEnv({
  server: {
    BACKEND_API_URL: z.string().optional(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().optional(),
  },
  shared: {
    NODE_ENV: z.enum(['test', 'development', 'production']).optional(),
  },
  runtimeEnv: {
    BACKEND_API_URL: process.env.BACKEND_API_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
});
```

- [ ] **Step 3: Add JWT_SECRET to client .env**

Open `client/.env` and add the line (use the same value as the server's `JWT_SECRET`):

```
JWT_SECRET=your-jwt-secret-value-here-at-least-32-chars
```

If you don't know the current `JWT_SECRET`, read `server/.env` to find it, then copy the exact value.

- [ ] **Step 4: Replace Auth.ts with jose verification**

Replace the entire contents of `client/src/libs/Auth.ts`:

```ts
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Env } from '@/libs/Env';

export type UserSession = {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
};

const SESSION_COOKIE_NAME = 'auth_token';

async function getJwtSecret(): Promise<Uint8Array> {
  return new TextEncoder().encode(Env.JWT_SECRET);
}

/**
 * Gets the raw JWT token string from cookies.
 * Used by route handlers to forward the token as a Bearer header.
 */
export async function getSession(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Sets the session cookie with the given JWT token.
 */
export async function setSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: Env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * Clears the session cookie.
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Verifies the JWT signature and returns the user session.
 * Returns null if no token exists or the token is invalid.
 */
export async function getUser(): Promise<UserSession | null> {
  const token = await getSession();
  if (!token) return null;

  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    const { id, email, role, displayName } = payload as {
      id: string;
      email: string;
      role: string;
      displayName: string | null;
    };
    return { id, email, role, displayName: displayName ?? null };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Create Next.js route handler — sign-in**

Create `client/src/app/api/auth/sign-in/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { setSession } from '@/libs/Auth';
import { Env } from '@/libs/Env';

export async function POST(request: Request) {
  const body: unknown = await request.json();

  const backendRes = await fetch(`${Env.BACKEND_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: unknown = await backendRes.json();

  if (!backendRes.ok) {
    const err = data as { error?: { message?: string } };
    return NextResponse.json(
      { error: err.error?.message ?? 'Login failed' },
      { status: backendRes.status },
    );
  }

  const { token } = data as { token: string };
  await setSession(token);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 6: Create Next.js route handler — sign-up**

Create `client/src/app/api/auth/sign-up/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { setSession } from '@/libs/Auth';
import { Env } from '@/libs/Env';

export async function POST(request: Request) {
  const body: unknown = await request.json();

  const backendRes = await fetch(`${Env.BACKEND_API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: unknown = await backendRes.json();

  if (!backendRes.ok) {
    const err = data as { error?: { message?: string } };
    return NextResponse.json(
      { error: err.error?.message ?? 'Registration failed' },
      { status: backendRes.status },
    );
  }

  const { token } = data as { token: string };
  await setSession(token);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: Create Next.js route handler — sign-out**

Create `client/src/app/api/auth/sign-out/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { deleteSession } from '@/libs/Auth';

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 8: Create authenticated proxy route handlers**

Create `client/src/app/api/auth/me/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getSession } from '@/libs/Auth';
import { Env } from '@/libs/Env';

export async function GET() {
  const token = await getSession();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const res = await fetch(`${Env.BACKEND_API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

Create `client/src/app/api/auth/profile/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getSession } from '@/libs/Auth';
import { Env } from '@/libs/Env';

export async function PUT(request: Request) {
  const token = await getSession();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body: unknown = await request.json();
  const res = await fetch(`${Env.BACKEND_API_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

Create `client/src/app/api/auth/password/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getSession } from '@/libs/Auth';
import { Env } from '@/libs/Env';

export async function PUT(request: Request) {
  const token = await getSession();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body: unknown = await request.json();
  const res = await fetch(`${Env.BACKEND_API_URL}/api/auth/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

Create `client/src/app/api/auth/account/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/libs/Auth';
import { Env } from '@/libs/Env';

export async function DELETE() {
  const token = await getSession();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const res = await fetch(`${Env.BACKEND_API_URL}/api/auth/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    await deleteSession();
  }
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

- [ ] **Step 9: Type-check the client**

```bash
cd client
npm run check:types
```

Expected: 0 errors (or only pre-existing errors unrelated to auth).

- [ ] **Step 10: Commit**

```bash
git add client/src/libs/Env.ts client/src/libs/Auth.ts client/src/app/api/ client/package.json client/package-lock.json
git commit -m "feat: replace mock JWT decoder with jose verification; add all auth route handlers"
```

---

### Task 5: Sign-in Page Redesign (Figma)

**Files:**
- Modify: `client/src/app/[locale]/(auth)/(center)/layout.tsx`
- Modify: `client/src/components/SignInForm.tsx`
- Create: `client/src/app/[locale]/(auth)/(center)/forgot-password/page.tsx`
- Modify: `client/src/locales/en.json` — extend `SignIn` namespace
- Modify: `client/src/locales/fr.json` — extend `SignIn` namespace

**Interfaces:**
- Consumes: `useTranslations('SignIn')` for all strings
- Produces: Sign-in page matching Figma — dark background, email + password fields with show/hide toggle, Log In pill button, Forget password link (red), sign-up link at bottom

- [ ] **Step 1: Update en.json — extend SignIn namespace**

In `client/src/locales/en.json`, replace the `SignIn` block:

```json
"SignIn": {
  "meta_title": "Log in — TicketLove.net",
  "meta_description": "Sign in to your TicketLove account.",
  "heading": "Log in",
  "email_label": "Email",
  "email_placeholder": "Email address",
  "password_label": "Password",
  "password_placeholder": "Password",
  "show_password": "Show password",
  "hide_password": "Hide password",
  "forgot_password": "Forget your password?",
  "submit": "Log In",
  "no_account": "Don't have an account?",
  "sign_up_link": "Sign up",
  "error_invalid_credentials": "Invalid email or password.",
  "error_generic": "Something went wrong. Please try again."
}
```

- [ ] **Step 2: Update fr.json — extend SignIn namespace**

In `client/src/locales/fr.json`, replace the `SignIn` block:

```json
"SignIn": {
  "meta_title": "Se connecter — TicketLove.net",
  "meta_description": "Connectez-vous à votre compte TicketLove.",
  "heading": "Se connecter",
  "email_label": "E-mail",
  "email_placeholder": "Adresse e-mail",
  "password_label": "Mot de passe",
  "password_placeholder": "Mot de passe",
  "show_password": "Afficher le mot de passe",
  "hide_password": "Masquer le mot de passe",
  "forgot_password": "Mot de passe oublié ?",
  "submit": "Se connecter",
  "no_account": "Pas encore de compte ?",
  "sign_up_link": "Inscription",
  "error_invalid_credentials": "E-mail ou mot de passe invalide.",
  "error_generic": "Une erreur est survenue. Veuillez réessayer."
}
```

- [ ] **Step 3: Update the center layout to use dark background**

Replace the entire contents of `client/src/app/[locale]/(auth)/(center)/layout.tsx`:

```tsx
import { setRequestLocale } from 'next-intl/server';

export default async function CenteredLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
      {props.children}
    </div>
  );
}
```

- [ ] **Step 4: Replace SignInForm with Figma design**

Replace the entire contents of `client/src/components/SignInForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/libs/I18nNavigation';

type FormData = {
  email: string;
  password: string;
};

export const SignInForm = () => {
  const t = useTranslations('SignIn');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const rawResult: unknown = await response.json();
      const result = rawResult as { error?: string };

      if (!response.ok) {
        setError(result.error ?? t('error_invalid_credentials'));
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(t('error_generic'));
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <h1
        className="mb-8 text-[32px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {t('heading')}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-brand-subtle)] p-3 text-[14px] text-[var(--color-brand)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]"
          >
            {t('email_label')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('email_placeholder')}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu, message: 'Invalid email' },
            })}
            className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-[15px] text-white placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand)]"
          />
          {errors.email && (
            <p className="mt-1 text-[12px] text-[var(--color-brand)]">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]"
          >
            {t('password_label')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('password_placeholder')}
              {...register('password', { required: 'Password is required' })}
              className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-3 pr-12 text-[15px] text-white placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand)]"
            />
            <button
              type="button"
              aria-label={showPassword ? t('hide_password') : t('show_password')}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-[12px] text-[var(--color-brand)]">{errors.password.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[13px] text-[var(--color-brand)] hover:underline"
          >
            {t('forgot_password')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full rounded-full border border-white py-3 text-[16px] font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-[14px] text-[var(--color-text-secondary)]">
        {t('no_account')}{' '}
        <Link href="/sign-up" className="text-white underline">
          {t('sign_up_link')}
        </Link>
      </p>
    </div>
  );
};
```

- [ ] **Step 5: Create the forgot-password stub page**

Create the directory and file `client/src/app/[locale]/(auth)/(center)/forgot-password/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(_props: ForgotPasswordPageProps): Promise<Metadata> {
  return { title: 'Forgot Password — TicketLove.net' };
}

export default async function ForgotPasswordPage(props: ForgotPasswordPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="w-full max-w-[400px] text-center">
      <h1
        className="mb-4 text-[32px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        Password Reset
      </h1>
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Password reset is coming soon. Please contact support for assistance.
      </p>
      <Link href="/sign-in" className="text-[var(--color-brand)] underline">
        Back to Log In
      </Link>
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

```bash
cd client
npm run check:types
```

Expected: 0 type errors introduced by this task.

- [ ] **Step 7: Commit**

```bash
git add client/src/app/[locale]/\(auth\)/\(center\)/layout.tsx client/src/components/SignInForm.tsx client/src/app/[locale]/\(auth\)/\(center\)/forgot-password/ client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: redesign sign-in page to match Figma (dark theme, show/hide password, forgot password link)"
```

---

### Task 6: Sign-up Page Redesign (Figma)

**Files:**
- Modify: `client/src/components/SignUpForm.tsx`
- Modify: `client/src/locales/en.json` — extend `SignUp` namespace
- Modify: `client/src/locales/fr.json` — extend `SignUp` namespace

**Interfaces:**
- Consumes: `useTranslations('SignUp')`
- Produces: Sign-up form with all Figma fields: displayName, email, password+hint+toggle, gender radio (optional), DOB dropdowns (optional), marketing consent checkbox

- [ ] **Step 1: Update en.json — extend SignUp namespace**

In `client/src/locales/en.json`, replace the `SignUp` block:

```json
"SignUp": {
  "meta_title": "Sign up — TicketLove.net",
  "meta_description": "Create your TicketLove account.",
  "heading": "Create account",
  "display_name_label": "Profile name",
  "display_name_placeholder": "Your name",
  "email_label": "Email",
  "email_placeholder": "Email address",
  "password_label": "Password",
  "password_placeholder": "Password",
  "password_hint": "8+ characters",
  "show_password": "Show password",
  "hide_password": "Hide password",
  "gender_label": "Gender",
  "gender_female": "Female",
  "gender_male": "Male",
  "gender_non_binary": "Non-binary",
  "dob_label": "Date of birth",
  "dob_month": "Month",
  "dob_day": "Day",
  "dob_year": "Year",
  "marketing_consent": "I want to receive email updates about events and offers",
  "terms_prefix": "By signing up, you agree to our",
  "terms_link": "Terms of Use",
  "privacy_link": "Privacy Policy",
  "terms_and": "and",
  "submit": "Sign up",
  "already_have_account": "Already have an account?",
  "sign_in_link": "Log in",
  "error_email_in_use": "An account with this email already exists.",
  "error_generic": "Something went wrong. Please try again."
}
```

- [ ] **Step 2: Update fr.json — extend SignUp namespace**

In `client/src/locales/fr.json`, replace the `SignUp` block:

```json
"SignUp": {
  "meta_title": "Inscription — TicketLove.net",
  "meta_description": "Créez votre compte TicketLove.",
  "heading": "Créer un compte",
  "display_name_label": "Nom de profil",
  "display_name_placeholder": "Votre nom",
  "email_label": "E-mail",
  "email_placeholder": "Adresse e-mail",
  "password_label": "Mot de passe",
  "password_placeholder": "Mot de passe",
  "password_hint": "8 caractères minimum",
  "show_password": "Afficher le mot de passe",
  "hide_password": "Masquer le mot de passe",
  "gender_label": "Genre",
  "gender_female": "Femme",
  "gender_male": "Homme",
  "gender_non_binary": "Non-binaire",
  "dob_label": "Date de naissance",
  "dob_month": "Mois",
  "dob_day": "Jour",
  "dob_year": "Année",
  "marketing_consent": "Je souhaite recevoir des mises à jour par e-mail sur les événements et offres",
  "terms_prefix": "En vous inscrivant, vous acceptez nos",
  "terms_link": "Conditions d'utilisation",
  "privacy_link": "Politique de confidentialité",
  "terms_and": "et",
  "submit": "S'inscrire",
  "already_have_account": "Vous avez déjà un compte ?",
  "sign_in_link": "Se connecter",
  "error_email_in_use": "Un compte avec cet e-mail existe déjà.",
  "error_generic": "Une erreur est survenue. Veuillez réessayer."
}
```

- [ ] **Step 3: Replace SignUpForm with Figma design**

Replace the entire contents of `client/src/components/SignUpForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/libs/I18nNavigation';

type FormData = {
  displayName: string;
  email: string;
  password: string;
  gender: 'FEMALE' | 'MALE' | 'NON_BINARY' | '';
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  marketingConsent: boolean;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SignUpForm = () => {
  const t = useTranslations('SignUp');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { marketingConsent: true, gender: '' } });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    let dateOfBirth: string | null = null;
    if (data.dobYear && data.dobMonth && data.dobDay) {
      const monthIndex = MONTHS.indexOf(data.dobMonth);
      if (monthIndex !== -1) {
        dateOfBirth = `${data.dobYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(data.dobDay).padStart(2, '0')}`;
      }
    }

    const payload = {
      email: data.email,
      password: data.password,
      displayName: data.displayName || undefined,
      gender: data.gender || null,
      dateOfBirth,
      marketingConsent: data.marketingConsent,
    };

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const rawResult: unknown = await response.json();
      const result = rawResult as { error?: string };

      if (!response.ok) {
        const msg = result.error ?? t('error_generic');
        setError(msg.includes('already exists') ? t('error_email_in_use') : msg);
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(t('error_generic'));
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px]">
      <h1
        className="mb-8 text-[32px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {t('heading')}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-brand-subtle)] p-3 text-[14px] text-[var(--color-brand)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
            {t('display_name_label')}
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder={t('display_name_placeholder')}
            {...register('displayName')}
            className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-[15px] text-white placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand)]"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
            {t('email_label')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('email_placeholder')}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu, message: 'Invalid email' },
            })}
            className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-[15px] text-white placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand)]"
          />
          {errors.email && <p className="mt-1 text-[12px] text-[var(--color-brand)]">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
            {t('password_label')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('password_placeholder')}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
              className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-3 pr-12 text-[15px] text-white placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand)]"
            />
            <button
              type="button"
              aria-label={showPassword ? t('hide_password') : t('show_password')}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{t('password_hint')}</p>
          {errors.password && <p className="mt-0.5 text-[12px] text-[var(--color-brand)]">{errors.password.message}</p>}
        </div>

        {/* Gender (optional) */}
        <div>
          <p className="mb-2 text-[14px] font-medium text-[var(--color-text-secondary)]">{t('gender_label')}</p>
          <div className="flex gap-4">
            {(['FEMALE', 'MALE', 'NON_BINARY'] as const).map((g) => (
              <label key={g} className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--color-text-secondary)]">
                <input
                  type="radio"
                  value={g}
                  {...register('gender')}
                  className="accent-[var(--color-brand)]"
                />
                {t(`gender_${g.toLowerCase()}` as 'gender_female' | 'gender_male' | 'gender_non_binary')}
              </label>
            ))}
          </div>
        </div>

        {/* Date of Birth (optional) */}
        <div>
          <p className="mb-2 text-[14px] font-medium text-[var(--color-text-secondary)]">{t('dob_label')}</p>
          <div className="grid grid-cols-3 gap-2">
            <select
              {...register('dobMonth')}
              className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-[14px] text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="">{t('dob_month')}</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              {...register('dobDay')}
              className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-[14px] text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="">{t('dob_day')}</option>
              {days.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              {...register('dobYear')}
              className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-[14px] text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="">{t('dob_year')}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Marketing consent */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            {...register('marketingConsent')}
            className="mt-0.5 size-4 accent-[var(--color-brand)]"
          />
          <span className="text-[13px] text-[var(--color-text-secondary)]">{t('marketing_consent')}</span>
        </label>

        {/* Terms */}
        <p className="text-[12px] text-[var(--color-text-muted)]">
          {t('terms_prefix')}{' '}
          <a href="#" className="text-white underline">{t('terms_link')}</a>
          {' '}{t('terms_and')}{' '}
          <a href="#" className="text-white underline">{t('privacy_link')}</a>.
        </p>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full border border-white py-3 text-[16px] font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-[14px] text-[var(--color-text-secondary)]">
        {t('already_have_account')}{' '}
        <Link href="/sign-in" className="text-white underline">
          {t('sign_in_link')}
        </Link>
      </p>
    </div>
  );
};
```

- [ ] **Step 4: Type-check**

```bash
cd client
npm run check:types
```

Expected: 0 new type errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/SignUpForm.tsx client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: redesign sign-up page to match Figma (all fields: name, gender, DOB, consent)"
```

---

### Task 7: Dashboard Layout + Sidebar

**Files:**
- Create: `client/src/components/DashboardSidebar.tsx`
- Modify: `client/src/app/[locale]/(auth)/dashboard/layout.tsx`
- Modify: `client/src/locales/en.json` — update `DashboardLayout` namespace
- Modify: `client/src/locales/fr.json` — update `DashboardLayout` namespace

**Interfaces:**
- Consumes: `getUser()` from `@/libs/Auth`; `useTranslations('DashboardLayout')` (sidebar is RSC, uses server translations)
- Produces: Full-screen layout with left sidebar (logo, nav links, logout) and right content area; nav links: Overview (`/dashboard`), Profile (`/dashboard/profile`), My Orders (`/dashboard/orders`), My Tickets (`/dashboard/tickets`), Notifications (`/dashboard/notifications`), Settings (`/dashboard/settings`)

- [ ] **Step 1: Update en.json — DashboardLayout namespace**

In `client/src/locales/en.json`, replace the `DashboardLayout` block and `Dashboard` block:

```json
"Dashboard": {
  "hello_message": "Hello {email}!",
  "alternative_message": "Welcome to your dashboard."
},
"DashboardLayout": {
  "meta_title": "Dashboard — TicketLove.net",
  "meta_description": "Manage your account and tickets.",
  "nav_overview": "Overview",
  "nav_profile": "Profile",
  "nav_orders": "My Orders",
  "nav_tickets": "My Tickets",
  "nav_notifications": "Notifications",
  "nav_settings": "Settings",
  "sign_out": "Log out"
}
```

- [ ] **Step 2: Update fr.json — DashboardLayout namespace**

In `client/src/locales/fr.json`, replace the `DashboardLayout` and `Dashboard` blocks:

```json
"Dashboard": {
  "hello_message": "Bonjour {email} !",
  "alternative_message": "Bienvenue sur votre tableau de bord."
},
"DashboardLayout": {
  "meta_title": "Tableau de bord — TicketLove.net",
  "meta_description": "Gérez votre compte et vos billets.",
  "nav_overview": "Aperçu",
  "nav_profile": "Profil",
  "nav_orders": "Mes commandes",
  "nav_tickets": "Mes billets",
  "nav_notifications": "Notifications",
  "nav_settings": "Paramètres",
  "sign_out": "Se déconnecter"
}
```

- [ ] **Step 3: Create the DashboardSidebar component**

Create `client/src/components/DashboardSidebar.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { SignOutButton } from '@/components/SignOutButton';

type NavItem = {
  href: string;
  labelKey: 'nav_overview' | 'nav_profile' | 'nav_orders' | 'nav_tickets' | 'nav_notifications' | 'nav_settings';
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'nav_overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/dashboard/profile',
    labelKey: 'nav_profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/orders',
    labelKey: 'nav_orders',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: '/dashboard/tickets',
    labelKey: 'nav_tickets',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/notifications',
    labelKey: 'nav_notifications',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    labelKey: 'nav_settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

type DashboardSidebarProps = {
  locale: string;
  pathname: string;
};

export async function DashboardSidebar(props: DashboardSidebarProps) {
  const t = await getTranslations({ locale: props.locale, namespace: 'DashboardLayout' });

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-[#111111] border-r border-[var(--color-surface-border)]">
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/" className="text-[20px] font-bold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
          Ticket<span className="text-[var(--color-brand)]">Love</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2" aria-label="Dashboard navigation">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = props.pathname === item.href || (item.href !== '/dashboard' && props.pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-white'
                  }`}
                >
                  {item.icon}
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-[var(--color-surface-border)] px-3 py-4">
        <SignOutButton>
          <span className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-white w-full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('sign_out')}
          </span>
        </SignOutButton>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Replace the dashboard layout**

Replace the entire contents of `client/src/app/[locale]/(auth)/dashboard/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { getUser } from '@/libs/Auth';
import { DashboardSidebar } from '@/components/DashboardSidebar';

type DashboardLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: DashboardLayoutProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'DashboardLayout' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export default async function DashboardLayout(props: DashboardLayoutProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '/dashboard';

  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      <DashboardSidebar locale={locale} pathname={pathname} />
      <main className="flex-1 overflow-y-auto">
        {props.children}
      </main>
    </div>
  );
}
```

Note: `x-pathname` header must be set by middleware. Open `client/src/proxy.ts` and add this line inside the `handleI18nRouting` wrapper — just before the final `return handleI18nRouting(request)`:

```ts
// In proxy.ts, update the proxy function to pass pathname to layout:
export default function proxy(request: NextRequest, _event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has('auth_token');

  const localeMatch = pathname.match(/^\/(fr)/u);
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';

  if (isProtectedRoute(pathname) && !hasToken) {
    const signInUrl = new URL(`${localePrefix}/sign-in`, request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthPage(pathname) && hasToken) {
    const dashboardUrl = new URL(`${localePrefix}/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  const response = handleI18nRouting(request);
  // Inject the pathname so server layouts can highlight the active nav item
  if (response instanceof NextResponse) {
    response.headers.set('x-pathname', pathname);
  }
  return response;
}
```

- [ ] **Step 5: Type-check**

```bash
cd client
npm run check:types
```

Expected: 0 new type errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/DashboardSidebar.tsx client/src/app/[locale]/\(auth\)/dashboard/layout.tsx client/src/proxy.ts client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: replace dashboard layout with Figma sidebar design (nav: Overview, Profile, Orders, Tickets, Notifications, Settings)"
```

---

### Task 8: Dashboard Overview + Profile Screens

**Files:**
- Modify: `client/src/app/[locale]/(auth)/dashboard/page.tsx`
- Create: `client/src/app/[locale]/(auth)/dashboard/profile/page.tsx`
- Create: `client/src/components/DashboardProfileForm.tsx`
- Modify: `client/src/locales/en.json` — add `DashboardOverview`, `DashboardProfile` namespaces
- Modify: `client/src/locales/fr.json` — same

**Interfaces:**
- Consumes: `getUser()` from `@/libs/Auth`; `GET /api/auth/me` via fetch for full profile data
- Produces: Overview page with greeting, stats, empty states; Profile page with editable displayName, read-only email

- [ ] **Step 1: Add i18n strings in en.json**

Add these new namespaces to `client/src/locales/en.json` (before the closing `}`):

```json
"DashboardOverview": {
  "greeting": "Hey, {name}! 👋",
  "greeting_fallback": "Hey there! 👋",
  "best_show": "Your best show",
  "best_show_empty": "No upcoming shows yet",
  "upcoming_shows": "Upcoming shows",
  "orders_count": "Orders",
  "recent_orders": "Recent orders",
  "no_orders": "No orders yet",
  "recent_alerts": "Recent alerts",
  "no_alerts": "No alerts yet"
},
"DashboardProfile": {
  "heading": "Profile",
  "avatar_alt": "Profile avatar",
  "name_label": "Full name",
  "email_label": "Email",
  "save_button": "Save changes",
  "save_success": "Profile updated successfully.",
  "save_error": "Failed to update profile. Please try again."
}
```

- [ ] **Step 2: Add i18n strings in fr.json**

Add these new namespaces to `client/src/locales/fr.json`:

```json
"DashboardOverview": {
  "greeting": "Salut, {name} ! 👋",
  "greeting_fallback": "Bonjour ! 👋",
  "best_show": "Votre meilleur spectacle",
  "best_show_empty": "Aucun spectacle à venir",
  "upcoming_shows": "Spectacles à venir",
  "orders_count": "Commandes",
  "recent_orders": "Commandes récentes",
  "no_orders": "Aucune commande pour l'instant",
  "recent_alerts": "Alertes récentes",
  "no_alerts": "Aucune alerte pour l'instant"
},
"DashboardProfile": {
  "heading": "Profil",
  "avatar_alt": "Avatar de profil",
  "name_label": "Nom complet",
  "email_label": "E-mail",
  "save_button": "Enregistrer les modifications",
  "save_success": "Profil mis à jour avec succès.",
  "save_error": "Échec de la mise à jour du profil. Veuillez réessayer."
}
```

- [ ] **Step 3: Replace the Dashboard Overview page**

Replace the entire contents of `client/src/app/[locale]/(auth)/dashboard/page.tsx`:

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getUser } from '@/libs/Auth';

export default async function DashboardPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardOverview' });
  const user = await getUser();
  const displayName = user?.displayName ?? user?.email;

  return (
    <div className="p-8">
      <h1
        className="mb-8 text-[28px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {displayName ? t('greeting', { name: displayName }) : t('greeting_fallback')}
      </h1>

      {/* Best show placeholder */}
      <div className="mb-8 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
        <p className="mb-2 text-[13px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {t('best_show')}
        </p>
        <p className="text-[var(--color-text-secondary)]">{t('best_show_empty')}</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        {[
          { label: t('upcoming_shows'), value: '0' },
          { label: t('orders_count'), value: '0' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6"
          >
            <p className="text-[36px] font-semibold text-white">{stat.value}</p>
            <p className="text-[14px] text-[var(--color-text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <section className="mb-8">
        <h2 className="mb-4 text-[18px] font-semibold text-white">{t('recent_orders')}</h2>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <p className="text-[var(--color-text-muted)]">{t('no_orders')}</p>
        </div>
      </section>

      {/* Recent alerts */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-white">{t('recent_alerts')}</h2>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <p className="text-[var(--color-text-muted)]">{t('no_alerts')}</p>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Create DashboardProfileForm (client component)**

Create `client/src/components/DashboardProfileForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/libs/I18nNavigation';

type FormData = { displayName: string };

type DashboardProfileFormProps = {
  initialDisplayName: string;
  email: string;
};

export function DashboardProfileForm(props: DashboardProfileFormProps) {
  const t = useTranslations('DashboardProfile');
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { displayName: props.initialDisplayName },
  });

  const onSubmit = async (data: FormData) => {
    setStatus('idle');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: data.displayName }),
      });
      if (res.ok) {
        setStatus('success');
        router.refresh();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('name_label')}
        </label>
        <input
          id="displayName"
          type="text"
          {...register('displayName', { required: true })}
          className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-white outline-none focus:border-[var(--color-brand)]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('email_label')}
        </label>
        <input
          type="email"
          value={props.email}
          readOnly
          className="w-full cursor-not-allowed rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-[var(--color-text-muted)] outline-none"
        />
      </div>

      {status === 'success' && (
        <p className="text-[13px] text-green-400">{t('save_success')}</p>
      )}
      {status === 'error' && (
        <p className="text-[13px] text-[var(--color-brand)]">{t('save_error')}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-[var(--color-brand)] px-8 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {t('save_button')}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Create the Profile page**

Create `client/src/app/[locale]/(auth)/dashboard/profile/page.tsx`:

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getUser } from '@/libs/Auth';
import { DashboardProfileForm } from '@/components/DashboardProfileForm';

export default async function DashboardProfilePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardProfile' });
  const user = await getUser();

  const initials = (user?.displayName ?? user?.email ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="p-8">
      <h1
        className="mb-8 text-[28px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {t('heading')}
      </h1>

      <div className="max-w-[480px]">
        {/* Avatar */}
        <div className="mb-8 flex items-center gap-4">
          <div
            className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-[24px] font-semibold text-white"
            aria-label={t('avatar_alt')}
          >
            {initials}
          </div>
        </div>

        <DashboardProfileForm
          initialDisplayName={user?.displayName ?? ''}
          email={user?.email ?? ''}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

```bash
cd client
npm run check:types
```

Expected: 0 new type errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/app/[locale]/\(auth\)/dashboard/page.tsx client/src/app/[locale]/\(auth\)/dashboard/profile/ client/src/components/DashboardProfileForm.tsx client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: add dashboard Overview and Profile screens (greeting, stats, avatar, editable displayName)"
```

---

### Task 9: Dashboard Settings + Remaining Screens

**Files:**
- Create: `client/src/app/[locale]/(auth)/dashboard/orders/page.tsx`
- Create: `client/src/app/[locale]/(auth)/dashboard/tickets/page.tsx`
- Create: `client/src/app/[locale]/(auth)/dashboard/notifications/page.tsx`
- Create: `client/src/app/[locale]/(auth)/dashboard/settings/page.tsx`
- Create: `client/src/app/[locale]/(auth)/dashboard/settings/change-password/page.tsx`
- Create: `client/src/components/DashboardChangePasswordForm.tsx`
- Create: `client/src/components/DashboardDeleteAccountButton.tsx`
- Modify: `client/src/locales/en.json`, `fr.json`

**Interfaces:**
- Consumes: `PUT /api/auth/password`, `DELETE /api/auth/account` via fetch
- Produces: 4 empty-state screens + Settings screen with change-password link, notification toggles (UI only), delete account confirm dialog

- [ ] **Step 1: Add i18n strings in en.json**

Add these new namespaces to `client/src/locales/en.json`:

```json
"DashboardOrders": {
  "heading": "My Orders",
  "col_order_id": "Order ID",
  "col_event": "Event",
  "col_date": "Date",
  "col_total": "Total",
  "col_status": "Status",
  "no_orders": "No orders yet"
},
"DashboardTickets": {
  "heading": "My Tickets",
  "tab_upcoming": "Upcoming",
  "tab_past": "Past",
  "no_tickets": "No tickets yet"
},
"DashboardNotifications": {
  "heading": "Notifications",
  "mark_all_read": "Mark all read",
  "no_notifications": "No notifications yet"
},
"DashboardSettings": {
  "heading": "Settings",
  "security_section": "Security",
  "change_password_link": "Change password",
  "notifications_section": "Notifications",
  "email_notifications": "Email notifications",
  "price_alerts": "Price alerts",
  "danger_section": "Danger zone",
  "delete_account": "Delete account",
  "delete_confirm_title": "Delete your account?",
  "delete_confirm_body": "This action cannot be undone. All your data will be permanently removed.",
  "delete_confirm_button": "Yes, delete my account",
  "delete_cancel": "Cancel",
  "delete_error": "Failed to delete account. Please try again.",
  "change_password_heading": "Change password",
  "current_password_label": "Current password",
  "new_password_label": "New password",
  "confirm_password_label": "Confirm new password",
  "password_hint": "8+ characters",
  "save_password": "Update password",
  "password_mismatch": "Passwords do not match.",
  "password_success": "Password updated successfully.",
  "password_error": "Failed to update password. Please try again."
}
```

- [ ] **Step 2: Add i18n strings in fr.json**

Add these new namespaces to `client/src/locales/fr.json`:

```json
"DashboardOrders": {
  "heading": "Mes commandes",
  "col_order_id": "N° commande",
  "col_event": "Événement",
  "col_date": "Date",
  "col_total": "Total",
  "col_status": "Statut",
  "no_orders": "Aucune commande pour l'instant"
},
"DashboardTickets": {
  "heading": "Mes billets",
  "tab_upcoming": "À venir",
  "tab_past": "Passés",
  "no_tickets": "Aucun billet pour l'instant"
},
"DashboardNotifications": {
  "heading": "Notifications",
  "mark_all_read": "Tout marquer comme lu",
  "no_notifications": "Aucune notification pour l'instant"
},
"DashboardSettings": {
  "heading": "Paramètres",
  "security_section": "Sécurité",
  "change_password_link": "Modifier le mot de passe",
  "notifications_section": "Notifications",
  "email_notifications": "Notifications par e-mail",
  "price_alerts": "Alertes de prix",
  "danger_section": "Zone de danger",
  "delete_account": "Supprimer le compte",
  "delete_confirm_title": "Supprimer votre compte ?",
  "delete_confirm_body": "Cette action est irréversible. Toutes vos données seront définitivement supprimées.",
  "delete_confirm_button": "Oui, supprimer mon compte",
  "delete_cancel": "Annuler",
  "delete_error": "Échec de la suppression du compte. Veuillez réessayer.",
  "change_password_heading": "Modifier le mot de passe",
  "current_password_label": "Mot de passe actuel",
  "new_password_label": "Nouveau mot de passe",
  "confirm_password_label": "Confirmer le nouveau mot de passe",
  "password_hint": "8 caractères minimum",
  "save_password": "Mettre à jour le mot de passe",
  "password_mismatch": "Les mots de passe ne correspondent pas.",
  "password_success": "Mot de passe mis à jour avec succès.",
  "password_error": "Échec de la mise à jour du mot de passe. Veuillez réessayer."
}
```

- [ ] **Step 3: Create the Orders page (empty state)**

Create `client/src/app/[locale]/(auth)/dashboard/orders/page.tsx`:

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function DashboardOrdersPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardOrders' });

  return (
    <div className="p-8">
      <h1 className="mb-8 text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        {t('heading')}
      </h1>
      <div className="overflow-hidden rounded-2xl border border-[var(--color-surface-border)]">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-[var(--color-surface-border)] bg-[var(--color-surface-raised)]">
            <tr>
              {(['col_order_id', 'col_event', 'col_date', 'col_total', 'col_status'] as const).map((col) => (
                <th key={col} className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">
                  {t(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                {t('no_orders')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the Tickets page (empty state with tabs)**

Create `client/src/app/[locale]/(auth)/dashboard/tickets/page.tsx`:

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function DashboardTicketsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardTickets' });

  return (
    <div className="p-8">
      <h1 className="mb-8 text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        {t('heading')}
      </h1>
      <div className="mb-6 flex gap-4 border-b border-[var(--color-surface-border)]">
        <button type="button" className="border-b-2 border-[var(--color-brand)] pb-3 text-[14px] font-medium text-[var(--color-brand)]">
          {t('tab_upcoming')}
        </button>
        <button type="button" className="pb-3 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-white">
          {t('tab_past')}
        </button>
      </div>
      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-12 text-center">
        <p className="text-[var(--color-text-muted)]">{t('no_tickets')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create the Notifications page (empty state)**

Create `client/src/app/[locale]/(auth)/dashboard/notifications/page.tsx`:

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function DashboardNotificationsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardNotifications' });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
          {t('heading')}
        </h1>
        <button type="button" className="text-[14px] text-[var(--color-brand)] hover:underline">
          {t('mark_all_read')}
        </button>
      </div>
      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-12 text-center">
        <p className="text-[var(--color-text-muted)]">{t('no_notifications')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create DashboardChangePasswordForm (client component)**

Create `client/src/components/DashboardChangePasswordForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

type FormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function DashboardChangePasswordForm() {
  const t = useTranslations('DashboardSettings');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, watch, reset, formState: { isSubmitting, errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    if (data.newPassword !== data.confirmPassword) {
      setStatus('error');
      setErrorMsg(t('password_mismatch'));
      return;
    }
    setStatus('idle');
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      if (res.ok) {
        setStatus('success');
        reset();
      } else {
        const raw: unknown = await res.json();
        const err = raw as { error?: string };
        setErrorMsg(err.error ?? t('password_error'));
        setStatus('error');
      }
    } catch {
      setErrorMsg(t('password_error'));
      setStatus('error');
    }
  };

  const inputClass = 'w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-white outline-none focus:border-[var(--color-brand)]';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-[440px] space-y-4">
      <div>
        <label htmlFor="currentPassword" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('current_password_label')}
        </label>
        <input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword', { required: true })} className={inputClass} />
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('new_password_label')}
        </label>
        <input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword', { required: true, minLength: { value: 8, message: t('password_hint') } })} className={inputClass} />
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{t('password_hint')}</p>
        {errors.newPassword && <p className="mt-0.5 text-[12px] text-[var(--color-brand)]">{errors.newPassword.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('confirm_password_label')}
        </label>
        <input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword', { required: true })} className={inputClass} />
      </div>

      {status === 'success' && <p className="text-[13px] text-green-400">{t('password_success')}</p>}
      {status === 'error' && <p className="text-[13px] text-[var(--color-brand)]">{errorMsg}</p>}

      <button type="submit" disabled={isSubmitting} className="rounded-full bg-[var(--color-brand)] px-8 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50">
        {t('save_password')}
      </button>
    </form>
  );
}
```

- [ ] **Step 7: Create DashboardDeleteAccountButton (client component)**

Create `client/src/components/DashboardDeleteAccountButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/libs/I18nNavigation';

export function DashboardDeleteAccountButton() {
  const t = useTranslations('DashboardSettings');
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      if (res.ok) {
        router.push('/sign-in');
        router.refresh();
      } else {
        setError(t('delete_error'));
        setIsDeleting(false);
      }
    } catch {
      setError(t('delete_error'));
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="rounded-2xl border border-[var(--color-brand)] bg-[var(--color-brand-subtle)] p-6">
        <h3 className="mb-2 text-[16px] font-semibold text-white">{t('delete_confirm_title')}</h3>
        <p className="mb-4 text-[14px] text-[var(--color-text-secondary)]">{t('delete_confirm_body')}</p>
        {error && <p className="mb-3 text-[13px] text-[var(--color-brand)]">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-full bg-[var(--color-brand)] px-6 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
          >
            {t('delete_confirm_button')}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="rounded-full border border-[var(--color-surface-border)] px-6 py-2.5 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-white"
          >
            {t('delete_cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="rounded-full border border-[var(--color-brand)] px-6 py-2.5 text-[14px] font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)]"
    >
      {t('delete_account')}
    </button>
  );
}
```

- [ ] **Step 8: Create the Settings page**

Create `client/src/app/[locale]/(auth)/dashboard/settings/page.tsx`:

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { DashboardDeleteAccountButton } from '@/components/DashboardDeleteAccountButton';

export default async function DashboardSettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardSettings' });

  return (
    <div className="p-8">
      <h1 className="mb-8 text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        {t('heading')}
      </h1>

      <div className="max-w-[600px] space-y-8">
        {/* Security */}
        <section className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <h2 className="mb-4 text-[18px] font-semibold text-white">{t('security_section')}</h2>
          <Link
            href="/dashboard/settings/change-password"
            className="flex items-center justify-between text-[14px] text-[var(--color-text-secondary)] hover:text-white"
          >
            <span>{t('change_password_link')}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </section>

        {/* Notifications (UI only) */}
        <section className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <h2 className="mb-4 text-[18px] font-semibold text-white">{t('notifications_section')}</h2>
          <div className="space-y-4">
            {([
              { key: 'email_notifications' },
              { key: 'price_alerts' },
            ] as const).map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-[14px] text-[var(--color-text-secondary)]">{t(item.key)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked="false"
                  className="relative h-6 w-11 rounded-full bg-[var(--color-surface-border)] transition-colors"
                >
                  <span className="absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <h2 className="mb-4 text-[18px] font-semibold text-[var(--color-brand)]">{t('danger_section')}</h2>
          <DashboardDeleteAccountButton />
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create the change-password page**

Create `client/src/app/[locale]/(auth)/dashboard/settings/change-password/page.tsx`:

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DashboardChangePasswordForm } from '@/components/DashboardChangePasswordForm';

export default async function ChangePasswordPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardSettings' });

  return (
    <div className="p-8">
      <h1 className="mb-8 text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        {t('change_password_heading')}
      </h1>
      <DashboardChangePasswordForm />
    </div>
  );
}
```

- [ ] **Step 10: Type-check and lint**

```bash
cd client
npm run check:types
```

Expected: 0 new type errors introduced by Phase 3 work.

```bash
cd client
npm run lint
```

Expected: No new lint violations above the pre-existing 94-error baseline.

- [ ] **Step 11: Run server tests**

```bash
cd server
npm test
```

Expected: All tests pass.

- [ ] **Step 12: Commit**

```bash
git add client/src/app/[locale]/\(auth\)/dashboard/ client/src/components/DashboardChangePasswordForm.tsx client/src/components/DashboardDeleteAccountButton.tsx client/src/locales/en.json client/src/locales/fr.json
git commit -m "feat: add all dashboard screens — Overview, Profile, Orders, Tickets, Notifications, Settings with change-password and delete-account"
```

---

## Self-Review

### 1. Spec Coverage

| Spec requirement | Task |
|---|---|
| User can register (all fields) | Task 2, 6 |
| User can sign in | Task 2, 5 |
| JWT signed and verified (not mock) | Task 2, 4 |
| httpOnly cookie `auth_token` | Task 4 |
| Protected routes redirect unauthenticated | existing proxy.ts; Task 7 (layout redirect) |
| Sign-in page matches Figma | Task 5 |
| Sign-up page matches Figma (all fields) | Task 6 |
| Dashboard 6 screens match Figma layout | Tasks 7, 8, 9 |
| Edit profile (displayName) | Task 8 |
| Change password | Task 9 |
| Delete account | Task 9 |
| All strings in i18n files | Tasks 5–9 (per task) |
| `npm run check:types` passes | Task 9 step 10 |
| Backend tests pass | Task 3 step 8, Task 9 step 11 |
| `/forgot-password` stub | Task 5 |
| `PUT /api/auth/profile` route handler (Next.js + Express) | Tasks 3, 4 |
| `PUT /api/auth/password` route handler (Next.js + Express) | Tasks 3, 4 |
| `DELETE /api/auth/account` route handler (Next.js + Express) | Tasks 3, 4 |

### 2. Placeholder Scan

No TBDs, TODOs, or "implement later" markers in the plan.

### 3. Type Consistency

- `UserSession` in `Auth.ts`: `{ id, email, role, displayName }` — matches JWT payload signed in `service.ts`.
- `SafeUser` in `service.ts`: used by `me()`, `updateProfile()` — consistent field names.
- `RegisterData` in `service.ts`: used by route handler `register` — fields match the Zod schema.
- `DashboardProfileForm` props: `initialDisplayName: string`, `email: string` — matches what the profile page passes.

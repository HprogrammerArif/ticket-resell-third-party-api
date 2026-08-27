# Admin Dashboard Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Steven can sign in at `/admin`, see platform stats, search customers, and reach TicketNetwork's reporting portal.

**Architecture:** A second authentication boundary alongside the existing customer one. Admins live in the `AdminUser` table with their own cookie (`admin_token`) and their own JWT audience (`aud: 'admin'`), so a customer token fails admin verification at the signature check rather than at an application check someone could forget. Admin pages use the same Backend-for-Frontend path as customers — browser to Next.js to Express — so Express stays off the public internet.

**Tech Stack:** Express 4, Prisma 6, `jsonwebtoken`, `bcryptjs`, Vitest + Supertest (server); Next.js 16 App Router, `jose`, Tailwind 4 (client).

**Spec:** `docs/superpowers/specs/2026-08-27-admin-dashboard-design.md`

## Global Constraints

- **Never destructure props in a component signature.** Use `props.foo` (`client/CLAUDE.md` §5.1).
- **Named exports only**, except Next.js `page.tsx` / `layout.tsx` defaults, whose default export name ends in `Page` or `Layout`.
- **No `process.env` outside `Env.ts`** (client) or `config/env.ts` (server).
- **No `useMemo` / `useCallback`.** Avoid `useEffect` unless measuring DOM or subscribing to a browser event.
- **Server components by default**; `'use client'` only for event handlers.
- **Admin pages are English-only** and live outside `[locale]`. They do **not** use next-intl.
- **Conventional commits, no scope:** `feat: ...`, `fix: ...`, `test: ...`, `chore: ...`.
- **Test naming:** third-person present, no "should" — `it('returns the created record')`.
- Server tests run with `npm test` from `server/`. Client typecheck is `npm run check:types` from `client/`.
- Admin token expiry is **8 hours**. Customer token expiry stays `env.JWT_EXPIRES_IN` (7d).

---

### Task 1: Remove tracked test build artifacts

`tsc` previously compiled `tests/` because `tsconfig.json` had `include: ["src", "tests"]`. That was fixed by `tsconfig.build.json`, but 18 emitted `.js` and `.js.map` files were committed and remain tracked. They will drift from the `.ts` sources and confuse anyone reading the test directory — which this plan adds to.

**Files:**
- Delete: `server/tests/*.js`, `server/tests/*.js.map`, `server/tests/**/*.js`, `server/tests/**/*.js.map`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: a clean `server/tests/` containing only `.ts` sources

- [ ] **Step 1: Confirm what is tracked**

```bash
git ls-files server/tests | grep -E "\.js$|\.js\.map$"
```

Expected: 18 files listed.

- [ ] **Step 2: Untrack and delete them**

```bash
git rm --cached $(git ls-files server/tests | grep -E "\.js$|\.js\.map$")
find server/tests -name "*.js" -delete
find server/tests -name "*.js.map" -delete
```

- [ ] **Step 3: Prevent them returning**

Append to `.gitignore` under the "Build Outputs" section:

```gitignore
# tsc output that lands beside test sources
server/tests/**/*.js
server/tests/**/*.js.map
```

- [ ] **Step 4: Verify tests still pass**

Run: `cd server && npm test`
Expected: 46 tests pass across 8 files. Vitest reads `.ts` directly, so removing the compiled copies changes nothing.

- [ ] **Step 5: Commit**

```bash
git add -A server/tests .gitignore
git commit -m "chore: untrack compiled test output from server/tests

tsc emitted these when tsconfig.json still had include: [src, tests].
That was fixed by tsconfig.build.json, but the emitted .js and .js.map
files were committed and would drift from their .ts sources.

Vitest reads TypeScript directly, so nothing depended on them."
```

---

### Task 2: Add audience claims to customer tokens

Today `Auth.ts` calls `jwtVerify(token, secret)` with no audience, so any token signed with `JWT_SECRET` is accepted as a customer session — including an admin token once Task 4 exists. This closes that before the admin token exists.

**This logs out every currently signed-in customer.** Accepted: the site went live 2026-08-27 with effectively no users.

**Files:**
- Modify: `server/src/modules/users/service.ts` (the `signToken` function)
- Modify: `client/src/libs/Auth.ts` (the `getUser` function)
- Modify: `server/src/middleware/authenticate.ts`
- Test: `server/tests/authenticate.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: customer tokens carry `aud: 'user'`; both verifiers require it

- [ ] **Step 1: Write the failing test**

Append to `server/tests/authenticate.test.ts`, inside the existing top-level `describe`:

```ts
it('rejects a token whose audience is not user', () => {
  vi.mocked(jwt.verify).mockImplementation(() => {
    throw new Error('jwt audience invalid');
  });

  const req = mockReq('Bearer admin-audience-token');
  const next = vi.fn();

  authenticate(req as Request, {} as Response, next as unknown as NextFunction);

  const err = next.mock.calls[0]?.[0] as ApiError;
  expect(err).toBeInstanceOf(ApiError);
  expect(err.status).toBe(401);
});

it('requires the user audience when verifying', () => {
  vi.mocked(jwt.verify).mockReturnValue({
    id: 'u1', email: 'a@b.c', role: 'USER', displayName: null,
  } as never);

  authenticate(mockReq('Bearer t') as Request, {} as Response, vi.fn() as unknown as NextFunction);

  expect(jwt.verify).toHaveBeenCalledWith(
    't',
    expect.any(String),
    expect.objectContaining({ audience: 'user' }),
  );
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd server && npx vitest run tests/authenticate.test.ts`
Expected: FAIL — `jwt.verify` is currently called with two arguments, so the `objectContaining` assertion fails.

- [ ] **Step 3: Sign customer tokens with the audience**

In `server/src/modules/users/service.ts`, replace `signToken`:

```ts
function signToken(user: { id: string; email: string; role: string; displayName: string | null }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
    env.JWT_SECRET,
    // aud separates customer tokens from admin ones. Both are signed with the
    // same secret and are otherwise identical in shape, so without this an
    // admin token would verify as a customer session.
    { expiresIn: env.JWT_EXPIRES_IN, audience: 'user' } as jwt.SignOptions,
  );
}
```

- [ ] **Step 4: Require it when verifying on the server**

In `server/src/middleware/authenticate.ts`, change the verify call:

```ts
    const payload = jwt.verify(token, env.JWT_SECRET, { audience: 'user' }) as {
      id: string;
      email: string;
      role: string;
      displayName: string | null;
    };
```

- [ ] **Step 5: Require it when verifying on the client**

In `client/src/libs/Auth.ts`, inside `getUser`, change the verify call:

```ts
    const { payload } = await jwtVerify(token, secret, { audience: 'user' });
```

- [ ] **Step 6: Run the tests**

Run: `cd server && npm test`
Expected: all pass, including the two new cases.

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/users/service.ts server/src/middleware/authenticate.ts client/src/libs/Auth.ts server/tests/authenticate.test.ts
git commit -m "feat: scope customer tokens to the user audience

Auth.ts verified without an audience, so any token signed with JWT_SECRET
was accepted as a customer session. Once admin tokens exist they would
have passed too.

Customer tokens now carry aud:user and both verifiers require it. This
invalidates existing sessions, which costs almost nothing today and more
with every signup."
```

---

### Task 3: `authenticateAdmin` middleware

**Files:**
- Create: `server/src/middleware/authenticateAdmin.ts`
- Modify: `server/src/types/express.d.ts`
- Test: `server/tests/admin/authenticateAdmin.test.ts`

**Interfaces:**
- Consumes: `ApiError` from `../middleware/errorHandler`, `db` from `../libs/db`
- Produces: `authenticateAdmin(req, res, next)`; sets `req.admin = { id, email, name }`

- [ ] **Step 1: Write the failing test**

Create `server/tests/admin/authenticateAdmin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}));

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

vi.mock('../../src/libs/db', () => ({
  db: { adminUser: { findUnique: vi.fn() } },
}));

import jwt from 'jsonwebtoken';
import { db } from '../../src/libs/db';
import { authenticateAdmin } from '../../src/middleware/authenticateAdmin';
import { ApiError } from '../../src/middleware/errorHandler';

function mockReq(authHeader?: string): Partial<Request> {
  return { headers: authHeader ? { authorization: authHeader } : {} };
}

describe('authenticateAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a request with no token', async () => {
    const next = vi.fn();
    await authenticateAdmin(mockReq() as Request, {} as Response, next as unknown as NextFunction);

    const err = next.mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
    expect(db.adminUser.findUnique).not.toHaveBeenCalled();
  });

  it('requires the admin audience when verifying', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 'a1', email: 'x@y.z' } as never);
    vi.mocked(db.adminUser.findUnique).mockResolvedValue({
      id: 'a1', email: 'x@y.z', name: 'Steven',
    } as never);

    await authenticateAdmin(mockReq('Bearer t') as Request, {} as Response, vi.fn() as unknown as NextFunction);

    expect(jwt.verify).toHaveBeenCalledWith(
      't',
      expect.any(String),
      expect.objectContaining({ audience: 'admin' }),
    );
  });

  it('rejects a customer token', async () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('jwt audience invalid');
    });

    const next = vi.fn();
    await authenticateAdmin(mockReq('Bearer customer-token') as Request, {} as Response, next as unknown as NextFunction);

    const err = next.mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
  });

  it('rejects a valid token whose admin no longer exists', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 'gone', email: 'x@y.z' } as never);
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(null as never);

    const next = vi.fn();
    await authenticateAdmin(mockReq('Bearer t') as Request, {} as Response, next as unknown as NextFunction);

    const err = next.mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
  });

  it('attaches the admin to the request', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 'a1', email: 'x@y.z' } as never);
    vi.mocked(db.adminUser.findUnique).mockResolvedValue({
      id: 'a1', email: 'x@y.z', name: 'Steven',
    } as never);

    const req = mockReq('Bearer t') as Request;
    await authenticateAdmin(req, {} as Response, vi.fn() as unknown as NextFunction);

    expect(req.admin).toEqual({ id: 'a1', email: 'x@y.z', name: 'Steven' });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd server && npx vitest run tests/admin/authenticateAdmin.test.ts`
Expected: FAIL — `authenticateAdmin` does not exist.

- [ ] **Step 3: Extend the Express request type**

Replace `server/src/types/express.d.ts`:

```ts
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
      displayName: string | null;
    };
    // Deliberately separate from `user`. Keeping the two on different
    // properties means no handler can mistake one identity for the other.
    admin?: {
      id: string;
      email: string;
      name: string;
    };
  }
}
```

- [ ] **Step 4: Write the middleware**

Create `server/src/middleware/authenticateAdmin.ts`:

```ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../libs/db';
import { ApiError } from './errorHandler';

/**
 * Authenticates a back-office request.
 *
 * Differs from `authenticate` in two ways. It requires `aud: 'admin'`, so a
 * customer token fails at signature verification rather than at an application
 * check. And it loads the AdminUser row rather than trusting the payload, so a
 * deleted admin cannot keep working until their token expires.
 * @param req - Incoming request; `admin` is attached on success.
 * @param _res - Unused.
 * @param next - Called with an ApiError on failure.
 * @returns Nothing; resolves once the request is authenticated or rejected.
 */
export async function authenticateAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  let payload: { id: string; email: string };
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { audience: 'admin' }) as {
      id: string;
      email: string;
    };
  } catch {
    next(new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
    return;
  }

  const admin = await db.adminUser.findUnique({ where: { id: payload.id } });
  if (!admin) {
    next(new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
    return;
  }

  req.admin = { id: admin.id, email: admin.email, name: admin.name };
  next();
}
```

- [ ] **Step 5: Run the tests**

Run: `cd server && npx vitest run tests/admin/authenticateAdmin.test.ts`
Expected: 5 passing.

- [ ] **Step 6: Commit**

```bash
git add server/src/middleware/authenticateAdmin.ts server/src/types/express.d.ts server/tests/admin/authenticateAdmin.test.ts
git commit -m "feat: add authenticateAdmin middleware

Requires aud:admin, so a customer token is rejected at signature
verification. Loads the AdminUser row rather than trusting the payload,
so a deleted admin stops working immediately rather than at expiry.

Attaches req.admin rather than req.user so no handler can confuse the
two identities."
```

---

### Task 4: Admin service — login, me, changePassword

**Files:**
- Create: `server/src/modules/admin/service.ts`
- Test: `server/tests/admin/service.test.ts`

**Interfaces:**
- Consumes: `db`, `env`, `ApiError`
- Produces:
  - `type SafeAdmin = { id: string; email: string; name: string; createdAt: Date }`
  - `login(email: string, password: string): Promise<{ token: string; admin: SafeAdmin }>`
  - `me(adminId: string): Promise<SafeAdmin>`
  - `changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `server/tests/admin/service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

vi.mock('../../src/libs/db', () => ({
  db: {
    adminUser: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../src/libs/db';
import { login, changePassword } from '../../src/modules/admin/service';
import { ApiError } from '../../src/middleware/errorHandler';

const HASH = bcrypt.hashSync('correct-horse', 10);

const ADMIN = {
  id: 'a1',
  email: 'steven@example.com',
  name: 'Steven',
  passwordHash: HASH,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('admin login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a token scoped to the admin audience', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);

    const result = await login('steven@example.com', 'correct-horse');
    const decoded = jwt.verify(result.token, 'test-secret-at-least-32-chars-long!!', {
      audience: 'admin',
    }) as { id: string };

    expect(decoded.id).toBe('a1');
    expect(result.admin).toEqual({
      id: 'a1', email: 'steven@example.com', name: 'Steven', createdAt: ADMIN.createdAt,
    });
  });

  it('omits the password hash from the returned admin', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    const result = await login('steven@example.com', 'correct-horse');
    expect(result.admin).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    await expect(login('steven@example.com', 'wrong')).rejects.toBeInstanceOf(ApiError);
  });

  it('gives the same error for an unknown email as for a wrong password', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    const wrongPassword = await login('steven@example.com', 'wrong').catch((e: ApiError) => e);

    vi.mocked(db.adminUser.findUnique).mockResolvedValue(null as never);
    const unknownEmail = await login('nobody@example.com', 'whatever').catch((e: ApiError) => e);

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.message).toBe(wrongPassword.message);
  });
});

describe('admin changePassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an incorrect current password', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    await expect(changePassword('a1', 'wrong', 'new-password-123')).rejects.toBeInstanceOf(ApiError);
    expect(db.adminUser.update).not.toHaveBeenCalled();
  });

  it('stores a hash, never the new password itself', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    vi.mocked(db.adminUser.update).mockResolvedValue(ADMIN as never);

    await changePassword('a1', 'correct-horse', 'new-password-123');

    const arg = vi.mocked(db.adminUser.update).mock.calls[0]?.[0] as {
      data: { passwordHash: string };
    };
    expect(arg.data.passwordHash).not.toBe('new-password-123');
    expect(bcrypt.compareSync('new-password-123', arg.data.passwordHash)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd server && npx vitest run tests/admin/service.test.ts`
Expected: FAIL — module `../../src/modules/admin/service` not found.

- [ ] **Step 3: Write the service**

Create `server/src/modules/admin/service.ts`:

```ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../libs/db';
import { env } from '../../config/env';
import { ApiError } from '../../middleware/errorHandler';

/** Admin sessions are deliberately shorter than the 7-day customer session. */
const ADMIN_TOKEN_EXPIRY = '8h';

export type SafeAdmin = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};

function toSafeAdmin(admin: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}): SafeAdmin {
  return { id: admin.id, email: admin.email, name: admin.name, createdAt: admin.createdAt };
}

function signAdminToken(admin: { id: string; email: string }): string {
  return jwt.sign(
    { id: admin.id, email: admin.email },
    env.JWT_SECRET,
    { expiresIn: ADMIN_TOKEN_EXPIRY, audience: 'admin' } as jwt.SignOptions,
  );
}

/**
 * Authenticates an administrator.
 *
 * Returns an identical error for an unknown email and a wrong password, so the
 * endpoint cannot be used to discover which addresses have admin accounts.
 * @param email - Administrator email address.
 * @param password - Plain-text password to check.
 * @returns A signed admin token and the administrator's safe fields.
 * @throws ApiError 401 when the credentials do not match.
 */
export async function login(
  email: string,
  password: string,
): Promise<{ token: string; admin: SafeAdmin }> {
  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return { token: signAdminToken(admin), admin: toSafeAdmin(admin) };
}

/**
 * Loads the current administrator.
 * @param adminId - Administrator id from the verified token.
 * @returns The administrator's safe fields.
 * @throws ApiError 404 when the administrator no longer exists.
 */
export async function me(adminId: string): Promise<SafeAdmin> {
  const admin = await db.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) {
    throw new ApiError(404, 'ADMIN_NOT_FOUND', 'Administrator not found');
  }
  return toSafeAdmin(admin);
}

/**
 * Changes an administrator's own password.
 * @param adminId - Administrator id from the verified token.
 * @param currentPassword - Existing password, re-checked before any write.
 * @param newPassword - Replacement password.
 * @returns Nothing; resolves once the new hash is stored.
 * @throws ApiError 401 when the current password does not match.
 */
export async function changePassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const admin = await db.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) {
    throw new ApiError(404, 'ADMIN_NOT_FOUND', 'Administrator not found');
  }

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.adminUser.update({ where: { id: adminId }, data: { passwordHash } });
}
```

- [ ] **Step 4: Run the tests**

Run: `cd server && npx vitest run tests/admin/service.test.ts`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/admin/service.ts server/tests/admin/service.test.ts
git commit -m "feat: add admin authentication service

login, me and changePassword against the AdminUser table. Tokens carry
aud:admin and expire after 8 hours rather than the customer 7 days.

login returns an identical error for an unknown email and a wrong
password, so it cannot be used to enumerate admin accounts."
```

---

### Task 5: Admin service — stats and customer lookup

**Files:**
- Modify: `server/src/modules/admin/service.ts`
- Test: `server/tests/admin/customers.test.ts`

**Interfaces:**
- Consumes: `db` from Task 4's imports
- Produces:
  - `type CustomerListItem = { id: string; email: string; displayName: string | null; firstName: string | null; lastName: string | null; createdAt: Date }`
  - `getStats(): Promise<{ totalCustomers: number; signupsLast7Days: number }>`
  - `listCustomers(options: { q?: string; page?: number; pageSize?: number }): Promise<{ results: CustomerListItem[]; page: number; pageSize: number; totalCount: number }>`

- [ ] **Step 1: Write the failing test**

Create `server/tests/admin/customers.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

vi.mock('../../src/libs/db', () => ({
  db: {
    adminUser: { findUnique: vi.fn(), update: vi.fn() },
    user: { count: vi.fn(), findMany: vi.fn() },
  },
}));

import { db } from '../../src/libs/db';
import { listCustomers, getStats } from '../../src/modules/admin/service';

describe('listCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);
    vi.mocked(db.user.count).mockResolvedValue(0 as never);
  });

  it('caps pageSize so a crafted value cannot dump the table', async () => {
    await listCustomers({ pageSize: 100000 });
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as { take: number };
    expect(args.take).toBe(100);
  });

  it('defaults to 25 per page', async () => {
    await listCustomers({});
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as { take: number };
    expect(args.take).toBe(25);
  });

  it('never selects the password hash', async () => {
    await listCustomers({});
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as {
      select: Record<string, boolean>;
    };
    expect(args.select.passwordHash).toBeUndefined();
  });

  it('filters on email and name when q is given', async () => {
    await listCustomers({ q: 'steven' });
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as {
      where: { OR?: unknown[] };
    };
    expect(args.where.OR).toHaveLength(4);
  });

  it('omits the filter entirely when q is blank', async () => {
    await listCustomers({ q: '   ' });
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as {
      where: { OR?: unknown[] };
    };
    expect(args.where.OR).toBeUndefined();
  });
});

describe('getStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the total and the last seven days', async () => {
    vi.mocked(db.user.count).mockResolvedValueOnce(42 as never).mockResolvedValueOnce(5 as never);
    const stats = await getStats();
    expect(stats).toEqual({ totalCustomers: 42, signupsLast7Days: 5 });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd server && npx vitest run tests/admin/customers.test.ts`
Expected: FAIL — `listCustomers` is not exported.

- [ ] **Step 3: Append to the service**

Add to the end of `server/src/modules/admin/service.ts`:

```ts
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export type CustomerListItem = {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
};

/** Fields safe to expose in the back office. Never includes passwordHash. */
const CUSTOMER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  firstName: true,
  lastName: true,
  createdAt: true,
} as const;

/**
 * Platform counts for the dashboard home.
 * @returns Total customers, and how many signed up in the last seven days.
 */
export async function getStats(): Promise<{
  totalCustomers: number;
  signupsLast7Days: number;
}> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const totalCustomers = await db.user.count();
  const signupsLast7Days = await db.user.count({
    where: { createdAt: { gte: sevenDaysAgo } },
  });

  return { totalCustomers, signupsLast7Days };
}

/**
 * Lists customers for the back office, newest first.
 *
 * pageSize is capped server-side so a crafted query parameter cannot pull the
 * whole table in one request.
 * @param options - Optional search term and pagination.
 * @returns One page of customers plus the total matching count.
 */
export async function listCustomers(options: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  results: CustomerListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(options.pageSize ?? DEFAULT_PAGE_SIZE)));
  const term = options.q?.trim();

  const where = term
    ? {
        OR: [
          { email: { contains: term, mode: 'insensitive' as const } },
          { firstName: { contains: term, mode: 'insensitive' as const } },
          { lastName: { contains: term, mode: 'insensitive' as const } },
          { displayName: { contains: term, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const results = await db.user.findMany({
    where,
    select: CUSTOMER_SELECT,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const totalCount = await db.user.count({ where });

  return { results, page, pageSize, totalCount };
}

/**
 * Loads one customer for the back office.
 * @param id - Customer id.
 * @returns The customer's safe fields.
 * @throws ApiError 404 when no such customer exists.
 */
export async function getCustomer(id: string): Promise<CustomerListItem> {
  const customer = await db.user.findUnique({ where: { id }, select: CUSTOMER_SELECT });
  if (!customer) {
    throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  }
  return customer;
}
```

- [ ] **Step 4: Run the tests**

Run: `cd server && npx vitest run tests/admin/`
Expected: all admin tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/admin/service.ts server/tests/admin/customers.test.ts
git commit -m "feat: add admin stats and customer lookup

Read-only customer list with case-insensitive search across email and
name fields, plus dashboard counts.

pageSize is capped at 100 server-side and the select list never includes
passwordHash, so neither a crafted parameter nor a careless caller can
expose more than intended."
```

---

### Task 6: Admin routes

**Files:**
- Create: `server/src/modules/admin/routes.ts`
- Modify: `server/src/routes/index.ts`
- Modify: `server/src/middleware/rateLimiter.ts`
- Modify: `server/src/config/constants.ts`
- Test: `server/tests/admin/routes.test.ts`

**Interfaces:**
- Consumes: `login`, `me`, `changePassword`, `getStats`, `listCustomers`, `getCustomer` from Task 4/5; `authenticateAdmin` from Task 3
- Produces: routes mounted at `/api/admin`

- [ ] **Step 1: Write the failing test**

Create `server/tests/admin/routes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/modules/admin/service', () => ({
  login: vi.fn(),
  me: vi.fn(),
  changePassword: vi.fn(),
  getStats: vi.fn(),
  listCustomers: vi.fn(),
  getCustomer: vi.fn(),
}));

import app from '../../src/app';
import * as adminService from '../../src/modules/admin/service';

describe('Admin routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 for customers without a token', async () => {
    const res = await request(app).get('/api/admin/customers');
    expect(res.status).toBe(401);
    expect(adminService.listCustomers).not.toHaveBeenCalled();
  });

  it('returns 401 for stats without a token', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('returns 422 when login is missing a password', async () => {
    const res = await request(app).post('/api/admin/login').send({ email: 'a@b.c' });
    expect(res.status).toBe(422);
    expect(adminService.login).not.toHaveBeenCalled();
  });

  it('returns the token on a successful login', async () => {
    vi.mocked(adminService.login).mockResolvedValueOnce({
      token: 'tok',
      admin: { id: 'a1', email: 'a@b.c', name: 'Steven', createdAt: new Date() },
    });

    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: 'a@b.c', password: 'correct-horse' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('tok');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd server && npx vitest run tests/admin/routes.test.ts`
Expected: FAIL — routes return 404, not 401/422.

- [ ] **Step 3: Add the login rate limit constants**

Append to `server/src/config/constants.ts`:

```ts
// The admin login endpoint is the only publicly reachable back-office surface,
// so it gets a tighter limit than the catalog.
export const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const ADMIN_LOGIN_MAX_ATTEMPTS = 10;
```

- [ ] **Step 4: Add the limiter**

Append to `server/src/middleware/rateLimiter.ts`:

```ts
import { ADMIN_LOGIN_WINDOW_MS, ADMIN_LOGIN_MAX_ATTEMPTS } from '../config/constants';

export const adminLoginRateLimiter = rateLimit({
  windowMs: ADMIN_LOGIN_WINDOW_MS,
  limit: ADMIN_LOGIN_MAX_ATTEMPTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts, please try again later',
        status: 429,
      },
    });
  },
});
```

Move the new `import` to sit with the existing imports at the top of the file.

- [ ] **Step 5: Write the routes**

Create `server/src/modules/admin/routes.ts`:

```ts
import { Router } from 'express';
import { z } from 'zod';
import { authenticateAdmin } from '../../middleware/authenticateAdmin';
import { adminLoginRateLimiter } from '../../middleware/rateLimiter';
import { ApiError } from '../../middleware/errorHandler';
import {
  login,
  me,
  changePassword,
  getStats,
  listCustomers,
  getCustomer,
} from './service';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

router.post('/login', adminLoginRateLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
    }
    const result = await login(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticateAdmin, async (req, res, next) => {
  try {
    res.json(await me(req.admin!.id));
  } catch (err) {
    next(err);
  }
});

router.put('/password', authenticateAdmin, async (req, res, next) => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
    }
    await changePassword(req.admin!.id, parsed.data.currentPassword, parsed.data.newPassword);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', authenticateAdmin, async (_req, res, next) => {
  try {
    res.json(await getStats());
  } catch (err) {
    next(err);
  }
});

router.get('/customers', authenticateAdmin, async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const page = Number(req.query.page) || undefined;
    const pageSize = Number(req.query.pageSize) || undefined;
    res.json(await listCustomers({ q, page, pageSize }));
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id', authenticateAdmin, async (req, res, next) => {
  try {
    res.json(await getCustomer(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 6: Mount the router**

In `server/src/routes/index.ts`, add the import beside the others and the mount below the existing ones:

```ts
import adminRouter from '../modules/admin/routes';
```

```ts
router.use('/api/admin', adminRouter);
```

- [ ] **Step 7: Run the whole suite**

Run: `cd server && npm test`
Expected: all pass, including the 4 new route tests.

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/admin/routes.ts server/src/routes/index.ts server/src/middleware/rateLimiter.ts server/src/config/constants.ts server/tests/admin/routes.test.ts
git commit -m "feat: expose admin endpoints under /api/admin

Six routes: login, me, password, stats, customers, customer detail.
Everything except login sits behind authenticateAdmin.

login gets its own rate limiter at 10 attempts per 15 minutes. It is the
only publicly reachable back-office surface and the obvious target."
```

---

### Task 7: `admin:create` CLI

There is deliberately no public admin signup: a permanently reachable endpoint that mints administrators is an open door regardless of what guards it. The first account is created over SSH instead.

**Files:**
- Create: `server/scripts/create-admin.ts`
- Modify: `server/package.json`

**Interfaces:**
- Consumes: `db` from `../src/libs/db`
- Produces: `npm run admin:create -- --email <email> --name <name>`

- [ ] **Step 1: Write the script**

Create `server/scripts/create-admin.ts`:

```ts
/**
 * Creates the first administrator.
 *
 * Run over SSH on the server:
 *   npm run admin:create -- --email steven@example.com --name "Steven Imes III"
 *
 * The password is prompted rather than passed as an argument so it does not
 * land in shell history or the process list.
 */
import { createInterface } from 'node:readline';
import { stdin, stdout, argv, exit } from 'node:process';
import bcrypt from 'bcryptjs';
import { db } from '../src/libs/db';

function arg(flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  const email = arg('--email');
  const name = arg('--name');

  if (!email || !name) {
    console.error('Usage: npm run admin:create -- --email <email> --name "<name>"');
    exit(1);
  }

  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.error(`An administrator already exists for ${email}. Refusing to overwrite.`);
    exit(1);
  }

  const password = await prompt('Password (min 8 characters): ');
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    exit(1);
  }

  const confirm = await prompt('Confirm password: ');
  if (confirm !== password) {
    console.error('Passwords do not match.');
    exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await db.adminUser.create({ data: { email, name, passwordHash } });

  console.log(`Created administrator ${admin.email} (${admin.id})`);
  await db.$disconnect();
}

main().catch(async (err: unknown) => {
  console.error(err);
  await db.$disconnect();
  exit(1);
});
```

- [ ] **Step 2: Add the script entry**

In `server/package.json`, add to `scripts`:

```json
    "admin:create": "tsx --env-file=.env scripts/create-admin.ts",
```

- [ ] **Step 3: Verify it refuses bad input**

Run: `cd server && npm run admin:create`
Expected: prints the usage line and exits 1 without touching the database.

- [ ] **Step 4: Commit**

```bash
git add server/scripts/create-admin.ts server/package.json
git commit -m "feat: add admin:create CLI

Creates the first administrator over SSH rather than through a public
signup endpoint, which would be a permanently reachable way to mint
admins.

Prompts for the password rather than taking it as an argument, so it does
not land in shell history or the process list. Refuses to overwrite an
existing email."
```

---

### Task 8: `AdminAuth.ts` — client session helper

**Files:**
- Create: `client/src/libs/AdminAuth.ts`

**Interfaces:**
- Consumes: `Env` from `@/libs/Env`
- Produces:
  - `type AdminSession = { id: string; email: string; name: string }`
  - `getAdminToken(): Promise<string | undefined>`
  - `setAdminSession(token: string): Promise<void>`
  - `deleteAdminSession(): Promise<void>`
  - `getAdmin(): Promise<AdminSession | null>`

- [ ] **Step 1: Write the helper**

Create `client/src/libs/AdminAuth.ts`:

```ts
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Env } from '@/libs/Env';

export type AdminSession = {
  id: string;
  email: string;
  name: string;
};

/** Separate from the customer `auth_token` so the two sessions cannot collide. */
const ADMIN_COOKIE_NAME = 'admin_token';

/** Matches ADMIN_TOKEN_EXPIRY in the server's admin service. */
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;

async function getJwtSecret(): Promise<Uint8Array> {
  return new TextEncoder().encode(Env.JWT_SECRET);
}

/**
 * Reads the raw admin token, for forwarding to Express as a Bearer header.
 * @returns The token, or undefined when there is no admin session.
 */
export async function getAdminToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value;
}

/**
 * Stores the admin session cookie.
 * @param token - Admin JWT returned by the backend.
 * @returns Nothing; resolves once the cookie is set.
 */
export async function setAdminSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: Env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

/**
 * Clears the admin session cookie.
 * @returns Nothing; resolves once the cookie is removed.
 */
export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

/**
 * Verifies the admin token and returns the session.
 *
 * Requires `aud: 'admin'`, so a customer token fails verification here rather
 * than being accepted and rejected later by a role check.
 * @returns The admin session, or null when absent or invalid.
 */
export async function getAdmin(): Promise<AdminSession | null> {
  const token = await getAdminToken();
  if (!token) {
    return null;
  }

  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret, { audience: 'admin' });
    const { id, email } = payload as { id: string; email: string };
    return { id, email, name: (payload as { name?: string }).name ?? email };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd client && npm run check:types`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/libs/AdminAuth.ts
git commit -m "feat: add admin session helper

Mirrors Auth.ts but uses the admin_token cookie, an 8-hour max age, and
requires aud:admin when verifying. A customer token fails here rather
than being accepted and caught later by a role check."
```

---

### Task 9: BFF routes for admin

**Files:**
- Create: `client/src/app/api/admin/login/route.ts`
- Create: `client/src/app/api/admin/logout/route.ts`
- Create: `client/src/app/api/admin/password/route.ts`

**Interfaces:**
- Consumes: `setAdminSession`, `deleteAdminSession`, `getAdminToken` from Task 8; `Env.BACKEND_API_URL`
- Produces: `POST /api/admin/login`, `POST /api/admin/logout`, `PUT /api/admin/password`

Stats and customer reads are fetched server-side by the pages in Tasks 10 and 11, so they need no BFF route.

- [ ] **Step 1: Write the login route**

Create `client/src/app/api/admin/login/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { setAdminSession } from '@/libs/AdminAuth';
import { Env } from '@/libs/Env';

export async function POST(request: Request) {
  const body: unknown = await request.json();

  const backendRes = await fetch(`${Env.BACKEND_API_URL}/api/admin/login`, {
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
  await setAdminSession(token);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Write the logout route**

Create `client/src/app/api/admin/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { deleteAdminSession } from '@/libs/AdminAuth';

export async function POST() {
  await deleteAdminSession();
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Write the password route**

Create `client/src/app/api/admin/password/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getAdminToken } from '@/libs/AdminAuth';
import { Env } from '@/libs/Env';

export async function PUT(request: Request) {
  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body: unknown = await request.json();

  const backendRes = await fetch(`${Env.BACKEND_API_URL}/api/admin/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data: unknown = await backendRes.json();

  if (!backendRes.ok) {
    const err = data as { error?: { message?: string } };
    return NextResponse.json(
      { error: err.error?.message ?? 'Could not change password' },
      { status: backendRes.status },
    );
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Typecheck**

Run: `cd client && npm run check:types`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/app/api/admin
git commit -m "feat: add admin BFF routes

login, logout and password forward to Express and manage the admin_token
cookie. Stats and customer reads are fetched server-side by the pages, so
they need no route here.

Keeps the same Backend-for-Frontend path as customer auth, so Express
stays off the public internet."
```

---

### Task 10: Admin login page and protected layout

**Files:**
- Create: `client/src/app/admin/layout.tsx`
- Create: `client/src/app/admin/login/page.tsx`
- Create: `client/src/app/admin/login/LoginForm.tsx`

**Interfaces:**
- Consumes: `getAdmin` from Task 8; `POST /api/admin/login` from Task 9
- Produces: a protected `/admin` shell; `/admin/login` reachable without a session

- [ ] **Step 1: Write the login form**

Create `client/src/app/admin/login/LoginForm.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Email and password form for the back office.
 * @returns The sign-in form.
 */
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    });

    if (res.ok) {
      router.replace('/admin');
      router.refresh();
      return;
    }

    const data = (await res.json()) as { error?: string };
    setError(data.error ?? 'Sign in failed');
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-[13px] text-[#a1a1a1]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#ea2a43]"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-[13px] text-[#a1a1a1]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#ea2a43]"
        />
      </div>

      {error !== null && (
        <p role="alert" className="text-[13px] text-[#ea2a43]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#ea2a43] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write the login page**

Create `client/src/app/admin/login/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdmin } from '@/libs/AdminAuth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-[#2a2a2a] bg-[#161616] p-8">
        <h1 className="mb-1 text-[22px] font-bold text-white">Ticket Love admin</h1>
        <p className="mb-6 text-[13px] text-[#a1a1a1]">Sign in to the back office.</p>
        <LoginForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the protected layout**

Create `client/src/app/admin/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAdmin } from '@/libs/AdminAuth';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Ticket Love admin' },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/account', label: 'Account' },
];

export default async function AdminLayout(props: { children: React.ReactNode }) {
  // The login page renders inside this layout but must stay reachable without
  // a session, so it is excluded rather than guarded.
  const pathname = (await headers()).get('x-pathname') ?? '';
  if (pathname.startsWith('/admin/login')) {
    return props.children;
  }

  const admin = await getAdmin();
  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <aside className="w-56 shrink-0 border-r border-[#2a2a2a] p-6">
        <p className="mb-6 text-[15px] font-bold text-white">Ticket Love admin</p>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-[14px] text-[#a1a1a1] transition-colors hover:bg-[#1a1a1a] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#2a2a2a] px-8 py-4">
          <span className="text-[13px] text-[#a1a1a1]">{admin.email}</span>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="text-[13px] text-[#a1a1a1] transition-colors hover:text-white"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="p-8">{props.children}</main>
      </div>
    </div>
  );
}
```

> **Note for the implementer:** `x-pathname` is not set by default. If the login page redirects in a loop, move `login/` out of this layout by creating `client/src/app/admin/login/layout.tsx` that returns `props.children` unchanged — a nested layout overrides the parent's shell for that segment. Verify in step 5 before moving on.

- [ ] **Step 4: Typecheck**

Run: `cd client && npm run check:types`
Expected: no errors.

- [ ] **Step 5: Verify the guard by hand**

Run: `npm run dev` from the repo root, then:

1. Visit `http://localhost:3000/admin` while signed out — expect a redirect to `/admin/login`.
2. Confirm `/admin/login` renders the form and does **not** redirect in a loop. If it loops, apply the note in step 3.

- [ ] **Step 6: Commit**

```bash
git add client/src/app/admin
git commit -m "feat: add admin login page and protected shell

The layout redirects to /admin/login when there is no valid admin
session, so every page below it is guarded by default rather than each
page remembering to check.

Admin pages are noindex and sit outside [locale] — English only, since
this is one person's back office."
```

---

### Task 11: Dashboard, customers and account pages

**Files:**
- Create: `client/src/app/admin/page.tsx`
- Create: `client/src/app/admin/customers/page.tsx`
- Create: `client/src/app/admin/account/page.tsx`
- Create: `client/src/app/admin/account/PasswordForm.tsx`

**Interfaces:**
- Consumes: `getAdminToken` from Task 8; `/api/admin/stats`, `/api/admin/customers` from Task 6; `PUT /api/admin/password` from Task 9
- Produces: the three back-office screens

- [ ] **Step 1: Write the dashboard home**

Create `client/src/app/admin/page.tsx`:

```tsx
import { getAdminToken } from '@/libs/AdminAuth';
import { Env } from '@/libs/Env';

type Stats = {
  totalCustomers: number;
  signupsLast7Days: number;
};

async function fetchStats(): Promise<Stats> {
  const token = await getAdminToken();
  const res = await fetch(`${Env.BACKEND_API_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { totalCustomers: 0, signupsLast7Days: 0 };
  }
  return (await res.json()) as Stats;
}

export default async function AdminDashboardPage() {
  const stats = await fetchStats();

  const tiles = [
    { label: 'Total customers', value: stats.totalCustomers },
    { label: 'Signups this week', value: stats.signupsLast7Days },
  ];

  return (
    <div>
      <h1 className="mb-6 text-[24px] font-bold text-white">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-[#2a2a2a] bg-[#161616] p-6"
          >
            <p className="mb-1 text-[13px] text-[#a1a1a1]">{tile.label}</p>
            <p className="text-[28px] font-bold text-white">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] p-6">
        <h2 className="mb-1 text-[15px] font-semibold text-white">Sales reporting</h2>
        <p className="mb-4 text-[13px] text-[#a1a1a1]">
          Orders, commission and payouts are held by TicketNetwork, who process
          every sale. Their portal is the source of truth for revenue.
        </p>
        <a
          href="https://www.ticketnetwork.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-[#ea2a43] px-4 py-2 text-[14px] font-semibold text-white"
        >
          Open TicketNetwork Portal
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the customers page**

Create `client/src/app/admin/customers/page.tsx`:

```tsx
import { getAdminToken } from '@/libs/AdminAuth';
import { Env } from '@/libs/Env';

type CustomerListItem = {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

type CustomerPage = {
  results: CustomerListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

async function fetchCustomers(q: string): Promise<CustomerPage> {
  const token = await getAdminToken();
  const url = new URL(`${Env.BACKEND_API_URL}/api/admin/customers`);
  if (q) {
    url.searchParams.set('q', q);
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { results: [], page: 1, pageSize: 25, totalCount: 0 };
  }
  return (await res.json()) as CustomerPage;
}

function displayName(customer: CustomerListItem): string {
  const full = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  return customer.displayName ?? (full || '—');
}

export default async function AdminCustomersPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await props.searchParams;
  const term = q ?? '';
  const data = await fetchCustomers(term);

  return (
    <div>
      <h1 className="mb-6 text-[24px] font-bold text-white">Customers</h1>

      {/* GET form so the search term lives in the URL and the page stays a
          server component — no client state needed. */}
      <form method="get" className="mb-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Search by email or name"
          aria-label="Search customers"
          className="w-full max-w-[380px] rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#ea2a43]"
        />
        <button
          type="submit"
          className="rounded-lg bg-[#ea2a43] px-4 py-2.5 text-[14px] font-semibold text-white"
        >
          Search
        </button>
      </form>

      <p className="mb-3 text-[13px] text-[#a1a1a1]">
        {data.totalCount} {data.totalCount === 1 ? 'customer' : 'customers'}
      </p>

      <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-[#161616] text-[13px] text-[#a1a1a1]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((customer) => (
              <tr key={customer.id} className="border-t border-[#2a2a2a] text-white">
                <td className="px-4 py-3">{displayName(customer)}</td>
                <td className="px-4 py-3 text-[#c9c9c9]">{customer.email}</td>
                <td className="px-4 py-3 text-[#a1a1a1]">
                  {new Date(customer.createdAt).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {data.results.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#a1a1a1]">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the password form**

Create `client/src/app/admin/account/PasswordForm.tsx`:

```tsx
'use client';

import { useState } from 'react';

const FIELD_CLASS
  = 'w-full max-w-[380px] rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#ea2a43]';

/**
 * Lets an administrator change their own password.
 * @returns The change-password form.
 */
export function PasswordForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const res = await fetch('/api/admin/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: data.get('currentPassword'),
        newPassword: data.get('newPassword'),
      }),
    });

    if (res.ok) {
      form.reset();
      setMessage({ ok: true, text: 'Password changed.' });
    } else {
      const body = (await res.json()) as { error?: string };
      setMessage({ ok: false, text: body.error ?? 'Could not change password' });
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-[13px] text-[#a1a1a1]">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1 block text-[13px] text-[#a1a1a1]">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={FIELD_CLASS}
        />
      </div>

      {message !== null && (
        <p
          role="status"
          className={message.ok ? 'text-[13px] text-green-400' : 'text-[13px] text-[#ea2a43]'}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#ea2a43] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Write the account page**

Create `client/src/app/admin/account/page.tsx`:

```tsx
import { getAdmin } from '@/libs/AdminAuth';
import { PasswordForm } from './PasswordForm';

export default async function AdminAccountPage() {
  const admin = await getAdmin();

  return (
    <div>
      <h1 className="mb-6 text-[24px] font-bold text-white">Account</h1>

      <div className="mb-8 rounded-xl border border-[#2a2a2a] bg-[#161616] p-6">
        <p className="mb-1 text-[13px] text-[#a1a1a1]">Signed in as</p>
        <p className="text-[15px] text-white">{admin?.email}</p>
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-white">Change password</h2>
        <PasswordForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `cd client && npm run check:types`
Expected: no errors.

Run: `cd client && npx oxlint src/app/admin src/libs/AdminAuth.ts`
Expected: no errors. Fix any that appear.

- [ ] **Step 6: Verify by hand**

With `npm run dev` running and an admin created via Task 7:

1. Sign in at `/admin/login` — expect a redirect to `/admin`.
2. `/admin` shows both stat tiles and the TN Portal link.
3. `/admin/customers` lists customers; searching updates the URL to `?q=…` and filters.
4. `/admin/account` changes the password; signing out and back in with the new one works.
5. Sign out, then visit `/admin/customers` directly — expect a redirect to `/admin/login`.

- [ ] **Step 7: Commit**

```bash
git add client/src/app/admin
git commit -m "feat: add admin dashboard, customers and account pages

Dashboard shows customer counts and links out to TicketNetwork Portal,
which holds orders and commission — an embed is not possible, since TN
sends X-Frame-Options: SAMEORIGIN.

Customer search is a GET form so the term lives in the URL and the page
stays a server component. The list is read-only: editing or deleting
needs an audit trail, which is out of scope for this phase."
```

---

## Verification

After Task 11, run the full suite from the repo root:

```bash
cd server && npm test && npm run build
cd ../client && npm run check:types
```

Expected: server tests all pass including the new `tests/admin/` files, `dist/server.js` is emitted, and the client typechecks.

Then create the production admin over SSH:

```bash
ssh deploy@31.220.54.150
cd /opt/ticketlove
docker compose exec api npm run admin:create -- --email steven@example.com --name "Steven Imes III"
```

> **If that fails:** the runtime image is built with `npm ci --omit=dev` and contains `dist/`, not `scripts/`. In that case run the script against the production database from a machine that has the repo, with `DATABASE_URL` pointed at the server through an SSH tunnel. Confirm which applies before promising Steven a login.

---

## Deviations from the spec

Recorded so the difference is deliberate rather than an oversight.

**Three BFF routes, not six.** The spec lists `login`, `logout`, `me`, `password`, `stats` and `customers` under `client/src/app/api/admin/`. The plan creates only the three that a browser actually posts to.

`me`, `stats` and `customers` are reads performed by server components, which call Express directly with the token from `getAdminToken()`. Routing those through a Next.js handler would add a network hop and three files without changing what the user sees or what Express is exposed to — the BFF boundary is preserved either way, since the fetch still happens on the server.

If a client component ever needs to re-fetch stats or customers without a full navigation, add the route then.

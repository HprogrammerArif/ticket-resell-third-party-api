---
name: add-api-route
description: Create a new Next.js API route handler with Zod validation, proper error handling, and auth token forwarding.
---

# Add API Route Skill

Use this skill when creating a new API route handler in the Next.js App Router.

## File Location

API routes live under `src/app/api/`. Follow RESTful naming:

```
src/app/api/
  auth/
    sign-in/route.ts
    sign-up/route.ts
    sign-out/route.ts
  users/route.ts            # GET (list), POST (create)
  users/[id]/route.ts       # GET (detail), PUT (update), DELETE
```

## Route Handler Template

```ts
import { NextResponse } from 'next/server';
import * as z from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

/**
 * Creates a new user.
 * @param request - The incoming request.
 * @returns The created user or a validation error.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json();
  const result = CreateUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 },
    );
  }

  // Business logic here...

  return NextResponse.json({ id: '1', ...result.data }, { status: 201 });
}
```

## Route with Dynamic Params

```ts
/**
 * Gets a user by ID.
 * @param _request - The incoming request (unused).
 * @param context - Route context containing dynamic params.
 * @returns The user data or a 404 error.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // Fetch user by id...

  return NextResponse.json({ id, name: 'Example' });
}
```

## Rules

- **Always validate** incoming data with Zod (`safeParse`, not `parse`).
- **Never expose** internal server errors to the client.
- **Use proper HTTP status codes**: 200, 201, 400, 401, 403, 404, 500.
- `params` are **async** in Next.js 16 — always `await context.params`.
- Named exports per HTTP method: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.
- No default exports in route handlers.

## Calling External APIs (Mode 2)

When the route proxies to an external backend, use `ApiClient`:

```ts
import { ApiClient } from '@/libs/ApiClient';

export async function GET() {
  const data = await ApiClient.get('/external-endpoint');
  return NextResponse.json(data);
}
```

## Using Database (Mode 3)

When using the built-in database with Drizzle ORM:

```ts
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { usersTable } from '@/models/Schema';

export async function GET() {
  const users = await db.select().from(usersTable);
  return NextResponse.json(users);
}
```

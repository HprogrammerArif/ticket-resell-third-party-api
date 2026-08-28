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

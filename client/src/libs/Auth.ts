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
    const { payload } = await jwtVerify(token, secret, { audience: 'user' });
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

import { cookies } from 'next/headers';
import { Env } from '@/libs/Env';

export type UserSession = {
  email: string;
  id: string;
  role?: string;
};

const SESSION_COOKIE_NAME = 'auth_token';

/**
 * Decodes the payload of a JWT token without verifying the signature.
 * @param token The JWT token string.
 * @returns The decoded user session, or null if invalid.
 */
function decodeJwt(token: string): UserSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const [, payloadPart] = parts;
    if (!payloadPart) {
      return null;
    }
    const base64 = payloadPart.replaceAll('-', '+').replaceAll('_', '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    const rawPayload: unknown = JSON.parse(jsonPayload);
    return rawPayload as UserSession;
  } catch {
    return null;
  }
}

/**
 * Generates a mock JWT token with user info for demonstration/development purposes.
 * @param email The user's email address.
 * @returns The mock JWT token string.
 */
export function generateMockJwt(email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      email,
      id: `usr_${Math.random().toString(36).slice(2, 11)}`,
      role: 'user',
    }),
  ).toString('base64url');
  return `${header}.${payload}.mock_signature`;
}

/**
 * Gets the active user session from the cookies.
 * @returns The session token, or undefined if no session is active.
 */
async function getSession(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Sets the active session token in cookies.
 * @param token The session token to set.
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
 * Deletes the active session token.
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Decodes and returns the current user info.
 * @returns The active user session, or null if no user is authenticated.
 */
export async function getUser(): Promise<UserSession | null> {
  const token = await getSession();
  if (!token) {
    return null;
  }
  return decodeJwt(token);
}

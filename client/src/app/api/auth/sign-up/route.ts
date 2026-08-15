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

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

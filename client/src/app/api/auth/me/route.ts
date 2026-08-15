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

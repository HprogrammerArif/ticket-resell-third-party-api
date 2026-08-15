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

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

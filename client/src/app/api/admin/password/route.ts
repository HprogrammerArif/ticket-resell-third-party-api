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

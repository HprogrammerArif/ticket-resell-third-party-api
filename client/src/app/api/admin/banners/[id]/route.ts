import { NextResponse } from 'next/server';
import { getAdminToken } from '@/libs/AdminAuth';
import { Env } from '@/libs/Env';

const base = () => Env.BACKEND_API_URL ?? 'http://localhost:8000';

/**
 * Updates a banner's title, link, order or visibility.
 * @param request - The request carrying the changed fields.
 * @param context - Route parameters carrying the banner id.
 * @returns The updated banner, or the upstream's error.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await context.params;
  const upstream = await fetch(`${base()}/api/banners/admin/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(await request.json()),
  });

  return NextResponse.json(await upstream.json(), { status: upstream.status });
}

/**
 * Removes a banner and its file.
 * @param _request - Unused.
 * @param context - Route parameters carrying the banner id.
 * @returns An empty response, or the upstream's error.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await context.params;
  const upstream = await fetch(`${base()}/api/banners/admin/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  return new NextResponse(null, { status: upstream.status });
}

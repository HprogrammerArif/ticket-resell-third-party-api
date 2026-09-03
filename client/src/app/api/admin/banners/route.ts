import { NextResponse } from 'next/server';
import { getAdminToken } from '@/libs/AdminAuth';
import { Env } from '@/libs/Env';

const base = () => Env.BACKEND_API_URL ?? 'http://localhost:8000';

/**
 * Lists every banner, including inactive ones, for the admin screen.
 * @returns The banners, or the upstream's error.
 */
export async function GET() {
  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const upstream = await fetch(`${base()}/api/banners/admin`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  return NextResponse.json(await upstream.json(), { status: upstream.status });
}

/**
 * Uploads a banner.
 *
 * The multipart body is streamed through untouched — re-encoding it here would
 * mean holding the whole file in this process for no benefit, and the API is
 * where the bytes are validated.
 * @param request - The multipart form request.
 * @returns The created banner, or the upstream's error.
 */
export async function POST(request: Request) {
  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const upstream = await fetch(`${base()}/api/banners/admin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: await request.formData(),
  });

  return NextResponse.json(await upstream.json(), { status: upstream.status });
}

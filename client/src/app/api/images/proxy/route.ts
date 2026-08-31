import { NextResponse } from 'next/server';

/**
 * Required by Wikimedia. Fetching an image file without a descriptive
 * User-Agent carrying contact details returns 403; with a generic browser one
 * it returns 429. next/image fetches remote files with its own agent, which
 * Wikimedia rejects, so image bytes are proxied through here instead.
 */
const USER_AGENT = 'TicketLove/1.0 (https://ticketlove.net; work.mohammedarif@gmail.com)';

/** The only host this proxy will fetch. Without it this is an open proxy. */
const ALLOWED_HOST = 'upload.wikimedia.org';

const CACHE_SECONDS = 7 * 24 * 60 * 60;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'url is not valid' }, { status: 400 });
  }

  // Allowlist the host and scheme. A proxy that fetches arbitrary URLs on
  // request is a server-side request forgery hole — it would let a caller reach
  // internal services this server can see and the caller cannot.
  if (target.protocol !== 'https:' || target.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: 'host is not allowed' }, { status: 400 });
  }

  const upstream = await fetch(target, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': `public, max-age=${CACHE_SECONDS}, immutable`,
    },
  });
}

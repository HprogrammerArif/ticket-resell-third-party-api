import { Env } from '@/libs/Env';

/**
 * Streams a banner image from the API container.
 *
 * next/image needs a URL it can fetch and Express is not publicly reachable,
 * so the bytes come through here. The upstream's immutable cache header is
 * passed through rather than re-derived — the filename is a UUID, so the bytes
 * behind it never change.
 * @param _request - Unused; the filename comes from the route parameters.
 * @param context - Route parameters carrying the stored filename.
 * @returns The image bytes, or the upstream's status when it refuses.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const base = Env.BACKEND_API_URL ?? 'http://localhost:8000';

  const upstream = await fetch(`${base}/api/banners/file/${encodeURIComponent(filename)}`);

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control':
        upstream.headers.get('cache-control') ?? 'public, max-age=31536000, immutable',
    },
  });
}

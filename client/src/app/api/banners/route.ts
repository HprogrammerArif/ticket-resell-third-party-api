import { NextResponse } from 'next/server';
import { ApiClient } from '@/libs/ApiClient';

/**
 * The homepage's banners.
 *
 * Goes through the BFF like every other read: Express is not on the public
 * internet, so the browser cannot reach it directly.
 * @returns The active banners, or an empty list when the API is unreachable.
 */
export async function GET() {
  try {
    const data = await ApiClient.get<{ results: unknown[] }>('/api/banners', { params: {} });
    return NextResponse.json(data);
  } catch {
    // The banner strip sits above the fold. A failure here must not leave a
    // blank screen at the top of the homepage.
    return NextResponse.json({ results: [] });
  }
}

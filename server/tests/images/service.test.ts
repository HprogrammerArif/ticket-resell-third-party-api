import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

import { getPerformerImage, categoryHint } from '../../src/modules/images/service';
import { clearCache } from '../../src/libs/cache';

const SUMMARY_WITH_IMAGE = {
  type: 'standard',
  title: '3 Doors Down',
  originalimage: { source: 'https://upload.wikimedia.org/a.jpg', width: 800, height: 600 },
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/3_Doors_Down' } },
};

const SUMMARY_DISAMBIGUATION = {
  type: 'disambiguation',
  title: 'AFI',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/AFI' } },
};

const SUMMARY_NO_IMAGE = {
  type: 'standard',
  title: 'Abra Moore',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Abra_Moore' } },
};

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

describe('categoryHint', () => {
  it('maps concerts to band', () => {
    expect(categoryHint('Concerts / Rock')).toBe('band');
  });

  it('maps theatre to musical', () => {
    expect(categoryHint('Theatre')).toBe('musical');
  });

  it('maps sports to team', () => {
    expect(categoryHint('Sports / NBA')).toBe('team');
  });

  it('falls back to performer for anything else', () => {
    expect(categoryHint(undefined)).toBe('performer');
    expect(categoryHint('Miscellaneous')).toBe('performer');
  });
});

describe('getPerformerImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearCache();
  });

  it('returns the image from a direct article hit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(SUMMARY_WITH_IMAGE)));

    const result = await getPerformerImage('3 Doors Down', 'Concerts');

    expect(result).toEqual({
      url: 'https://upload.wikimedia.org/a.jpg',
      width: 800,
      height: 600,
      sourcePage: 'https://en.wikipedia.org/wiki/3_Doors_Down',
      title: '3 Doors Down',
    });
  });

  it('sends the required User-Agent on every request', async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse(SUMMARY_WITH_IMAGE));
    vi.stubGlobal('fetch', spy);

    await getPerformerImage('3 Doors Down', 'Concerts');

    const init = spy.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers['User-Agent']).toContain('TicketLove/1.0');
    expect(init.headers['User-Agent']).toContain('work.mohammedarif@gmail.com');
  });

  it('falls through to search when the direct lookup is a disambiguation page', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_DISAMBIGUATION))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [{ title: 'AFI (band)' }] } }))
      .mockResolvedValueOnce(jsonResponse({ ...SUMMARY_WITH_IMAGE, title: 'AFI (band)' }));
    vi.stubGlobal('fetch', spy);

    const result = await getPerformerImage('AFI', 'Concerts');

    expect(result?.title).toBe('AFI (band)');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('includes the category hint in the search query', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_DISAMBIGUATION))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } }));
    vi.stubGlobal('fetch', spy);

    await getPerformerImage('AFI', 'Concerts');

    // Parse rather than string-match: URLSearchParams encodes the space as '+',
    // which decodeURIComponent does not turn back into a space.
    const searchUrl = new URL(String(spy.mock.calls[1]?.[0]));
    expect(searchUrl.searchParams.get('srsearch')).toBe('AFI band');
  });

  it('returns null when the article has no image', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_NO_IMAGE))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } })));

    expect(await getPerformerImage('Abra Moore', 'Concerts')).toBeNull();
  });

  it('returns null rather than throwing when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(getPerformerImage('Anyone', 'Concerts')).resolves.toBeNull();
  });

  it('returns null rather than throwing when the request times out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' }),
    ));

    await expect(getPerformerImage('Anyone', 'Concerts')).resolves.toBeNull();
  });

  it('caches a miss so it is not re-queried on every call', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_NO_IMAGE))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } }));
    vi.stubGlobal('fetch', spy);

    await getPerformerImage('Abra Moore', 'Concerts');
    const callsAfterFirst = spy.mock.calls.length;
    await getPerformerImage('Abra Moore', 'Concerts');

    expect(spy.mock.calls.length).toBe(callsAfterFirst);
  });
});

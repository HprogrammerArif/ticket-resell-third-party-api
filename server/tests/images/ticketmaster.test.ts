import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above ordinary declarations, so the object it returns has
// to be created by vi.hoisted or it is not initialised when the mock runs.
const mockEnv = vi.hoisted(() => ({ TICKETMASTER_API_KEY: 'test-key' as string | undefined }));
vi.mock('../../src/config/env', () => ({ env: mockEnv }));

import { getTicketmasterImage } from '../../src/modules/images/ticketmaster';

function image(ratio: string, width: number, height: number, fallback = false) {
  return { url: `https://s1.ticketm.net/${ratio}-${width}.jpg`, ratio, width, height, fallback };
}

function attraction(name: string, images: unknown[], aliases?: string[]) {
  return { id: 'K1', name, images, ...(aliases ? { aliases } : {}) };
}

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function withAttractions(...atts: unknown[]): Response {
  return jsonResponse({ _embedded: { attractions: atts } });
}

describe('getTicketmasterImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockEnv.TICKETMASTER_API_KEY = 'test-key';
  });

  it('resolves an attraction to its 16_9 image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(withAttractions(
      attraction('Aerosmith', [image('4_3', 305, 225), image('16_9', 640, 360)]),
    )));

    const result = await getTicketmasterImage('Aerosmith');

    expect(result).toMatchObject({ url: expect.stringContaining('16_9'), width: 640, height: 360 });
  });

  it('rejects an image marked as a fallback', async () => {
    // Ticketmaster serves a generic house graphic when it has no real
    // photograph. Measured live: a tribute act carried ten images and every
    // one was flagged. Showing that would replace our own category gradient
    // with someone else's placeholder.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(withAttractions(
      attraction('Aerosmith', [image('16_9', 640, 360, true), image('3_2', 305, 203, true)]),
    )));

    expect(await getTicketmasterImage('Aerosmith')).toBeNull();
  });

  it('rejects an attraction whose name is a different act', async () => {
    // Measured live: searching "Aerosmith" returns "In The Attic - Tribute to
    // Aerosmith" first, and "Air" returns "Air Supply".
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(withAttractions(
      attraction('In The Attic - Tribute to Aerosmith', [image('16_9', 640, 360)]),
    )));

    expect(await getTicketmasterImage('Aerosmith')).toBeNull();
  });

  it('scans past a wrong first result to a correct later one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(withAttractions(
      attraction('In The Attic - Tribute to Aerosmith', [image('16_9', 640, 360)]),
      attraction('Aerosmith', [image('16_9', 640, 360)]),
    )));

    expect(await getTicketmasterImage('Aerosmith')).not.toBeNull();
  });

  it('accepts a match against an alias', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(withAttractions(
      attraction('ABBA', [image('16_9', 640, 360)], ['Abba The Concert']),
    )));

    expect(await getTicketmasterImage('Abba The Concert')).not.toBeNull();
  });

  it('picks the widest image that is not oversized', async () => {
    // Wikimedia taught this expensively: preferring the original served a 5 MB
    // file for an 80px avatar.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(withAttractions(
      attraction('Aerosmith', [
        image('16_9', 100, 56),
        image('16_9', 640, 360),
        image('16_9', 2048, 1152),
      ]),
    )));

    expect((await getTicketmasterImage('Aerosmith'))?.width).toBe(640);
  });

  it('falls to another ratio when no 16_9 is usable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(withAttractions(
      attraction('Aerosmith', [image('16_9', 640, 360, true), image('3_2', 640, 427)]),
    )));

    expect((await getTicketmasterImage('Aerosmith'))?.width).toBe(640);
  });

  it('returns null when the search finds nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ page: { totalElements: 0 } })));

    expect(await getTicketmasterImage('Nobody At All')).toBeNull();
  });

  it('skips the request entirely when no key is configured', async () => {
    mockEnv.TICKETMASTER_API_KEY = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await getTicketmasterImage('Aerosmith')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null rather than throwing when the quota is exhausted', async () => {
    // A 429 must degrade to the Wikimedia fallback, not break the page.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 } as Response));

    expect(await getTicketmasterImage('Aerosmith')).toBeNull();
  });

  it('returns null rather than throwing on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    expect(await getTicketmasterImage('Aerosmith')).toBeNull();
  });

  it('returns null rather than throwing on a malformed body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ _embedded: { attractions: 'nonsense' } })));

    expect(await getTicketmasterImage('Aerosmith')).toBeNull();
  });

  it('never sends the api key anywhere but the query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue(withAttractions());
    vi.stubGlobal('fetch', fetchMock);

    await getTicketmasterImage('Aerosmith');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('apikey')).toBe('test-key');
    expect(url.searchParams.get('keyword')).toBe('Aerosmith');
  });
});

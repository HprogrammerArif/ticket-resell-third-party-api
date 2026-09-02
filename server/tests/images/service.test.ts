import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

import { getPerformerImage, categoryHint } from '../../src/modules/images/service';
import { clearCache } from '../../src/libs/cache';

const SUMMARY_WITH_IMAGE = {
  type: 'standard',
  title: '3 Doors Down',
  originalimage: { source: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/3_Doors_Down.jpg', width: 3648, height: 1996 },
  thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/3_Doors_Down.jpg/330px-3_Doors_Down.jpg', width: 330, height: 181 },
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/3_Doors_Down' } },
};

const SUMMARY_DISAMBIGUATION = {
  type: 'disambiguation',
  title: 'AFI',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/AFI' } },
};

/**
 * English Wikipedia's local upload area — the /wikipedia/en/ root, where
 * non-free files kept under a fair-use rationale are stored. Modelled on a
 * real result: The Gruffalo resolved to a file literally named
 * Fairuse_Gruffalo.jpg.
 */
const SUMMARY_NON_FREE_IMAGE = {
  type: 'standard',
  title: 'The Gruffalo',
  thumbnail: {
    source: 'https://upload.wikimedia.org/wikipedia/en/3/34/Fairuse_Gruffalo.jpg',
    width: 230,
    height: 286,
  },
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/The_Gruffalo' } },
};

const SUMMARY_NO_IMAGE = {
  type: 'standard',
  title: 'Abra Moore',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Abra_Moore' } },
};

/** A well-formed Commons file URL, so fixtures pass the licence check. */
function COMMONS(file: string): string {
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/${file}/330px-${file}`;
}

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

  // The categories below are TicketNetwork's actual vocabulary, collected from
  // 400 live performers. The original mapping was written against invented
  // names like "Concerts" and matched almost none of them, so nearly every
  // performer was searched with the generic hint.
  it('maps the real music genres to band', () => {
    expect(categoryHint('POP / ROCK')).toBe('band');
    expect(categoryHint('ALTERNATIVE')).toBe('band');
    expect(categoryHint('COUNTRY / FOLK')).toBe('band');
    expect(categoryHint('RAP / HIP HOP')).toBe('band');
    expect(categoryHint('R&B / SOUL')).toBe('band');
    expect(categoryHint('HARD ROCK / METAL')).toBe('band');
    expect(categoryHint('JAZZ / BLUES')).toBe('band');
    expect(categoryHint('TECHNO / ELECTRONIC')).toBe('band');
  });

  it('maps stage categories to musical, not band', () => {
    // "MUSICAL / PLAY" contains the substring "music", so an order that tests
    // for music first classifies a Broadway show as a rock group.
    expect(categoryHint('MUSICAL / PLAY')).toBe('musical');
    expect(categoryHint('BROADWAY')).toBe('musical');
    expect(categoryHint('OFF-BROADWAY')).toBe('musical');
    expect(categoryHint('WEST END')).toBe('musical');
    expect(categoryHint('OPERA')).toBe('musical');
    expect(categoryHint('LAS VEGAS SHOWS')).toBe('musical');
  });

  it('maps the real sports categories to team', () => {
    expect(categoryHint('NFL')).toBe('team');
    expect(categoryHint('Professional (MLB)')).toBe('team');
    expect(categoryHint('Professional (NBA)')).toBe('team');
    expect(categoryHint('College (Div I-A and Div I-AA)')).toBe('team');
  });

  it('maps comedy to comedian', () => {
    expect(categoryHint('COMEDY')).toBe('comedian');
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

    // The thumbnail, not the original: the original is the full uploaded file
    // and runs to several megabytes for an avatar rendered at 80px.
    expect(result).toEqual({
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/3_Doors_Down.jpg/330px-3_Doors_Down.jpg',
      width: 330,
      height: 181,
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
    expect(result?.url).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/3_Doors_Down.jpg/330px-3_Doors_Down.jpg',
    );
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

  it('rejects a non-free image hosted outside Wikimedia Commons', async () => {
    // Files under /wikipedia/en/ are English Wikipedia's local uploads, which
    // is where fair-use material lives. That rationale covers an encyclopedia,
    // not a commercial ticket site, so the card falls back to its gradient.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_NON_FREE_IMAGE))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getPerformerImage('The Gruffalo', 'Theatre')).toBeNull();
  });

  it('falls through to search when the direct hit is non-free', async () => {
    // Rejecting the non-free file must not end the resolution: the search
    // stage may still reach a different article carrying a Commons photo.
    // The search stage must land on the same act, not merely on something with
    // a free photograph — the name check applies to both stages.
    const stageProduction = {
      type: 'standard',
      title: 'The Gruffalo (musical)',
      thumbnail: { source: COMMONS('Gruffalo_stage.jpg'), width: 330, height: 220 },
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/g' } },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(SUMMARY_NON_FREE_IMAGE))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [{ title: 'The Gruffalo (musical)' }] } }))
      .mockResolvedValueOnce(jsonResponse(stageProduction));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getPerformerImage('The Gruffalo', 'Theatre');

    expect(result?.url).toContain('/wikipedia/commons/');
  });

  it('rejects an image served from a host other than upload.wikimedia.org', async () => {
    const impostor = {
      ...SUMMARY_WITH_IMAGE,
      thumbnail: {
        source: 'https://evil.example.com/wikipedia/commons/thumb/x.jpg',
        width: 330,
        height: 181,
      },
      originalimage: undefined,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(impostor))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getPerformerImage('Impostor', 'Concerts')).toBeNull();
  });

  it('rejects an article about a different subject with a similar name', async () => {
    // Measured against the live catalogue: "42nd Street" resolved to the
    // Times Square subway station. The name appears inside the article title,
    // so a containment check would have accepted it.
    const station = {
      type: 'standard',
      title: 'Times Square-42nd Street station',
      thumbnail: { source: COMMONS('Station.jpg'), width: 330, height: 210 },
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/x' } },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(station))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getPerformerImage('42nd Street', 'Theatre')).toBeNull();
  });

  it('rejects an article about a different person', async () => {
    // "Allen Anthony" resolved to Anthony Newley — a real performer, so no
    // description check would catch it. Only the name comparison does.
    const other = {
      type: 'standard',
      title: 'Anthony Newley',
      thumbnail: { source: COMMONS('Newley.jpg'), width: 330, height: 400 },
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/y' } },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(other))
      .mockResolvedValueOnce(jsonResponse({ query: { search: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getPerformerImage('Allen Anthony', 'Concerts')).toBeNull();
  });

  it("accepts Wikipedia's disambiguated title for the same act", async () => {
    // "AFI (band)" is the same subject as "AFI"; the parenthetical is
    // Wikipedia's disambiguator, not a different name.
    const band = {
      type: 'standard',
      title: 'AFI (band)',
      thumbnail: { source: COMMONS('AFI.jpg'), width: 330, height: 220 },
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/AFI_(band)' } },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(band)));

    const result = await getPerformerImage('AFI', 'Concerts');
    expect(result?.title).toBe('AFI (band)');
  });

  it("ignores TicketNetwork's descriptive suffix when comparing names", async () => {
    // TN lists this act as "Alabama - The Band"; Wikipedia titles it
    // "Alabama (band)". Same act, and the suffix must not fail the match.
    const band = {
      type: 'standard',
      title: 'Alabama (band)',
      thumbnail: { source: COMMONS('Alabama.jpg'), width: 330, height: 240 },
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Alabama_(band)' } },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(band)));

    const result = await getPerformerImage('Alabama - The Band', 'Concerts');
    expect(result?.title).toBe('Alabama (band)');
  });

  it('matches names that differ only by accent or punctuation', async () => {
    const artist = {
      type: 'standard',
      title: 'Beyoncé',
      thumbnail: { source: COMMONS('B.jpg'), width: 330, height: 400 },
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/z' } },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(artist)));

    expect(await getPerformerImage('Beyonce', 'Concerts')).not.toBeNull();
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

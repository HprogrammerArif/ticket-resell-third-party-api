import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCategoryByPath: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock('@/libs/CachedCatalogApi', () => ({
  getCategoryByPath: mocks.getCategoryByPath,
  getCategories: mocks.getCategories,
}));

import { SECTION_SLUGS, resolveSection, visibleChildren } from '@/libs/CatalogSections';

function category(name: string, path: string, eventCount = 10) {
  return {
    path,
    depth: path.split('.').filter(Boolean).length - 1,
    text: { name },
    _metadata: { hasEvents: eventCount > 0, eventCount, hasTickets: true, ticketCount: 100 },
  };
}

describe('resolveSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves a section slug to the category of that name', async () => {
    mocks.getCategoryByPath.mockResolvedValue(category('SPORTS', '.1859.1988.'));

    const result = await resolveSection('sports');

    expect(result?.text.name).toBe('SPORTS');
    expect(mocks.getCategories).not.toHaveBeenCalled();
  });

  it('falls back to a name scan when the known path holds something else', async () => {
    // The Catalog WCID already differs between Sandbox and Production on this
    // integration. If category identifiers differ too, a hardcoded path would
    // silently return a valid-looking page listing the wrong things.
    mocks.getCategoryByPath.mockResolvedValue(category('BASKETBALL', '.1859.1988.'));
    mocks.getCategories.mockResolvedValue({
      results: [category('CONCERTS', '.4000.4001.'), category('SPORTS', '.4000.4002.')],
      totalCount: 2,
    });

    const result = await resolveSection('sports');

    expect(result?.path).toBe('.4000.4002.');
    expect(mocks.getCategories).toHaveBeenCalled();
  });

  it('falls back to a name scan when the known path is missing', async () => {
    mocks.getCategoryByPath.mockRejectedValue(new Error('404'));
    mocks.getCategories.mockResolvedValue({
      results: [category('SPORTS', '.4000.4002.')],
      totalCount: 1,
    });

    expect((await resolveSection('sports'))?.path).toBe('.4000.4002.');
  });

  it('returns null for a slug that is not a section', async () => {
    expect(await resolveSection('.1859.1988.1864.')).toBeNull();
    expect(mocks.getCategoryByPath).not.toHaveBeenCalled();
  });

  it('returns null rather than throwing when everything fails', async () => {
    mocks.getCategoryByPath.mockRejectedValue(new Error('down'));
    mocks.getCategories.mockRejectedValue(new Error('down'));

    expect(await resolveSection('sports')).toBeNull();
  });

  it('knows comedy is a category, not a section', () => {
    // COMEDY sits under CONCERTS rather than beside it, so the navigation item
    // added on 2026-09-02 lands on a leaf and must show events, not an empty
    // grid of children.
    expect(SECTION_SLUGS).not.toContain('comedy');
  });
});

describe('visibleChildren', () => {
  const SPORTS = '.1859.1988.';

  it('returns immediate children only, not grandchildren', () => {
    const all = [
      category('BASEBALL', '.1859.1988.1864.'),
      category('Professional (MLB)', '.1859.1988.1864.1969.'),
      category('BOXING', '.1859.1988.1867.'),
    ];

    const names = visibleChildren(all, SPORTS).map((c) => c.text.name);

    expect(names).toEqual(['BASEBALL', 'BOXING']);
  });

  it('excludes categories with no events', () => {
    const all = [
      category('BASEBALL', '.1859.1988.1864.', 12),
      category('CURLING', '.1859.1988.1999.', 0),
    ];

    expect(visibleChildren(all, SPORTS).map((c) => c.text.name)).toEqual(['BASEBALL']);
  });

  it('excludes the parallel tree of unnamed categories', () => {
    // .718.72x mirrors the real tree exactly, with every name blank or "-".
    // Without this the grid fills with cards labelled "-".
    const all = [
      category('BASEBALL', '.1859.1988.1864.'),
      category('-', '.1859.1988.1865.'),
      category('', '.1859.1988.1866.'),
    ];

    expect(visibleChildren(all, SPORTS).map((c) => c.text.name)).toEqual(['BASEBALL']);
  });

  it('orders by event count, busiest first', () => {
    const all = [
      category('RUGBY', '.1859.1988.1911.', 1),
      category('RODEO', '.1859.1988.1910.', 50),
      category('HOCKEY', '.1859.1988.1883.', 9),
    ];

    expect(visibleChildren(all, SPORTS).map((c) => c.text.name)).toEqual(['RODEO', 'HOCKEY', 'RUGBY']);
  });

  it('excludes the parent itself', () => {
    const all = [category('SPORTS', SPORTS), category('BASEBALL', '.1859.1988.1864.')];

    expect(visibleChildren(all, SPORTS).map((c) => c.text.name)).toEqual(['BASEBALL']);
  });
});

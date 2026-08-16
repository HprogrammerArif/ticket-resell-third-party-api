import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/ticketnetwork/client', () => ({
  tnRequest: vi.fn(),
}));

import { tnRequest } from '../../src/modules/ticketnetwork/client';
import {
  getCategories,
  getCategoryByPath,
  getEvents,
  getEventById,
  searchEvents,
  getPerformers,
  getPerformerById,
  getVenues,
  getVenueById,
  getCities,
  globalSuggest,
} from '../../src/modules/ticketnetwork/catalog';

describe('TN catalog functions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getCategories() calls tnRequest("/categories", {})', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
    await getCategories();
    expect(tnRequest).toHaveBeenCalledWith('/categories', {});
  });

  it('getCategories({ pageSize: 10 }) forwards params as TN\'s page/perPage names', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
    await getCategories({ pageSize: 10, pageNumber: 2 });
    expect(tnRequest).toHaveBeenCalledWith('/categories', {
      params: { perPage: 10, page: 2, includeTotalCount: 'true' },
    });
  });

  it('getCategoryByPath("sports/hockey") appends path directly to URL segment', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ path: 'sports/hockey', text: { name: 'Hockey' } });
    await getCategoryByPath('sports/hockey');
    expect(tnRequest).toHaveBeenCalledWith('/categories/sports/hockey', {});
  });

  it('getEventById(42) calls tnRequest("/events/42", {})', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ id: 42, text: { name: 'Test' }, date: {} });
    await getEventById(42);
    expect(tnRequest).toHaveBeenCalledWith('/events/42', {});
  });

  it('getEvents({ city: "Toronto" }) forwards as TN\'s OData filter, not a flat "city" param', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
    await getEvents({ city: 'Toronto' });
    // filter always leads with a takedownAt cutoff (excludes de-listed events) —
    // match that dynamically, assert the city clause is appended exactly.
    const [, opts] = vi.mocked(tnRequest).mock.calls[0]!;
    expect(opts?.params?.filter).toMatch(
      /^takedownAt ge \S+ and city\/text\/name eq 'Toronto'$/,
    );
  });

  it('searchEvents calls tnRequest("/events/search") with keyword forwarded as TN\'s required "q" param', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
    await searchEvents({ keyword: 'hockey' });
    const [, opts] = vi.mocked(tnRequest).mock.calls[0]!;
    expect(opts?.params?.q).toBe('hockey');
    expect(opts?.params?.filter).toMatch(/^takedownAt ge \S+$/);
  });

  it('getPerformerById(99) calls tnRequest("/performers/99", {})', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ id: 99, text: { name: 'Taylor Swift' } });
    await getPerformerById(99);
    expect(tnRequest).toHaveBeenCalledWith('/performers/99', {});
  });

  it('getVenueById(5) calls tnRequest("/venues/5", {})', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({ id: 5, text: { name: 'Scotiabank Arena' } });
    await getVenueById(5);
    expect(tnRequest).toHaveBeenCalledWith('/venues/5', {});
  });

  it('globalSuggest("leaf") defaults each *Requested count so TN doesn\'t omit result groups', async () => {
    vi.mocked(tnRequest).mockResolvedValueOnce({
      events: { totalResultCount: 0, results: [] },
      performers: { totalResultCount: 0, results: [] },
      venues: { totalResultCount: 0, results: [] },
      cities: { totalResultCount: 0, results: [] },
    });
    await globalSuggest('leaf');
    expect(tnRequest).toHaveBeenCalledWith('/suggest', {
      params: {
        q: 'leaf',
        eventsRequested: 5,
        performersRequested: 5,
        venuesRequested: 5,
        citiesRequested: 5,
      },
    });
  });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('../../src/modules/ticketnetwork/client', () => ({
    tnRequest: vitest_1.vi.fn(),
}));
const client_1 = require("../../src/modules/ticketnetwork/client");
const catalog_1 = require("../../src/modules/ticketnetwork/catalog");
(0, vitest_1.describe)('TN catalog functions', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('getCategories() calls tnRequest("/categories", {})', async () => {
        vitest_1.vi.mocked(client_1.tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
        await (0, catalog_1.getCategories)();
        (0, vitest_1.expect)(client_1.tnRequest).toHaveBeenCalledWith('/categories', {});
    });
    (0, vitest_1.it)('getCategories({ pageSize: 10 }) forwards params as TN\'s page/perPage names', async () => {
        vitest_1.vi.mocked(client_1.tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
        await (0, catalog_1.getCategories)({ pageSize: 10, pageNumber: 2 });
        (0, vitest_1.expect)(client_1.tnRequest).toHaveBeenCalledWith('/categories', {
            params: { perPage: 10, page: 2, includeTotalCount: 'true' },
        });
    });
    (0, vitest_1.it)('getCategoryByPath("sports/hockey") appends path directly to URL segment', async () => {
        vitest_1.vi.mocked(client_1.tnRequest).mockResolvedValueOnce({ path: 'sports/hockey', text: { name: 'Hockey' } });
        await (0, catalog_1.getCategoryByPath)('sports/hockey');
        (0, vitest_1.expect)(client_1.tnRequest).toHaveBeenCalledWith('/categories/sports/hockey', {});
    });
    (0, vitest_1.it)('getEventById(42) calls tnRequest("/events/42", {})', async () => {
        vitest_1.vi.mocked(client_1.tnRequest).mockResolvedValueOnce({ id: 42, text: { name: 'Test' }, date: {} });
        await (0, catalog_1.getEventById)(42);
        (0, vitest_1.expect)(client_1.tnRequest).toHaveBeenCalledWith('/events/42', {});
    });
    (0, vitest_1.it)('getEvents({ city: "Toronto" }) forwards as TN\'s OData filter, not a flat "city" param', async () => {
        vitest_1.vi.mocked(client_1.tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
        await (0, catalog_1.getEvents)({ city: 'Toronto' });
        // filter always leads with a takedownAt cutoff (excludes de-listed events) —
        // match that dynamically, assert the city clause is appended exactly.
        const [, opts] = vitest_1.vi.mocked(client_1.tnRequest).mock.calls[0];
        (0, vitest_1.expect)(opts?.params?.filter).toMatch(/^takedownAt ge \S+ and city\/text\/name eq 'Toronto'$/);
    });
    (0, vitest_1.it)('searchEvents calls tnRequest("/events/search") with keyword forwarded as TN\'s required "q" param', async () => {
        vitest_1.vi.mocked(client_1.tnRequest).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
        await (0, catalog_1.searchEvents)({ keyword: 'hockey' });
        const [, opts] = vitest_1.vi.mocked(client_1.tnRequest).mock.calls[0];
        (0, vitest_1.expect)(opts?.params?.q).toBe('hockey');
        (0, vitest_1.expect)(opts?.params?.filter).toMatch(/^takedownAt ge \S+$/);
    });
    (0, vitest_1.it)('getPerformerById(99) calls tnRequest("/performers/99", {})', async () => {
        vitest_1.vi.mocked(client_1.tnRequest).mockResolvedValueOnce({ id: 99, text: { name: 'Taylor Swift' } });
        await (0, catalog_1.getPerformerById)(99);
        (0, vitest_1.expect)(client_1.tnRequest).toHaveBeenCalledWith('/performers/99', {});
    });
    (0, vitest_1.it)('getVenueById(5) calls tnRequest("/venues/5", {})', async () => {
        vitest_1.vi.mocked(client_1.tnRequest).mockResolvedValueOnce({ id: 5, text: { name: 'Scotiabank Arena' } });
        await (0, catalog_1.getVenueById)(5);
        (0, vitest_1.expect)(client_1.tnRequest).toHaveBeenCalledWith('/venues/5', {});
    });
    (0, vitest_1.it)('globalSuggest("leaf") defaults each *Requested count so TN doesn\'t omit result groups', async () => {
        vitest_1.vi.mocked(client_1.tnRequest).mockResolvedValueOnce({
            events: { totalResultCount: 0, results: [] },
            performers: { totalResultCount: 0, results: [] },
            venues: { totalResultCount: 0, results: [] },
            cities: { totalResultCount: 0, results: [] },
        });
        await (0, catalog_1.globalSuggest)('leaf');
        (0, vitest_1.expect)(client_1.tnRequest).toHaveBeenCalledWith('/suggest', {
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
//# sourceMappingURL=catalog.test.js.map
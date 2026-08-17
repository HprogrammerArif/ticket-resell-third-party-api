"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('../../src/modules/ticketnetwork/auth', () => ({
    getToken: vitest_1.vi.fn().mockResolvedValue('mock-bearer-token'),
    fetchToken: vitest_1.vi.fn().mockResolvedValue(undefined),
}));
const mockFetch = vitest_1.vi.fn();
vitest_1.vi.stubGlobal('fetch', mockFetch);
const client_1 = require("../../src/modules/ticketnetwork/client");
const auth_1 = require("../../src/modules/ticketnetwork/auth");
(0, vitest_1.describe)('tnRequest', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.mocked(auth_1.getToken).mockResolvedValue('mock-bearer-token');
        vitest_1.vi.mocked(auth_1.fetchToken).mockResolvedValue(undefined);
    });
    (0, vitest_1.it)('sends GET with Authorization: Bearer and websiteConfigId in URL', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ categories: [] }) });
        await (0, client_1.tnRequest)('/categories');
        const [url, options] = mockFetch.mock.calls[0];
        (0, vitest_1.expect)(url).toContain('websiteConfigId=12498');
        (0, vitest_1.expect)(url).toContain('/categories');
        (0, vitest_1.expect)(options.headers.Authorization).toBe('Bearer mock-bearer-token');
    });
    (0, vitest_1.it)('appends extra params to the URL', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
        await (0, client_1.tnRequest)('/events', { params: { pageSize: 20, city: 'Toronto' } });
        const [url] = mockFetch.mock.calls[0];
        (0, vitest_1.expect)(url).toContain('pageSize=20');
        (0, vitest_1.expect)(url).toContain('city=Toronto');
    });
    (0, vitest_1.it)('retries once on 401 with fault code 900901 and returns success', async () => {
        mockFetch
            .mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({ fault: { code: '900901', message: 'Invalid token' } }),
        })
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ categories: [{ categoryId: 1 }] }) });
        const result = await (0, client_1.tnRequest)('/categories');
        (0, vitest_1.expect)(auth_1.fetchToken).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(result.categories).toHaveLength(1);
        (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(2);
    });
    (0, vitest_1.it)('throws ApiError(502) on 401 without fault code 900901', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({ fault: { code: '900902' } }),
        });
        await (0, vitest_1.expect)((0, client_1.tnRequest)('/categories')).rejects.toMatchObject({ status: 502, code: 'TN_API_ERROR' });
    });
    (0, vitest_1.it)('throws ApiError(502) on non-401 HTTP error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
        await (0, vitest_1.expect)((0, client_1.tnRequest)('/categories')).rejects.toMatchObject({ status: 502, code: 'TN_API_ERROR' });
    });
    (0, vitest_1.it)('returns parsed JSON on success', async () => {
        const expected = { totalRecords: 5, categories: [] };
        mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => expected });
        const result = await (0, client_1.tnRequest)('/categories');
        (0, vitest_1.expect)(result).toEqual(expected);
    });
});
//# sourceMappingURL=client.test.js.map
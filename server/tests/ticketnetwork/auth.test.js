"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mockFetch = vitest_1.vi.fn();
vitest_1.vi.stubGlobal('fetch', mockFetch);
const auth_1 = require("../../src/modules/ticketnetwork/auth");
function mockTokenResponse(overrides) {
    return {
        ok: true,
        json: async () => ({
            access_token: overrides?.access_token ?? 'test-token',
            token_type: 'Bearer',
            expires_in: overrides?.expires_in ?? 3600,
            scope: '',
        }),
    };
}
(0, vitest_1.describe)('TN auth', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        (0, auth_1._resetStateForTests)();
    });
    (0, vitest_1.afterEach)(() => {
        (0, auth_1._resetStateForTests)();
    });
    (0, vitest_1.describe)('fetchToken', () => {
        (0, vitest_1.it)('POSTs to TN_TOKEN_URL with Basic auth and grant_type=client_credentials', async () => {
            mockFetch.mockResolvedValueOnce(mockTokenResponse());
            await (0, auth_1.fetchToken)();
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledOnce();
            const [url, options] = mockFetch.mock.calls[0];
            (0, vitest_1.expect)(url).toContain('oauth2/token');
            (0, vitest_1.expect)(options.method).toBe('POST');
            (0, vitest_1.expect)(options.headers.Authorization).toMatch(/^Basic /);
            (0, vitest_1.expect)(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
            (0, vitest_1.expect)(options.body).toBe('grant_type=client_credentials');
        });
        (0, vitest_1.it)('throws ApiError(502, TN_AUTH_ERROR) when token endpoint returns non-ok', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
            await (0, vitest_1.expect)((0, auth_1.fetchToken)()).rejects.toMatchObject({ status: 502, code: 'TN_AUTH_ERROR' });
        });
    });
    (0, vitest_1.describe)('getToken', () => {
        (0, vitest_1.it)('fetches token on first call and returns it', async () => {
            mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'first-token' }));
            const token = await (0, auth_1.getToken)();
            (0, vitest_1.expect)(token).toBe('first-token');
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('returns cached token without refetching on second call', async () => {
            mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'cached' }));
            const a = await (0, auth_1.getToken)();
            const b = await (0, auth_1.getToken)();
            (0, vitest_1.expect)(a).toBe('cached');
            (0, vitest_1.expect)(b).toBe('cached');
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('refetches when token expires_in is within TOKEN_REFRESH_BUFFER_MS (119s < 120s buffer)', async () => {
            // expires_in=119s → expiresAt = now+119s → now >= expiresAt - 120s = now-1s → always true
            mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'old', expires_in: 119 }));
            mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'new', expires_in: 3600 }));
            await (0, auth_1.fetchToken)(); // establishes old token near-expiry
            const token = await (0, auth_1.getToken)(); // should see near-expiry → refetch
            (0, vitest_1.expect)(token).toBe('new');
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(2);
        });
    });
    (0, vitest_1.describe)('revokeToken', () => {
        (0, vitest_1.it)('POSTs to TN_REVOKE_URL with the current token and clears state', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse({ access_token: 'to-revoke' }))
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
            await (0, auth_1.fetchToken)();
            await (0, auth_1.revokeToken)();
            const [url, opts] = mockFetch.mock.calls[1];
            (0, vitest_1.expect)(url).toContain('oauth2/revoke');
            (0, vitest_1.expect)(opts.method).toBe('POST');
            // State cleared → next getToken must fetch again
            mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'fresh' }));
            (0, vitest_1.expect)(await (0, auth_1.getToken)()).toBe('fresh');
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(3);
        });
        (0, vitest_1.it)('does nothing when no token is cached', async () => {
            await (0, auth_1.revokeToken)();
            (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=auth.test.js.map
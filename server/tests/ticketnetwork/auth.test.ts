import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetchToken, getToken, revokeToken, _resetStateForTests } from '../../src/modules/ticketnetwork/auth';

function mockTokenResponse(overrides?: { access_token?: string; expires_in?: number }) {
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

describe('TN auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStateForTests();
  });

  afterEach(() => {
    _resetStateForTests();
  });

  describe('fetchToken', () => {
    it('POSTs to TN_TOKEN_URL with Basic auth and grant_type=client_credentials', async () => {
      mockFetch.mockResolvedValueOnce(mockTokenResponse());
      await fetchToken();

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('oauth2/token');
      expect(options.method).toBe('POST');
      expect((options.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
      expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(options.body).toBe('grant_type=client_credentials');
    });

    it('throws ApiError(502, TN_AUTH_ERROR) when token endpoint returns non-ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
      await expect(fetchToken()).rejects.toMatchObject({ status: 502, code: 'TN_AUTH_ERROR' });
    });
  });

  describe('getToken', () => {
    it('fetches token on first call and returns it', async () => {
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'first-token' }));
      const token = await getToken();
      expect(token).toBe('first-token');
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('returns cached token without refetching on second call', async () => {
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'cached' }));
      const a = await getToken();
      const b = await getToken();
      expect(a).toBe('cached');
      expect(b).toBe('cached');
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('refetches when token expires_in is within TOKEN_REFRESH_BUFFER_MS (119s < 120s buffer)', async () => {
      // expires_in=119s → expiresAt = now+119s → now >= expiresAt - 120s = now-1s → always true
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'old', expires_in: 119 }));
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'new', expires_in: 3600 }));

      await fetchToken();         // establishes old token near-expiry
      const token = await getToken(); // should see near-expiry → refetch

      expect(token).toBe('new');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('revokeToken', () => {
    it('POSTs to TN_REVOKE_URL with the current token and clears state', async () => {
      mockFetch
        .mockResolvedValueOnce(mockTokenResponse({ access_token: 'to-revoke' }))
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await fetchToken();
      await revokeToken();

      const [url, opts] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(url).toContain('oauth2/revoke');
      expect((opts as RequestInit).method).toBe('POST');

      // State cleared → next getToken must fetch again
      mockFetch.mockResolvedValueOnce(mockTokenResponse({ access_token: 'fresh' }));
      expect(await getToken()).toBe('fresh');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('does nothing when no token is cached', async () => {
      await revokeToken();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

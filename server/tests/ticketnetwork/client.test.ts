import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/ticketnetwork/auth', () => ({
  getToken: vi.fn().mockResolvedValue('mock-bearer-token'),
  fetchToken: vi.fn().mockResolvedValue(undefined),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { tnRequest } from '../../src/modules/ticketnetwork/client';
import { getToken, fetchToken } from '../../src/modules/ticketnetwork/auth';

describe('tnRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockResolvedValue('mock-bearer-token');
    vi.mocked(fetchToken).mockResolvedValue(undefined);
  });

  it('sends GET with Authorization: Bearer and websiteConfigId in URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ categories: [] }) });

    await tnRequest('/categories');

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('websiteConfigId=12498');
    expect(url).toContain('/categories');
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer mock-bearer-token');
  });

  it('appends extra params to the URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    await tnRequest('/events', { params: { pageSize: 20, city: 'Toronto' } });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('pageSize=20');
    expect(url).toContain('city=Toronto');
  });

  it('retries once on 401 with fault code 900901 and returns success', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ fault: { code: '900901', message: 'Invalid token' } }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ categories: [{ categoryId: 1 }] }) });

    const result = await tnRequest<{ categories: unknown[] }>('/categories');

    expect(fetchToken).toHaveBeenCalledOnce();
    expect(result.categories).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError(502) on 401 without fault code 900901', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ fault: { code: '900902' } }),
    });

    await expect(tnRequest('/categories')).rejects.toMatchObject({ status: 502, code: 'TN_API_ERROR' });
  });

  it('throws ApiError(502) on non-401 HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    await expect(tnRequest('/categories')).rejects.toMatchObject({ status: 502, code: 'TN_API_ERROR' });
  });

  it('returns parsed JSON on success', async () => {
    const expected = { totalRecords: 5, categories: [] };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => expected });

    const result = await tnRequest('/categories');
    expect(result).toEqual(expected);
  });
});

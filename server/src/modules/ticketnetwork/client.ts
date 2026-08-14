import { env } from '../../config/env';
import { ApiError } from '../../middleware/errorHandler';
import { getToken, fetchToken } from './auth';
import type { TnErrorBody } from './types';

interface TnRequestOptions {
  params?: Record<string, string | number>;
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(502, 'TN_API_ERROR', 'Malformed response from TicketNetwork');
  }
}

function buildUrl(path: string, extra?: Record<string, string | number>): string {
  const params = new URLSearchParams({ websiteConfigId: String(env.TN_WCID) });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
  }
  return `${env.TN_BASE_URL}${path}?${params.toString()}`;
}

export async function tnRequest<T>(path: string, options: TnRequestOptions = {}): Promise<T> {
  const token = await getToken();
  const url = buildUrl(path, options.params);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (response.status === 401) {
    const body = (await response.json().catch(() => ({}))) as TnErrorBody;
    if (body?.fault?.code === '900901') {
      await fetchToken();
      const fresh = await getToken();
      const retry = await fetch(url, {
        headers: { Authorization: `Bearer ${fresh}`, Accept: 'application/json' },
      });
      if (!retry.ok) throw new ApiError(502, 'TN_API_ERROR', 'TN API error after token refresh');
      return parseJson<T>(retry);
    }
    throw new ApiError(502, 'TN_API_ERROR', 'TicketNetwork authentication failed');
  }

  if (!response.ok) {
    throw new ApiError(502, 'TN_API_ERROR', `TicketNetwork API returned ${response.status}`);
  }

  return parseJson<T>(response);
}

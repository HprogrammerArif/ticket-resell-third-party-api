import { env } from '../../config/env';
import { TOKEN_REFRESH_BUFFER_MS } from '../../config/constants';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../libs/logger';
import type { TnTokenResponse } from './types';

interface TokenState {
  accessToken: string;
  expiresAt: number;
  refreshTimer: ReturnType<typeof setTimeout> | null;
}

let state: TokenState | null = null;

function basicAuth(): string {
  return Buffer.from(`${env.TN_CONSUMER_KEY}:${env.TN_CONSUMER_SECRET}`).toString('base64');
}

export async function fetchToken(): Promise<void> {
  const response = await fetch(env.TN_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new ApiError(502, 'TN_AUTH_ERROR', 'Failed to obtain TicketNetwork access token');
  }

  const data = (await response.json()) as TnTokenResponse;

  if (state?.refreshTimer) clearTimeout(state.refreshTimer);

  state = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    refreshTimer: null,
  };

  scheduleRefresh(data.expires_in);
  logger.debug({ expiresIn: data.expires_in }, 'TN token fetched');
}

function scheduleRefresh(expiresIn: number): void {
  const delay = Math.max(0, expiresIn * 1000 - TOKEN_REFRESH_BUFFER_MS);
  const timer = setTimeout(() => {
    fetchToken().catch((err: unknown) => logger.error(err, 'TN proactive token refresh failed'));
  }, delay);
  timer.unref();
  if (state) state.refreshTimer = timer;
}

export async function getToken(): Promise<string> {
  if (!state || Date.now() >= state.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
    await fetchToken();
  }
  return state!.accessToken;
}

export async function revokeToken(): Promise<void> {
  if (!state) return;
  if (state.refreshTimer) clearTimeout(state.refreshTimer);
  await fetch(env.TN_REVOKE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `token=${state.accessToken}`,
  });
  state = null;
  logger.info('TN token revoked');
}

export function _resetStateForTests(): void {
  if (state?.refreshTimer) clearTimeout(state.refreshTimer);
  state = null;
}

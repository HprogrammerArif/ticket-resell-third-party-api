export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 45;       // Stay safely under TN Production ceiling of 50 req/min (R24/D6)

export const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000; // refresh 2 min before expiry

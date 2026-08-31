export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 45;       // Stay safely under TN Production ceiling of 50 req/min (R24/D6)

// Wikimedia image lookups get their own budget because they never reach
// TicketNetwork — they must not consume a ceiling that exists to protect a
// different upstream. Volume is also structurally higher: one grid page asks
// for up to 24 images against a single catalog call. The 24h cache means
// almost none of these leave this server, so the limit is only a guard
// against a runaway loop.
export const IMAGE_RATE_LIMIT_MAX_REQUESTS = 600;

export const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000; // refresh 2 min before expiry

// The admin login endpoint is the only publicly reachable back-office surface,
// so it gets a tighter limit than the catalog.
export const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const ADMIN_LOGIN_MAX_ATTEMPTS = 10;

import rateLimit from 'express-rate-limit';
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  IMAGE_RATE_LIMIT_MAX_REQUESTS,
} from '../config/constants';

export const catalogRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
        status: 429,
      },
    });
  },
});

/**
 * Image lookups are limited separately from the catalog.
 *
 * They resolve against Wikimedia, not TicketNetwork, so counting them against
 * the TN ceiling throttled the catalogue for no reason: rendering one grid of
 * events spent most of the catalog budget on photographs and the next genuine
 * catalog call was refused with a 429.
 */
export const imageRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: IMAGE_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
        status: 429,
      },
    });
  },
});

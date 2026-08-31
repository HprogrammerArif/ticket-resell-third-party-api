import rateLimit from 'express-rate-limit';
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  ADMIN_LOGIN_WINDOW_MS,
  ADMIN_LOGIN_MAX_ATTEMPTS,
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

export const adminLoginRateLimiter = rateLimit({
  windowMs: ADMIN_LOGIN_WINDOW_MS,
  limit: ADMIN_LOGIN_MAX_ATTEMPTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts, please try again later',
        status: 429,
      },
    });
  },
});

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

// Tight limit so the test doesn't need 55+ requests
const testLimiter = rateLimit({
  windowMs: 60_000,
  limit: 1,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later', status: 429 },
    });
  },
});

const app = express();
app.get('/test', testLimiter, (_req, res) => res.json({ ok: true }));

describe('rate limiter', () => {
  it('allows first request through', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  });

  it('returns 429 with RATE_LIMITED error body after limit exceeded', async () => {
    await request(app).get('/test'); // consume the single slot
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

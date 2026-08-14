import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Application } from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

function makeApp(): Application {
  const limiter = rateLimit({
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
  app.get('/test', limiter, (_req, res) => res.json({ ok: true }));
  return app;
}

describe('rate limiter', () => {
  let app: Application;

  beforeEach(() => {
    app = makeApp();
  });

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

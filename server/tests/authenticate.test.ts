import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock('../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

import jwt from 'jsonwebtoken';
import { authenticate } from '../src/middleware/authenticate';
import { ApiError } from '../src/middleware/errorHandler';

function mockReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

function mockNext(): NextFunction {
  return vi.fn() as NextFunction;
}

describe('authenticate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets req.user and calls next when token is valid', () => {
    const payload = { id: 'u1', email: 'a@b.com', role: 'USER', displayName: 'Alice' };
    vi.mocked(jwt.verify).mockReturnValue(payload as never);

    const req = mockReq('Bearer valid.token.here') as Request;
    const res = {} as Response;
    const next = mockNext();

    authenticate(req, res, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with 401 ApiError when no token provided', () => {
    const req = mockReq() as Request;
    const res = {} as Response;
    const next = mockNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
  });

  it('calls next with 401 ApiError when token is invalid', () => {
    vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('invalid'); });

    const req = mockReq('Bearer bad.token') as Request;
    const res = {} as Response;
    const next = mockNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
  });
});

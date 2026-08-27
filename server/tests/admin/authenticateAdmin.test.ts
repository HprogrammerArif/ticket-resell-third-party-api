import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}));

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

vi.mock('../../src/libs/db', () => ({
  db: { adminUser: { findUnique: vi.fn() } },
}));

import jwt from 'jsonwebtoken';
import { db } from '../../src/libs/db';
import { authenticateAdmin } from '../../src/middleware/authenticateAdmin';
import { ApiError } from '../../src/middleware/errorHandler';

function mockReq(authHeader?: string): Partial<Request> {
  return { headers: authHeader ? { authorization: authHeader } : {} };
}

describe('authenticateAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a request with no token', async () => {
    const next = vi.fn();
    await authenticateAdmin(mockReq() as Request, {} as Response, next as unknown as NextFunction);

    const err = next.mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
    expect(db.adminUser.findUnique).not.toHaveBeenCalled();
  });

  it('requires the admin audience when verifying', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 'a1', email: 'x@y.z' } as never);
    vi.mocked(db.adminUser.findUnique).mockResolvedValue({
      id: 'a1', email: 'x@y.z', name: 'Steven',
    } as never);

    await authenticateAdmin(mockReq('Bearer t') as Request, {} as Response, vi.fn() as unknown as NextFunction);

    expect(jwt.verify).toHaveBeenCalledWith(
      't',
      expect.any(String),
      expect.objectContaining({ audience: 'admin' }),
    );
  });

  it('rejects a customer token', async () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('jwt audience invalid');
    });

    const next = vi.fn();
    await authenticateAdmin(mockReq('Bearer customer-token') as Request, {} as Response, next as unknown as NextFunction);

    const err = next.mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
  });

  it('rejects a valid token whose admin no longer exists', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 'gone', email: 'x@y.z' } as never);
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(null as never);

    const next = vi.fn();
    await authenticateAdmin(mockReq('Bearer t') as Request, {} as Response, next as unknown as NextFunction);

    const err = next.mock.calls[0]?.[0] as ApiError;
    expect(err.status).toBe(401);
  });

  it('attaches the admin to the request', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 'a1', email: 'x@y.z' } as never);
    vi.mocked(db.adminUser.findUnique).mockResolvedValue({
      id: 'a1', email: 'x@y.z', name: 'Steven',
    } as never);

    const req = mockReq('Bearer t') as Request;
    await authenticateAdmin(req, {} as Response, vi.fn() as unknown as NextFunction);

    expect(req.admin).toEqual({ id: 'a1', email: 'x@y.z', name: 'Steven' });
  });
});

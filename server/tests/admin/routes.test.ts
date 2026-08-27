import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/modules/admin/service', () => ({
  login: vi.fn(),
  me: vi.fn(),
  changePassword: vi.fn(),
  getStats: vi.fn(),
  listCustomers: vi.fn(),
  getCustomer: vi.fn(),
}));

import app from '../../src/app';
import * as adminService from '../../src/modules/admin/service';

describe('Admin routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 for customers without a token', async () => {
    const res = await request(app).get('/api/admin/customers');
    expect(res.status).toBe(401);
    expect(adminService.listCustomers).not.toHaveBeenCalled();
  });

  it('returns 401 for stats without a token', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('returns 422 when login is missing a password', async () => {
    const res = await request(app).post('/api/admin/login').send({ email: 'steven@example.com' });
    expect(res.status).toBe(422);
    expect(adminService.login).not.toHaveBeenCalled();
  });

  it('returns the token on a successful login', async () => {
    vi.mocked(adminService.login).mockResolvedValueOnce({
      token: 'tok',
      admin: { id: 'a1', email: 'steven@example.com', name: 'Steven', createdAt: new Date() },
    });

    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: 'steven@example.com', password: 'correct-horse' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('tok');
  });
});

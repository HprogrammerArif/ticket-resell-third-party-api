import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

vi.mock('../../src/libs/db', () => ({
  db: {
    adminUser: { findUnique: vi.fn(), update: vi.fn() },
    user: { count: vi.fn(), findMany: vi.fn() },
  },
}));

import { db } from '../../src/libs/db';
import { listCustomers, getStats } from '../../src/modules/admin/service';

describe('listCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);
    vi.mocked(db.user.count).mockResolvedValue(0 as never);
  });

  it('caps pageSize so a crafted value cannot dump the table', async () => {
    await listCustomers({ pageSize: 100000 });
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as { take: number };
    expect(args.take).toBe(100);
  });

  it('defaults to 25 per page', async () => {
    await listCustomers({});
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as { take: number };
    expect(args.take).toBe(25);
  });

  it('never selects the password hash', async () => {
    await listCustomers({});
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as {
      select: Record<string, boolean>;
    };
    expect(args.select.passwordHash).toBeUndefined();
  });

  it('filters on email and name when q is given', async () => {
    await listCustomers({ q: 'steven' });
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as {
      where: { OR?: unknown[] };
    };
    expect(args.where.OR).toHaveLength(4);
  });

  it('omits the filter entirely when q is blank', async () => {
    await listCustomers({ q: '   ' });
    const args = vi.mocked(db.user.findMany).mock.calls[0]?.[0] as {
      where: { OR?: unknown[] };
    };
    expect(args.where.OR).toBeUndefined();
  });
});

describe('getStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the total and the last seven days', async () => {
    vi.mocked(db.user.count).mockResolvedValueOnce(42 as never).mockResolvedValueOnce(5 as never);
    const stats = await getStats();
    expect(stats).toEqual({ totalCustomers: 42, signupsLast7Days: 5 });
  });
});

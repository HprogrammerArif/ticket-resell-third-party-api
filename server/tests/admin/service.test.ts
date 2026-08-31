import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));

vi.mock('../../src/libs/db', () => ({
  db: {
    adminUser: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../src/libs/db';
import { login, changePassword } from '../../src/modules/admin/service';
import { ApiError } from '../../src/middleware/errorHandler';

const HASH = bcrypt.hashSync('correct-horse', 10);

const ADMIN = {
  id: 'a1',
  email: 'steven@example.com',
  name: 'Steven',
  passwordHash: HASH,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('admin login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a token scoped to the admin audience', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);

    const result = await login('steven@example.com', 'correct-horse');
    const decoded = jwt.verify(result.token, 'test-secret-at-least-32-chars-long!!', {
      audience: 'admin',
    }) as { id: string };

    expect(decoded.id).toBe('a1');
    expect(result.admin).toEqual({
      id: 'a1', email: 'steven@example.com', name: 'Steven', createdAt: ADMIN.createdAt,
    });
  });

  it('omits the password hash from the returned admin', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    const result = await login('steven@example.com', 'correct-horse');
    expect(result.admin).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    await expect(login('steven@example.com', 'wrong')).rejects.toBeInstanceOf(ApiError);
  });

  it('gives the same error for an unknown email as for a wrong password', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    const wrongPassword = await login('steven@example.com', 'wrong').catch((e: ApiError) => e);

    vi.mocked(db.adminUser.findUnique).mockResolvedValue(null as never);
    const unknownEmail = await login('nobody@example.com', 'whatever').catch((e: ApiError) => e);

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.message).toBe(wrongPassword.message);
  });
});

describe('admin changePassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an incorrect current password', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    await expect(changePassword('a1', 'wrong', 'new-password-123')).rejects.toBeInstanceOf(ApiError);
    expect(db.adminUser.update).not.toHaveBeenCalled();
  });

  it('stores a hash, never the new password itself', async () => {
    vi.mocked(db.adminUser.findUnique).mockResolvedValue(ADMIN as never);
    vi.mocked(db.adminUser.update).mockResolvedValue(ADMIN as never);

    await changePassword('a1', 'correct-horse', 'new-password-123');

    const arg = vi.mocked(db.adminUser.update).mock.calls[0]?.[0] as {
      data: { passwordHash: string };
    };
    expect(arg.data.passwordHash).not.toBe('new-password-123');
    expect(bcrypt.compareSync('new-password-123', arg.data.passwordHash)).toBe(true);
  });
});

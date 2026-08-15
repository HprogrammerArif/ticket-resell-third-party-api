import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/libs/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpw'),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock.jwt.token'),
  },
}));

vi.mock('../../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!', JWT_EXPIRES_IN: '7d' },
}));

import { db } from '../../src/libs/db';
import bcrypt from 'bcryptjs';
import { register, login, me, updateProfile, changePassword, deleteAccount } from '../../src/modules/users/service';
import { ApiError } from '../../src/middleware/errorHandler';

const mockUser = {
  id: 'user_1',
  email: 'test@example.com',
  passwordHash: '$2b$12$hashedpw',
  displayName: 'Test User',
  firstName: null,
  lastName: null,
  gender: null,
  dateOfBirth: null,
  marketingConsent: false,
  role: 'USER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  giftCardRedemptions: [],
};

describe('register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user and returns a JWT token', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue(mockUser);

    const result = await register({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      marketingConsent: false,
    });

    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'test@example.com', passwordHash: '$2b$12$hashedpw' }),
      }),
    );
    expect(result.token).toBe('mock.jwt.token');
  });

  it('throws 409 when email already exists', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

    await expect(
      register({ email: 'test@example.com', password: 'password123', marketingConsent: false }),
    ).rejects.toThrow(ApiError);
  });

  it('hashes the password before storing', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue(mockUser);

    await register({ email: 'test@example.com', password: 'plaintext', marketingConsent: false });

    expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 12);
  });
});

describe('login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a JWT token on valid credentials', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await login('test@example.com', 'password123');

    expect(result.token).toBe('mock.jwt.token');
  });

  it('throws 401 on wrong password', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(login('test@example.com', 'wrongpass')).rejects.toThrow(ApiError);
  });

  it('throws 401 when user not found', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    await expect(login('nobody@example.com', 'password')).rejects.toThrow(ApiError);
  });
});

describe('changePassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the password hash when current password is correct', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(db.user.update).mockResolvedValue({ ...mockUser, passwordHash: '$2b$12$newhashedpw' });

    await changePassword('user_1', { currentPassword: 'oldpass', newPassword: 'newpass123' });

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_1' },
        data: { passwordHash: '$2b$12$hashedpw' },
      }),
    );
  });

  it('throws 401 when current password is wrong', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      changePassword('user_1', { currentPassword: 'wrong', newPassword: 'newpass123' }),
    ).rejects.toThrow(ApiError);
  });
});

describe('deleteAccount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the user record', async () => {
    vi.mocked(db.user.delete).mockResolvedValue(mockUser);

    await deleteAccount('user_1');

    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'user_1' } });
  });
});

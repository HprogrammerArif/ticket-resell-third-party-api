import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../libs/db';
import { env } from '../../config/env';
import { ApiError } from '../../middleware/errorHandler';

export type RegisterData = {
  email: string;
  password: string;
  displayName?: string;
  gender?: 'FEMALE' | 'MALE' | 'NON_BINARY' | null;
  dateOfBirth?: string | null;
  marketingConsent: boolean;
};

export type SafeUser = {
  id: string;
  email: string;
  displayName: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  marketingConsent: boolean;
  role: string;
  createdAt: Date;
};

function signToken(user: { id: string; email: string; role: string; displayName: string | null }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
  );
}

function toSafeUser(user: {
  id: string;
  email: string;
  displayName: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  marketingConsent: boolean;
  role: string;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    marketingConsent: user.marketingConsent,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function register(data: RegisterData): Promise<{ token: string }> {
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await db.user.create({
    data: {
      email: data.email,
      passwordHash,
      displayName: data.displayName ?? null,
      gender: data.gender ?? null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      marketingConsent: data.marketingConsent,
    },
  });

  return { token: signToken(user) };
}

export async function login(email: string, password: string): Promise<{ token: string }> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return { token: signToken(user) };
}

export async function me(userId: string): Promise<SafeUser> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return toSafeUser(user);
}

export async function updateProfile(
  userId: string,
  data: { displayName: string },
): Promise<SafeUser> {
  const user = await db.user.update({
    where: { id: userId },
    data: { displayName: data.displayName },
  });
  return toSafeUser(user);
}

export async function changePassword(
  userId: string,
  data: { currentPassword: string; newPassword: string },
): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'INVALID_PASSWORD', 'Current password is incorrect');
  }

  const newHash = await bcrypt.hash(data.newPassword, 12);
  await db.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
}

export async function deleteAccount(userId: string): Promise<void> {
  await db.user.delete({ where: { id: userId } });
}

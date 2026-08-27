import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../libs/db';
import { env } from '../../config/env';
import { ApiError } from '../../middleware/errorHandler';

/** Admin sessions are deliberately shorter than the 7-day customer session. */
const ADMIN_TOKEN_EXPIRY = '8h';

export type SafeAdmin = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};

function toSafeAdmin(admin: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}): SafeAdmin {
  return { id: admin.id, email: admin.email, name: admin.name, createdAt: admin.createdAt };
}

function signAdminToken(admin: { id: string; email: string }): string {
  return jwt.sign(
    { id: admin.id, email: admin.email },
    env.JWT_SECRET,
    { expiresIn: ADMIN_TOKEN_EXPIRY, audience: 'admin' } as jwt.SignOptions,
  );
}

/**
 * Authenticates an administrator.
 *
 * Returns an identical error for an unknown email and a wrong password, so the
 * endpoint cannot be used to discover which addresses have admin accounts.
 * @param email - Administrator email address.
 * @param password - Plain-text password to check.
 * @returns A signed admin token and the administrator's safe fields.
 * @throws ApiError 401 when the credentials do not match.
 */
export async function login(
  email: string,
  password: string,
): Promise<{ token: string; admin: SafeAdmin }> {
  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return { token: signAdminToken(admin), admin: toSafeAdmin(admin) };
}

/**
 * Loads the current administrator.
 * @param adminId - Administrator id from the verified token.
 * @returns The administrator's safe fields.
 * @throws ApiError 404 when the administrator no longer exists.
 */
export async function me(adminId: string): Promise<SafeAdmin> {
  const admin = await db.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) {
    throw new ApiError(404, 'ADMIN_NOT_FOUND', 'Administrator not found');
  }
  return toSafeAdmin(admin);
}

/**
 * Changes an administrator's own password.
 * @param adminId - Administrator id from the verified token.
 * @param currentPassword - Existing password, re-checked before any write.
 * @param newPassword - Replacement password.
 * @returns Nothing; resolves once the new hash is stored.
 * @throws ApiError 401 when the current password does not match.
 */
export async function changePassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const admin = await db.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) {
    throw new ApiError(404, 'ADMIN_NOT_FOUND', 'Administrator not found');
  }

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.adminUser.update({ where: { id: adminId }, data: { passwordHash } });
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export type CustomerListItem = {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
};

/** Fields safe to expose in the back office. Never includes passwordHash. */
const CUSTOMER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  firstName: true,
  lastName: true,
  createdAt: true,
} as const;

/**
 * Platform counts for the dashboard home.
 * @returns Total customers, and how many signed up in the last seven days.
 */
export async function getStats(): Promise<{
  totalCustomers: number;
  signupsLast7Days: number;
}> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const totalCustomers = await db.user.count();
  const signupsLast7Days = await db.user.count({
    where: { createdAt: { gte: sevenDaysAgo } },
  });

  return { totalCustomers, signupsLast7Days };
}

/**
 * Lists customers for the back office, newest first.
 *
 * pageSize is capped server-side so a crafted query parameter cannot pull the
 * whole table in one request.
 * @param options - Optional search term and pagination.
 * @returns One page of customers plus the total matching count.
 */
export async function listCustomers(options: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  results: CustomerListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(options.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const term = options.q?.trim();

  const where = term
    ? {
        OR: [
          { email: { contains: term, mode: 'insensitive' as const } },
          { firstName: { contains: term, mode: 'insensitive' as const } },
          { lastName: { contains: term, mode: 'insensitive' as const } },
          { displayName: { contains: term, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const results = await db.user.findMany({
    where,
    select: CUSTOMER_SELECT,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const totalCount = await db.user.count({ where });

  return { results, page, pageSize, totalCount };
}

/**
 * Loads one customer for the back office.
 * @param id - Customer id.
 * @returns The customer's safe fields.
 * @throws ApiError 404 when no such customer exists.
 */
export async function getCustomer(id: string): Promise<CustomerListItem> {
  const customer = await db.user.findUnique({ where: { id }, select: CUSTOMER_SELECT });
  if (!customer) {
    throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  }
  return customer;
}

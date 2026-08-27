import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../libs/db';
import { ApiError } from './errorHandler';

/**
 * Authenticates a back-office request.
 *
 * Differs from `authenticate` in two ways. It requires `aud: 'admin'`, so a
 * customer token fails at signature verification rather than at an application
 * check. And it loads the AdminUser row rather than trusting the payload, so a
 * deleted admin cannot keep working until their token expires.
 * @param req - Incoming request; `admin` is attached on success.
 * @param _res - Unused.
 * @param next - Called with an ApiError on failure.
 * @returns Nothing; resolves once the request is authenticated or rejected.
 */
export async function authenticateAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  let payload: { id: string; email: string };
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { audience: 'admin' }) as {
      id: string;
      email: string;
    };
  } catch {
    next(new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
    return;
  }

  const admin = await db.adminUser.findUnique({ where: { id: payload.id } });
  if (!admin) {
    next(new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
    return;
  }

  req.admin = { id: admin.id, email: admin.email, name: admin.name };
  next();
}

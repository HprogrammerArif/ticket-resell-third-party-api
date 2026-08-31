import { Router } from 'express';
import { z } from 'zod';
import { authenticateAdmin } from '../../middleware/authenticateAdmin';
import { adminLoginRateLimiter } from '../../middleware/rateLimiter';
import { ApiError } from '../../middleware/errorHandler';
import {
  login,
  me,
  changePassword,
  getStats,
  listCustomers,
  getCustomer,
} from './service';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

router.post('/login', adminLoginRateLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
    }
    const result = await login(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticateAdmin, async (req, res, next) => {
  try {
    res.json(await me(req.admin!.id));
  } catch (err) {
    next(err);
  }
});

router.put('/password', authenticateAdmin, async (req, res, next) => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
    }
    await changePassword(req.admin!.id, parsed.data.currentPassword, parsed.data.newPassword);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', authenticateAdmin, async (_req, res, next) => {
  try {
    res.json(await getStats());
  } catch (err) {
    next(err);
  }
});

router.get('/customers', authenticateAdmin, async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const page = Number(req.query.page) || undefined;
    const pageSize = Number(req.query.pageSize) || undefined;
    res.json(await listCustomers({ q, page, pageSize }));
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id', authenticateAdmin, async (req, res, next) => {
  try {
    res.json(await getCustomer(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;

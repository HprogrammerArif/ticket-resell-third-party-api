import { Router } from 'express';
import { catalogRateLimiter } from '../middleware/rateLimiter';
import catalogRouter from './catalog';
import usersRouter from '../modules/users/routes';

const router = Router();

// Auth routes before catalog so /api/auth/* bypasses the catalog rate limiter
router.use('/api/auth', usersRouter);
router.use('/api', catalogRateLimiter, catalogRouter);

export default router;

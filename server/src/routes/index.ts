import { Router } from 'express';
import { catalogRateLimiter } from '../middleware/rateLimiter';
import catalogRouter from './catalog';
import usersRouter from '../modules/users/routes';

const router = Router();

// Rate limiter scoped to /api only — /health intentionally excluded
router.use('/api', catalogRateLimiter, catalogRouter);
router.use('/api/auth', usersRouter);

export default router;

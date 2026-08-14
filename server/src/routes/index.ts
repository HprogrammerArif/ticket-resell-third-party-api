import { Router } from 'express';
import { catalogRateLimiter } from '../middleware/rateLimiter';
import catalogRouter from './catalog';

const router = Router();

// Rate limiter scoped to /api only — /health intentionally excluded
router.use('/api', catalogRateLimiter, catalogRouter);

export default router;

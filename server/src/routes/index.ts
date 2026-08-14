import { Router } from 'express';
import { catalogRateLimiter } from '../middleware/rateLimiter';
import catalogRouter from './catalog';

const router = Router();

router.use('/api', catalogRateLimiter, catalogRouter);

export default router;

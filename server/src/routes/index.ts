import { Router } from 'express';
import { catalogRateLimiter } from '../middleware/rateLimiter';
import catalogRouter from './catalog';
import usersRouter from '../modules/users/routes';
import adminRouter from '../modules/admin/routes';
import imagesRouter from '../modules/images/routes';

const router = Router();

// Auth routes before catalog so /api/auth/* bypasses the catalog rate limiter
router.use('/api/auth', usersRouter);
router.use('/api/catalog', catalogRateLimiter, catalogRouter);
router.use('/api/admin', adminRouter);
// Images carry their own limiter, applied inside the module: they resolve
// against Wikimedia and must not spend the catalog budget, which exists to
// stay under TicketNetwork's ceiling.
router.use('/api/images', imagesRouter);

export default router;

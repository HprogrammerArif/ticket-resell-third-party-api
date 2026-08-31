import { Router } from 'express';
import { imageRateLimiter } from '../../middleware/rateLimiter';
import { ApiError } from '../../middleware/errorHandler';
import { getPerformerImage } from './service';

const router = Router();

router.get('/performer', imageRateLimiter, async (req, res, next) => {
  try {
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    if (!name) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'name is required');
    }

    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    // A missing image is a normal outcome, not an error — 200 with a null body
    // keeps that distinct from a genuine failure.
    res.json({ image: await getPerformerImage(name, category) });
  } catch (err) {
    next(err);
  }
});

export default router;

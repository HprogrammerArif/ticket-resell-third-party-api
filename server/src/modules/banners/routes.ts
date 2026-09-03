import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { imageSize } from 'image-size';
import { z } from 'zod';
import { authenticateAdmin } from '../../middleware/authenticateAdmin';
import { ApiError } from '../../middleware/errorHandler';
import { catalogRateLimiter } from '../../middleware/rateLimiter';
import {
  createBanner,
  listActiveBanners,
  listAllBanners,
  removeBanner,
  updateBanner,
} from './service';
import { UPLOAD_DIR, bannerUpload } from './upload';

const router = Router();

const createSchema = z.object({
  title: z.string().min(1).max(120),
  linkUrl: z.string().min(1).max(2000),
  position: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.coerce.boolean().optional(),
});

const updateSchema = createSchema.partial();

/** A stored filename is a UUID and an extension. Nothing else is servable. */
const FILENAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

// ─── Public ──────────────────────────────────────────────────────────────────

router.get('/', catalogRateLimiter, async (_req, res, next) => {
  try {
    res.json({ results: await listActiveBanners() });
  } catch (err) {
    next(err);
  }
});

/**
 * Serves a banner file.
 *
 * The filename is matched against a pattern rather than sanitised. Only names
 * this server generated can pass, so path traversal has nothing to work with —
 * there is no `..` that matches a UUID.
 */
router.get('/file/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!FILENAME.test(filename)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid filename');
    }

    const full = path.join(UPLOAD_DIR, filename);
    const info = await stat(full).catch(() => null);
    if (!info?.isFile()) {
      throw new ApiError(404, 'NOT_FOUND', 'Banner not found');
    }

    const ext = filename.split('.').pop() ?? 'jpg';
    res.setHeader('Content-Type', CONTENT_TYPES[ext] ?? 'application/octet-stream');
    res.setHeader('Content-Length', info.size);
    // The name is a UUID, so the bytes behind it never change.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(full).pipe(res);
  } catch (err) {
    next(err);
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

router.get('/admin', authenticateAdmin, async (_req, res, next) => {
  try {
    res.json({ results: await listAllBanners() });
  } catch (err) {
    next(err);
  }
});

router.post('/admin', authenticateAdmin, bannerUpload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'An image file is required');
    }

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid banner details');
    }

    // Dimensions are stored so next/image can reserve the space and the
    // carousel does not shift as each banner loads.
    let width = 0;
    let height = 0;
    try {
      const size = imageSize(req.file.buffer);
      width = size.width ?? 0;
      height = size.height ?? 0;
    } catch {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Could not read the image dimensions');
    }

    const banner = await createBanner(req.file, parsed.data, { width, height });
    res.status(201).json(banner);
  } catch (err) {
    next(err);
  }
});

router.put('/admin/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid banner details');
    }
    res.json(await updateBanner(req.params.id, parsed.data));
  } catch (err) {
    next(err);
  }
});

router.delete('/admin/:id', authenticateAdmin, async (req, res, next) => {
  try {
    await removeBanner(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;

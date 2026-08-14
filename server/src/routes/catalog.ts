import { Router, Request, Response, NextFunction } from 'express';
import * as catalog from '../modules/ticketnetwork/catalog';
import { ApiError } from '../middleware/errorHandler';
import type { CategoryParams, EventParams, PerformerParams, VenueParams, CityParams } from '../modules/ticketnetwork/types';

const router = Router();

router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: CategoryParams = {
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getCategories(params));
  } catch (err) { next(err); }
});

// Wildcard captures nested paths like 'sports/hockey' in req.params[0]
// Must be registered after the exact /categories route
router.get('/categories/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryPath = req.params[0];
    const params: CategoryParams = {
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getCategoryByPath(categoryPath, params));
  } catch (err) { next(err); }
});

// /events/search BEFORE /events/:id — prevents 'search' being parsed as an id
router.get('/events/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: EventParams = {
      keyword: req.query.keyword as string | undefined,
      categoryPath: req.query.categoryPath as string | undefined,
      city: req.query.city as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.searchEvents(params));
  } catch (err) { next(err); }
});

router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: EventParams = {
      categoryPath: req.query.categoryPath as string | undefined,
      city: req.query.city as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getEvents(params));
  } catch (err) { next(err); }
});

router.get('/events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Event id must be a number');
    res.json(await catalog.getEventById(id));
  } catch (err) { next(err); }
});

router.get('/performers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: PerformerParams = {
      categoryPath: req.query.categoryPath as string | undefined,
      keyword: req.query.keyword as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getPerformers(params));
  } catch (err) { next(err); }
});

router.get('/performers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Performer id must be a number');
    res.json(await catalog.getPerformerById(id));
  } catch (err) { next(err); }
});

router.get('/venues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: VenueParams = {
      city: req.query.city as string | undefined,
      stateProvince: req.query.stateProvince as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getVenues(params));
  } catch (err) { next(err); }
});

router.get('/venues/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Venue id must be a number');
    res.json(await catalog.getVenueById(id));
  } catch (err) { next(err); }
});

router.get('/cities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: CityParams = {
      stateProvince: req.query.stateProvince as string | undefined,
      country: req.query.country as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getCities(params));
  } catch (err) { next(err); }
});

router.get('/search/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) throw new ApiError(422, 'VALIDATION_ERROR', 'q query parameter is required');
    res.json(await catalog.globalSuggest(q));
  } catch (err) { next(err); }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import * as catalog from '../modules/ticketnetwork/catalog';
import { ApiError } from '../middleware/errorHandler';
import type {
  CategoryParams, CategoryHierarchyParams,
  EventParams, EventSuggestParams, EventBulkParams,
  PerformerParams, SuggestParams,
  VenueParams,
  CityParams,
  CountryParams,
  StateProvinceParams,
  PostalCodeParams,
} from '../modules/ticketnetwork/types';

const router = Router();

// ─── Categories ───────────────────────────────────────────────────────────────

router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: CategoryParams = {
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      hasEvents: req.query.hasEvents === 'true',
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

// ─── Category Hierarchies ─────────────────────────────────────────────────────

router.get('/categoryhierarchies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: CategoryHierarchyParams = {
      filter: req.query.filter as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getCategoryHierarchies(params));
  } catch (err) { next(err); }
});

router.get('/categoryhierarchies/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Hierarchy id must be a number');
    res.json(await catalog.getCategoryHierarchyById(id));
  } catch (err) { next(err); }
});

// ─── Events ───────────────────────────────────────────────────────────────────

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

router.get('/events/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) throw new ApiError(422, 'VALIDATION_ERROR', 'q query parameter is required');
    const params: EventSuggestParams = {
      q,
      numberOfSuggestions: req.query.numberOfSuggestions ? Number(req.query.numberOfSuggestions) : undefined,
      includeVenueInfo: req.query.includeVenueInfo === 'true' ? true : undefined,
      filter: req.query.filter as string | undefined,
    };
    res.json(await catalog.suggestEvents(params));
  } catch (err) { next(err); }
});

router.get('/events/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: EventBulkParams = {
      filter: req.query.filter as string | undefined,
      categoryFilter: req.query.categoryFilter as string | undefined,
      performerFilter: req.query.performerFilter as string | undefined,
      geoFilter: req.query.geoFilter as string | undefined,
      fields: req.query.fields as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.bulkEvents(params));
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

// ─── Performers ───────────────────────────────────────────────────────────────

router.get('/performers/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) throw new ApiError(422, 'VALIDATION_ERROR', 'q query parameter is required');
    const params: SuggestParams = {
      q,
      numberOfSuggestions: req.query.numberOfSuggestions ? Number(req.query.numberOfSuggestions) : undefined,
      filter: req.query.filter as string | undefined,
    };
    res.json(await catalog.suggestPerformers(params));
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

// ─── Venues ───────────────────────────────────────────────────────────────────

router.get('/venues/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) throw new ApiError(422, 'VALIDATION_ERROR', 'q query parameter is required');
    const params: SuggestParams = {
      q,
      numberOfSuggestions: req.query.numberOfSuggestions ? Number(req.query.numberOfSuggestions) : undefined,
      filter: req.query.filter as string | undefined,
    };
    res.json(await catalog.suggestVenues(params));
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

// ─── Cities ───────────────────────────────────────────────────────────────────

router.get('/cities/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) throw new ApiError(422, 'VALIDATION_ERROR', 'q query parameter is required');
    const params: SuggestParams = {
      q,
      numberOfSuggestions: req.query.numberOfSuggestions ? Number(req.query.numberOfSuggestions) : undefined,
      filter: req.query.filter as string | undefined,
    };
    res.json(await catalog.suggestCities(params));
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

router.get('/cities/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'City id must be a number');
    res.json(await catalog.getCityById(id));
  } catch (err) { next(err); }
});

// ─── Countries ────────────────────────────────────────────────────────────────

router.get('/countries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: CountryParams = {
      filter: req.query.filter as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getCountries(params));
  } catch (err) { next(err); }
});

router.get('/countries/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    if (!code || code.length < 2) throw new ApiError(422, 'VALIDATION_ERROR', 'Country code is required');
    res.json(await catalog.getCountryByCode(code));
  } catch (err) { next(err); }
});

// ─── State Provinces ──────────────────────────────────────────────────────────

router.get('/stateprovinces', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: StateProvinceParams = {
      filter: req.query.filter as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getStateProvinces(params));
  } catch (err) { next(err); }
});

router.get('/stateprovinces/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'State province id must be a number');
    res.json(await catalog.getStateProvinceById(id));
  } catch (err) { next(err); }
});

// ─── Postal Codes ─────────────────────────────────────────────────────────────

router.get('/postalcodes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: PostalCodeParams = {
      filter: req.query.filter as string | undefined,
      geoFilter: req.query.geoFilter as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    res.json(await catalog.getPostalCodes(params));
  } catch (err) { next(err); }
});

router.get('/postalcodes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Postal code id must be a number');
    res.json(await catalog.getPostalCodeById(id));
  } catch (err) { next(err); }
});

// ─── Global Suggest ───────────────────────────────────────────────────────────

router.get('/search/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) throw new ApiError(422, 'VALIDATION_ERROR', 'q query parameter is required');
    res.json(await catalog.globalSuggest(q, {
      eventsRequested: req.query.eventsRequested ? Number(req.query.eventsRequested) : undefined,
      performersRequested: req.query.performersRequested ? Number(req.query.performersRequested) : undefined,
      venuesRequested: req.query.venuesRequested ? Number(req.query.venuesRequested) : undefined,
      citiesRequested: req.query.citiesRequested ? Number(req.query.citiesRequested) : undefined,
      filter: req.query.filter as string | undefined,
    }));
  } catch (err) { next(err); }
});

export default router;

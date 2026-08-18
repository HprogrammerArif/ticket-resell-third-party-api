import { Router, Request, Response, NextFunction } from 'express';
import * as catalog from '../modules/ticketnetwork/catalog';
import { ApiError } from '../middleware/errorHandler';
import { cacheGet, buildCacheKey } from '../libs/cache';
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

// ─── OData filter helpers (for /events/bulk convenience params) ───────────────

function odataQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function odataAnd(clauses: (string | undefined)[]): string | undefined {
  const parts = clauses.filter((c): c is string => Boolean(c));
  return parts.length > 0 ? parts.join(' and ') : undefined;
}

function odataDate(value: string): string {
  return `${value}T00:00:00Z`;
}

// ─── Cache TTL constants (seconds) ────────────────────────────────────────────

const TTL = {
  CATEGORIES: 60 * 60,        // 60 min  — changes rarely
  EVENTS_LIST: 10 * 60,       // 10 min  — changes moderately
  EVENTS_DETAIL: 15 * 60,     // 15 min  — event details are stable
  PERFORMERS: 30 * 60,        // 30 min  — changes rarely
  VENUES: 60 * 60,            // 60 min  — very stable
  CITIES: 120 * 60,           // 2 hr    — almost never changes
  COUNTRIES: 120 * 60,        // 2 hr
  STATE_PROVINCES: 120 * 60,  // 2 hr
  POSTAL_CODES: 30 * 60,      // 30 min
  SUGGEST: 5 * 60,            // 5 min   — user-input driven
} as const;

// ─── Cache-Control header helpers ─────────────────────────────────────────────

/**
 * Set Cache-Control headers on a response.
 * @param res       Express response object.
 * @param maxAge    Browser/client max-age (seconds).
 * @param sMaxAge   CDN/shared-cache s-maxage (seconds).
 * @param swr       stale-while-revalidate window (seconds).
 */
function setCache(res: Response, maxAge: number, sMaxAge: number, swr = 60): void {
  res.set(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  );
}

// ─── Categories ───────────────────────────────────────────────────────────────

router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: CategoryParams = {
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      hasEvents: req.query.hasEvents === 'true',
    };
    const key = buildCacheKey('categories', params);
    const data = await cacheGet(key, TTL.CATEGORIES, () => catalog.getCategories(params));
    setCache(res, 300, TTL.CATEGORIES, 120);
    res.json(data);
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
    const key = buildCacheKey(`categories/${categoryPath}`, params);
    const data = await cacheGet(key, TTL.CATEGORIES, () => catalog.getCategoryByPath(categoryPath, params));
    setCache(res, 300, TTL.CATEGORIES, 120);
    res.json(data);
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
    const key = buildCacheKey('categoryhierarchies', params);
    const data = await cacheGet(key, TTL.CATEGORIES, () => catalog.getCategoryHierarchies(params));
    setCache(res, 300, TTL.CATEGORIES, 120);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/categoryhierarchies/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Hierarchy id must be a number');
    const key = `categoryhierarchies/${id}`;
    const data = await cacheGet(key, TTL.CATEGORIES, () => catalog.getCategoryHierarchyById(id));
    setCache(res, 300, TTL.CATEGORIES, 120);
    res.json(data);
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
    const key = buildCacheKey('events/search', params);
    const data = await cacheGet(key, TTL.EVENTS_LIST, () => catalog.searchEvents(params));
    setCache(res, 60, TTL.EVENTS_LIST, 60);
    res.json(data);
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
    const key = buildCacheKey('events/suggest', params);
    const data = await cacheGet(key, TTL.SUGGEST, () => catalog.suggestEvents(params));
    setCache(res, 60, TTL.SUGGEST, 30);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/events/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Build OData filter from convenience params (same helpers as /events)
    const city = req.query.city as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const keyword = req.query.keyword as string | undefined;

    const clauses: (string | undefined)[] = [
      // Exclude expired events
      `takedownAt ge ${new Date().toISOString()}`,
      city ? `city/text/name eq ${odataQuote(city)}` : undefined,
      dateFrom ? `date/date ge ${odataDate(dateFrom)}` : undefined,
      dateTo ? `date/date le ${odataDate(dateTo)}` : undefined,
      keyword ? `contains(text/name,${odataQuote(keyword)})` : undefined,
      // Allow raw filter passthrough too
      req.query.filter as string | undefined,
    ];
    const mergedFilter = odataAnd(clauses);

    const categoryPath = req.query.categoryPath as string | undefined;

    const params: EventBulkParams = {
      filter: mergedFilter,
      categoryFilter: categoryPath
        ? `path eq ${odataQuote(categoryPath)}`
        : (req.query.categoryFilter as string | undefined),
      performerFilter: req.query.performerFilter as string | undefined,
      geoFilter: req.query.geoFilter as string | undefined,
      timeOfDayFilter: req.query.timeOfDayFilter as string | undefined,
      sort: req.query.sort as string | undefined,
      fields: req.query.fields as string | undefined,
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    const key = buildCacheKey('events/bulk', params);
    const data = await cacheGet(key, TTL.EVENTS_LIST, () => catalog.bulkEvents(params));
    setCache(res, 60, TTL.EVENTS_LIST, 60);
    res.json(data);
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
    const key = buildCacheKey('events', params);
    const data = await cacheGet(key, TTL.EVENTS_LIST, () => catalog.getEvents(params));
    setCache(res, 60, TTL.EVENTS_LIST, 60);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Event id must be a number');
    const key = `events/${id}`;
    const data = await cacheGet(key, TTL.EVENTS_DETAIL, () => catalog.getEventById(id));
    setCache(res, 120, TTL.EVENTS_DETAIL, 120);
    res.json(data);
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
    const key = buildCacheKey('performers/suggest', params);
    const data = await cacheGet(key, TTL.SUGGEST, () => catalog.suggestPerformers(params));
    setCache(res, 60, TTL.SUGGEST, 30);
    res.json(data);
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
    const key = buildCacheKey('performers', params);
    const data = await cacheGet(key, TTL.PERFORMERS, () => catalog.getPerformers(params));
    setCache(res, 300, TTL.PERFORMERS, 120);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/performers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Performer id must be a number');
    const key = `performers/${id}`;
    const data = await cacheGet(key, TTL.PERFORMERS, () => catalog.getPerformerById(id));
    setCache(res, 300, TTL.PERFORMERS, 120);
    res.json(data);
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
    const key = buildCacheKey('venues/suggest', params);
    const data = await cacheGet(key, TTL.SUGGEST, () => catalog.suggestVenues(params));
    setCache(res, 60, TTL.SUGGEST, 30);
    res.json(data);
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
    const key = buildCacheKey('venues', params);
    const data = await cacheGet(key, TTL.VENUES, () => catalog.getVenues(params));
    setCache(res, 300, TTL.VENUES, 120);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/venues/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Venue id must be a number');
    const key = `venues/${id}`;
    const data = await cacheGet(key, TTL.VENUES, () => catalog.getVenueById(id));
    setCache(res, 300, TTL.VENUES, 120);
    res.json(data);
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
    const key = buildCacheKey('cities/suggest', params);
    const data = await cacheGet(key, TTL.SUGGEST, () => catalog.suggestCities(params));
    setCache(res, 60, TTL.SUGGEST, 30);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/cities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: CityParams = {
      stateProvince: req.query.stateProvince as string | undefined,
      country: req.query.country as string | undefined,
      hasEvents: req.query.hasEvents === 'true',
      pageNumber: req.query.pageNumber ? Number(req.query.pageNumber) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    const key = buildCacheKey('cities', params);
    const data = await cacheGet(key, TTL.CITIES, () => catalog.getCities(params));
    setCache(res, 600, TTL.CITIES, 300);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/cities/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'City id must be a number');
    const key = `cities/${id}`;
    const data = await cacheGet(key, TTL.CITIES, () => catalog.getCityById(id));
    setCache(res, 600, TTL.CITIES, 300);
    res.json(data);
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
    const key = buildCacheKey('countries', params);
    const data = await cacheGet(key, TTL.COUNTRIES, () => catalog.getCountries(params));
    setCache(res, 600, TTL.COUNTRIES, 300);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/countries/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    if (!code || code.length < 2) throw new ApiError(422, 'VALIDATION_ERROR', 'Country code is required');
    const key = `countries/${code}`;
    const data = await cacheGet(key, TTL.COUNTRIES, () => catalog.getCountryByCode(code));
    setCache(res, 600, TTL.COUNTRIES, 300);
    res.json(data);
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
    const key = buildCacheKey('stateprovinces', params);
    const data = await cacheGet(key, TTL.STATE_PROVINCES, () => catalog.getStateProvinces(params));
    setCache(res, 600, TTL.STATE_PROVINCES, 300);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/stateprovinces/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'State province id must be a number');
    const key = `stateprovinces/${id}`;
    const data = await cacheGet(key, TTL.STATE_PROVINCES, () => catalog.getStateProvinceById(id));
    setCache(res, 600, TTL.STATE_PROVINCES, 300);
    res.json(data);
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
    const key = buildCacheKey('postalcodes', params);
    const data = await cacheGet(key, TTL.POSTAL_CODES, () => catalog.getPostalCodes(params));
    setCache(res, 300, TTL.POSTAL_CODES, 120);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/postalcodes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new ApiError(422, 'VALIDATION_ERROR', 'Postal code id must be a number');
    const key = `postalcodes/${id}`;
    const data = await cacheGet(key, TTL.POSTAL_CODES, () => catalog.getPostalCodeById(id));
    setCache(res, 300, TTL.POSTAL_CODES, 120);
    res.json(data);
  } catch (err) { next(err); }
});

// ─── Global Suggest ───────────────────────────────────────────────────────────

router.get('/search/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) throw new ApiError(422, 'VALIDATION_ERROR', 'q query parameter is required');
    const suggestParams = {
      eventsRequested: req.query.eventsRequested ? Number(req.query.eventsRequested) : undefined,
      performersRequested: req.query.performersRequested ? Number(req.query.performersRequested) : undefined,
      venuesRequested: req.query.venuesRequested ? Number(req.query.venuesRequested) : undefined,
      citiesRequested: req.query.citiesRequested ? Number(req.query.citiesRequested) : undefined,
      filter: req.query.filter as string | undefined,
    };
    const key = buildCacheKey(`search/suggest/${q}`, suggestParams);
    const data = await cacheGet(key, TTL.SUGGEST, () => catalog.globalSuggest(q, suggestParams));
    setCache(res, 60, TTL.SUGGEST, 30);
    res.json(data);
  } catch (err) { next(err); }
});

export default router;

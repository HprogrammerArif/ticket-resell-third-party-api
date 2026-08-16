/**
 * CachedCatalogApi
 *
 * Wraps every CatalogApi function with Next.js `unstable_cache` so that
 * responses are stored in the Next.js Data Cache and reused across requests
 * without hitting the backend again.
 *
 * TTLs (revalidate seconds) are chosen to balance freshness vs. performance:
 *
 *  | Data type         | TTL    | Reason                          |
 *  |-------------------|--------|---------------------------------|
 *  | Categories        | 1800s  | Changes rarely                  |
 *  | Events (list)     | 300s   | Moderately dynamic              |
 *  | Event (detail)    | 600s   | Individual events are stable    |
 *  | Performers        | 900s   | Changes rarely                  |
 *  | Venues            | 1800s  | Very stable                     |
 *  | Cities            | 3600s  | Almost never changes            |
 *  | Countries         | 3600s  | Almost never changes            |
 *  | State provinces   | 3600s  | Almost never changes            |
 *  | Suggest           | 120s   | User-input driven, short TTL    |
 */

import { unstable_cache } from 'next/cache';
import * as CatalogApi from '@/libs/CatalogApi';
import type {
  EventParams,
  PerformerParams,
  VenueParams,
  CityParams,
  CategoryHierarchyParams,
  CountryParams,
  StateProvinceParams,
  PostalCodeParams,
  SuggestParams,
  EventSuggestParams,
  EventBulkParams,
  GlobalSuggestParams,
} from '@/types/Catalog';

// ─── TTL constants (seconds) ──────────────────────────────────────────────────

const TTL = {
  CATEGORIES: 1800,    // 30 min
  EVENTS_LIST: 300,    // 5 min
  EVENTS_DETAIL: 600,  // 10 min
  PERFORMERS: 900,     // 15 min
  VENUES: 1800,        // 30 min
  CITIES: 3600,        // 60 min
  COUNTRIES: 3600,     // 60 min
  STATE_PROVINCES: 3600,
  POSTAL_CODES: 1800,
  SUGGEST: 120,        // 2 min
} as const;

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = unstable_cache(
  CatalogApi.getCategories,
  ['catalog-categories'],
  { revalidate: TTL.CATEGORIES, tags: ['catalog', 'categories'] },
);

export const getCategoryByPath = unstable_cache(
  CatalogApi.getCategoryByPath,
  ['catalog-category-by-path'],
  { revalidate: TTL.CATEGORIES, tags: ['catalog', 'categories'] },
);

// ─── Category Hierarchies ─────────────────────────────────────────────────────

export const getCategoryHierarchies = unstable_cache(
  (params?: CategoryHierarchyParams) => CatalogApi.getCategoryHierarchies(params),
  ['catalog-category-hierarchies'],
  { revalidate: TTL.CATEGORIES, tags: ['catalog', 'categories'] },
);

export const getCategoryHierarchyById = unstable_cache(
  (id: number) => CatalogApi.getCategoryHierarchyById(id),
  ['catalog-category-hierarchy-by-id'],
  { revalidate: TTL.CATEGORIES, tags: ['catalog', 'categories'] },
);

// ─── Events ───────────────────────────────────────────────────────────────────

export const getEvents = unstable_cache(
  (params?: EventParams) => CatalogApi.getEvents(params),
  ['catalog-events'],
  { revalidate: TTL.EVENTS_LIST, tags: ['catalog', 'events'] },
);

export const searchEvents = unstable_cache(
  (params?: EventParams) => CatalogApi.searchEvents(params),
  ['catalog-events-search'],
  { revalidate: TTL.EVENTS_LIST, tags: ['catalog', 'events'] },
);

export const getEventById = unstable_cache(
  (id: number) => CatalogApi.getEventById(id),
  ['catalog-event-by-id'],
  { revalidate: TTL.EVENTS_DETAIL, tags: ['catalog', 'events'] },
);

export const suggestEvents = unstable_cache(
  (params: EventSuggestParams) => CatalogApi.suggestEvents(params),
  ['catalog-events-suggest'],
  { revalidate: TTL.SUGGEST, tags: ['catalog', 'events', 'suggest'] },
);

export const bulkEvents = unstable_cache(
  (params?: EventBulkParams) => CatalogApi.bulkEvents(params),
  ['catalog-events-bulk'],
  { revalidate: TTL.EVENTS_LIST, tags: ['catalog', 'events'] },
);

// ─── Performers ───────────────────────────────────────────────────────────────

export const getPerformers = unstable_cache(
  (params?: PerformerParams) => CatalogApi.getPerformers(params),
  ['catalog-performers'],
  { revalidate: TTL.PERFORMERS, tags: ['catalog', 'performers'] },
);

export const getPerformerById = unstable_cache(
  (id: number) => CatalogApi.getPerformerById(id),
  ['catalog-performer-by-id'],
  { revalidate: TTL.PERFORMERS, tags: ['catalog', 'performers'] },
);

export const suggestPerformers = unstable_cache(
  (params: SuggestParams) => CatalogApi.suggestPerformers(params),
  ['catalog-performers-suggest'],
  { revalidate: TTL.SUGGEST, tags: ['catalog', 'performers', 'suggest'] },
);

// ─── Venues ───────────────────────────────────────────────────────────────────

export const getVenues = unstable_cache(
  (params?: VenueParams) => CatalogApi.getVenues(params),
  ['catalog-venues'],
  { revalidate: TTL.VENUES, tags: ['catalog', 'venues'] },
);

export const getVenueById = unstable_cache(
  (id: number) => CatalogApi.getVenueById(id),
  ['catalog-venue-by-id'],
  { revalidate: TTL.VENUES, tags: ['catalog', 'venues'] },
);

export const suggestVenues = unstable_cache(
  (params: SuggestParams) => CatalogApi.suggestVenues(params),
  ['catalog-venues-suggest'],
  { revalidate: TTL.SUGGEST, tags: ['catalog', 'venues', 'suggest'] },
);

// ─── Cities ───────────────────────────────────────────────────────────────────

export const getCities = unstable_cache(
  (params?: CityParams) => CatalogApi.getCities(params),
  ['catalog-cities'],
  { revalidate: TTL.CITIES, tags: ['catalog', 'cities'] },
);

export const getCityById = unstable_cache(
  (id: number) => CatalogApi.getCityById(id),
  ['catalog-city-by-id'],
  { revalidate: TTL.CITIES, tags: ['catalog', 'cities'] },
);

export const suggestCities = unstable_cache(
  (params: SuggestParams) => CatalogApi.suggestCities(params),
  ['catalog-cities-suggest'],
  { revalidate: TTL.SUGGEST, tags: ['catalog', 'cities', 'suggest'] },
);

// ─── Countries ────────────────────────────────────────────────────────────────

export const getCountries = unstable_cache(
  (params?: CountryParams) => CatalogApi.getCountries(params),
  ['catalog-countries'],
  { revalidate: TTL.COUNTRIES, tags: ['catalog', 'countries'] },
);

export const getCountryByCode = unstable_cache(
  (code: string) => CatalogApi.getCountryByCode(code),
  ['catalog-country-by-code'],
  { revalidate: TTL.COUNTRIES, tags: ['catalog', 'countries'] },
);

// ─── State Provinces ──────────────────────────────────────────────────────────

export const getStateProvinces = unstable_cache(
  (params?: StateProvinceParams) => CatalogApi.getStateProvinces(params),
  ['catalog-state-provinces'],
  { revalidate: TTL.STATE_PROVINCES, tags: ['catalog', 'stateprovinces'] },
);

export const getStateProvinceById = unstable_cache(
  (id: number) => CatalogApi.getStateProvinceById(id),
  ['catalog-state-province-by-id'],
  { revalidate: TTL.STATE_PROVINCES, tags: ['catalog', 'stateprovinces'] },
);

// ─── Postal Codes ─────────────────────────────────────────────────────────────

export const getPostalCodes = unstable_cache(
  (params?: PostalCodeParams) => CatalogApi.getPostalCodes(params),
  ['catalog-postal-codes'],
  { revalidate: TTL.POSTAL_CODES, tags: ['catalog', 'postalcodes'] },
);

export const getPostalCodeById = unstable_cache(
  (id: number) => CatalogApi.getPostalCodeById(id),
  ['catalog-postal-code-by-id'],
  { revalidate: TTL.POSTAL_CODES, tags: ['catalog', 'postalcodes'] },
);

// ─── Global Suggest ───────────────────────────────────────────────────────────

export const globalSuggest = unstable_cache(
  (q: string, params?: GlobalSuggestParams) => CatalogApi.globalSuggest(q, params),
  ['catalog-global-suggest'],
  { revalidate: TTL.SUGGEST, tags: ['catalog', 'suggest'] },
);

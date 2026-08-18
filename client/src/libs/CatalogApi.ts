import { ApiClient } from '@/libs/ApiClient';
import type {
  TnPagedResult,
  TnCategory,
  TnEvent,
  TnPerformer,
  TnVenue,
  TnCity,
  TnCategoryHierarchy,
  TnCountry,
  TnStateProvince,
  TnPostalCode,
  TnSuggestResult,
  TnSuggestGroup,
  TnEventSuggest,
  TnPerformerSuggest,
  TnVenueSuggest,
  TnCitySuggest,
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

function toParams(obj: Record<string, string | number | boolean | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = String(v);
  }
  return out;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(
  params?: { pageNumber?: number; pageSize?: number; hasEvents?: boolean },
): Promise<TnPagedResult<TnCategory>> {
  return ApiClient.get('/api/catalog/categories', {
    params: toParams({
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
      hasEvents: params?.hasEvents,
    }),
  });
}

export async function getCategoryByPath(
  path: string,
  params?: { pageNumber?: number; pageSize?: number },
): Promise<TnCategory> {
  return ApiClient.get(`/api/catalog/categories/${path}`, {
    params: toParams({ pageNumber: params?.pageNumber, pageSize: params?.pageSize }),
  });
}

// ─── Category Hierarchies ─────────────────────────────────────────────────────

export async function getCategoryHierarchies(
  params?: CategoryHierarchyParams,
): Promise<TnPagedResult<TnCategoryHierarchy>> {
  return ApiClient.get('/api/catalog/categoryhierarchies', {
    params: toParams({
      filter: params?.filter,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function getCategoryHierarchyById(id: number): Promise<TnCategoryHierarchy> {
  return ApiClient.get(`/api/catalog/categoryhierarchies/${id}`, { params: {} });
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(params?: EventParams): Promise<TnPagedResult<TnEvent>> {
  return ApiClient.get('/api/catalog/events', {
    params: toParams({
      keyword: params?.keyword,
      categoryPath: params?.categoryPath,
      city: params?.city,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function searchEvents(params?: EventParams): Promise<TnPagedResult<TnEvent>> {
  return ApiClient.get('/api/catalog/events/search', {
    params: toParams({
      keyword: params?.keyword,
      categoryPath: params?.categoryPath,
      city: params?.city,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function getEventById(id: number): Promise<TnEvent> {
  return ApiClient.get(`/api/catalog/events/${id}`, { params: {} });
}

export async function suggestEvents(params: EventSuggestParams): Promise<TnSuggestGroup<TnEventSuggest>> {
  return ApiClient.get('/api/catalog/events/suggest', {
    params: toParams({
      q: params.q,
      numberOfSuggestions: params.numberOfSuggestions,
      includeVenueInfo: params.includeVenueInfo,
      filter: params.filter,
    }),
  });
}

export async function bulkEvents(params?: EventBulkParams): Promise<TnPagedResult<TnEvent>> {
  return ApiClient.get('/api/catalog/events/bulk', {
    params: toParams({
      filter: params?.filter,
      categoryFilter: params?.categoryFilter,
      performerFilter: params?.performerFilter,
      geoFilter: params?.geoFilter,
      timeOfDayFilter: params?.timeOfDayFilter,
      sort: params?.sort,
      fields: params?.fields,
      keyword: params?.keyword,
      city: params?.city,
      categoryPath: params?.categoryPath,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

// ─── Performers ───────────────────────────────────────────────────────────────

export async function getPerformers(
  params?: PerformerParams,
): Promise<TnPagedResult<TnPerformer>> {
  return ApiClient.get('/api/catalog/performers', {
    params: toParams({
      keyword: params?.keyword,
      categoryPath: params?.categoryPath,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function getPerformerById(id: number): Promise<TnPerformer> {
  return ApiClient.get(`/api/catalog/performers/${id}`, { params: {} });
}

export async function suggestPerformers(params: SuggestParams): Promise<TnSuggestGroup<TnPerformerSuggest>> {
  return ApiClient.get('/api/catalog/performers/suggest', {
    params: toParams({
      q: params.q,
      numberOfSuggestions: params.numberOfSuggestions,
      filter: params.filter,
    }),
  });
}

// ─── Venues ───────────────────────────────────────────────────────────────────

export async function getVenues(params?: VenueParams): Promise<TnPagedResult<TnVenue>> {
  return ApiClient.get('/api/catalog/venues', {
    params: toParams({
      city: params?.city,
      stateProvince: params?.stateProvince,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function getVenueById(id: number): Promise<TnVenue> {
  return ApiClient.get(`/api/catalog/venues/${id}`, { params: {} });
}

export async function suggestVenues(params: SuggestParams): Promise<TnSuggestGroup<TnVenueSuggest>> {
  return ApiClient.get('/api/catalog/venues/suggest', {
    params: toParams({
      q: params.q,
      numberOfSuggestions: params.numberOfSuggestions,
      filter: params.filter,
    }),
  });
}

// ─── Cities ───────────────────────────────────────────────────────────────────

export async function getCities(params?: CityParams): Promise<TnPagedResult<TnCity>> {
  return ApiClient.get('/api/catalog/cities', {
    params: toParams({
      stateProvince: params?.stateProvince,
      country: params?.country,
      hasEvents: params?.hasEvents,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function getCityById(id: number): Promise<TnCity> {
  return ApiClient.get(`/api/catalog/cities/${id}`, { params: {} });
}

export async function suggestCities(params: SuggestParams): Promise<TnSuggestGroup<TnCitySuggest>> {
  return ApiClient.get('/api/catalog/cities/suggest', {
    params: toParams({
      q: params.q,
      numberOfSuggestions: params.numberOfSuggestions,
      filter: params.filter,
    }),
  });
}

// ─── Countries ────────────────────────────────────────────────────────────────

export async function getCountries(params?: CountryParams): Promise<TnPagedResult<TnCountry>> {
  return ApiClient.get('/api/catalog/countries', {
    params: toParams({
      filter: params?.filter,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function getCountryByCode(code: string): Promise<TnCountry> {
  return ApiClient.get(`/api/catalog/countries/${code}`, { params: {} });
}

// ─── State Provinces ──────────────────────────────────────────────────────────

export async function getStateProvinces(params?: StateProvinceParams): Promise<TnPagedResult<TnStateProvince>> {
  return ApiClient.get('/api/catalog/stateprovinces', {
    params: toParams({
      filter: params?.filter,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function getStateProvinceById(id: number): Promise<TnStateProvince> {
  return ApiClient.get(`/api/catalog/stateprovinces/${id}`, { params: {} });
}

// ─── Postal Codes ─────────────────────────────────────────────────────────────

export async function getPostalCodes(params?: PostalCodeParams): Promise<TnPagedResult<TnPostalCode>> {
  return ApiClient.get('/api/catalog/postalcodes', {
    params: toParams({
      filter: params?.filter,
      geoFilter: params?.geoFilter,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function getPostalCodeById(id: number): Promise<TnPostalCode> {
  return ApiClient.get(`/api/catalog/postalcodes/${id}`, { params: {} });
}

// ─── Global Suggest ───────────────────────────────────────────────────────────

export async function globalSuggest(q: string, params?: GlobalSuggestParams): Promise<TnSuggestResult> {
  return ApiClient.get('/api/catalog/search/suggest', {
    params: toParams({
      q,
      eventsRequested: params?.eventsRequested,
      performersRequested: params?.performersRequested,
      venuesRequested: params?.venuesRequested,
      citiesRequested: params?.citiesRequested,
      filter: params?.filter,
    }),
  });
}

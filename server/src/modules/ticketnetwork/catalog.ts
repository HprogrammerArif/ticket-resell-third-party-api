import { tnRequest } from './client';
import type {
  TnPagedResult,
  TnCategory, CategoryParams,
  TnEvent, EventParams,
  TnPerformer, PerformerParams,
  TnVenue, VenueParams,
  TnCity, CityParams,
  TnSuggestResult, GlobalSuggestParams,
  TnCategoryHierarchy, CategoryHierarchyParams,
  TnCountry, CountryParams,
  TnStateProvince, StateProvinceParams,
  TnPostalCode, PostalCodeParams,
  TnSuggestGroup,
  TnEventSuggest, EventSuggestParams,
  TnPerformerSuggest, SuggestParams,
  TnVenueSuggest,
  TnCitySuggest,
  EventBulkParams,
} from './types';

function opts(p: Record<string, unknown>): { params?: Record<string, string | number> } {
  const filtered = Object.fromEntries(
    Object.entries(p).filter(([, v]) => typeof v === 'string' || typeof v === 'number'),
  ) as Record<string, string | number>;
  return Object.keys(filtered).length > 0 ? { params: filtered } : {};
}

// --- Categories ---
export function getCategories(params: CategoryParams = {}): Promise<TnPagedResult<TnCategory>> {
  return tnRequest<TnPagedResult<TnCategory>>('/categories', opts(params));
}

export function getCategoryByPath(path: string, params: CategoryParams = {}): Promise<TnCategory> {
  return tnRequest<TnCategory>(`/categories/${path}`, opts(params));
}

// --- Category Hierarchies ---
export function getCategoryHierarchies(params: CategoryHierarchyParams = {}): Promise<TnPagedResult<TnCategoryHierarchy>> {
  return tnRequest<TnPagedResult<TnCategoryHierarchy>>('/categoryhierarchies', opts(params));
}

export function getCategoryHierarchyById(id: number): Promise<TnCategoryHierarchy> {
  return tnRequest<TnCategoryHierarchy>(`/categoryhierarchies/${id}`, {});
}

// --- Events ---
export function getEvents(params: EventParams = {}): Promise<TnPagedResult<TnEvent>> {
  return tnRequest<TnPagedResult<TnEvent>>('/events', opts(params));
}

export function getEventById(id: number): Promise<TnEvent> {
  return tnRequest<TnEvent>(`/events/${id}`, {});
}

export function searchEvents(params: EventParams = {}): Promise<TnPagedResult<TnEvent>> {
  return tnRequest<TnPagedResult<TnEvent>>('/events/search', opts(params));
}

export function suggestEvents(params: EventSuggestParams): Promise<TnSuggestGroup<TnEventSuggest>> {
  return tnRequest<TnSuggestGroup<TnEventSuggest>>('/events/suggest', opts(params));
}

export function bulkEvents(params: EventBulkParams = {}): Promise<TnPagedResult<TnEvent>> {
  return tnRequest<TnPagedResult<TnEvent>>('/events/bulk', opts(params));
}

// --- Performers ---
export function getPerformers(params: PerformerParams = {}): Promise<TnPagedResult<TnPerformer>> {
  return tnRequest<TnPagedResult<TnPerformer>>('/performers', opts(params));
}

export function getPerformerById(id: number): Promise<TnPerformer> {
  return tnRequest<TnPerformer>(`/performers/${id}`, {});
}

export function suggestPerformers(params: SuggestParams): Promise<TnSuggestGroup<TnPerformerSuggest>> {
  return tnRequest<TnSuggestGroup<TnPerformerSuggest>>('/performers/suggest', opts(params));
}

// --- Venues ---
export function getVenues(params: VenueParams = {}): Promise<TnPagedResult<TnVenue>> {
  return tnRequest<TnPagedResult<TnVenue>>('/venues', opts(params));
}

export function getVenueById(id: number): Promise<TnVenue> {
  return tnRequest<TnVenue>(`/venues/${id}`, {});
}

export function suggestVenues(params: SuggestParams): Promise<TnSuggestGroup<TnVenueSuggest>> {
  return tnRequest<TnSuggestGroup<TnVenueSuggest>>('/venues/suggest', opts(params));
}

// --- Cities ---
export function getCities(params: CityParams = {}): Promise<TnPagedResult<TnCity>> {
  return tnRequest<TnPagedResult<TnCity>>('/cities', opts(params));
}

export function getCityById(id: number): Promise<TnCity> {
  return tnRequest<TnCity>(`/cities/${id}`, {});
}

export function suggestCities(params: SuggestParams): Promise<TnSuggestGroup<TnCitySuggest>> {
  return tnRequest<TnSuggestGroup<TnCitySuggest>>('/cities/suggest', opts(params));
}

// --- Countries ---
export function getCountries(params: CountryParams = {}): Promise<TnPagedResult<TnCountry>> {
  return tnRequest<TnPagedResult<TnCountry>>('/countries', opts(params));
}

export function getCountryByCode(code: string): Promise<TnCountry> {
  return tnRequest<TnCountry>(`/countries/${code}`, {});
}

// --- State Provinces ---
export function getStateProvinces(params: StateProvinceParams = {}): Promise<TnPagedResult<TnStateProvince>> {
  return tnRequest<TnPagedResult<TnStateProvince>>('/stateProvinces', opts(params));
}

export function getStateProvinceById(id: number): Promise<TnStateProvince> {
  return tnRequest<TnStateProvince>(`/stateProvinces/${id}`, {});
}

// --- Postal Codes ---
export function getPostalCodes(params: PostalCodeParams = {}): Promise<TnPagedResult<TnPostalCode>> {
  return tnRequest<TnPagedResult<TnPostalCode>>('/postalCodes', opts(params));
}

export function getPostalCodeById(id: number): Promise<TnPostalCode> {
  return tnRequest<TnPostalCode>(`/postalCodes/${id}`, {});
}

// --- Global Suggest ---
export function globalSuggest(query: string, params: Omit<GlobalSuggestParams, 'q'> = {}): Promise<TnSuggestResult> {
  return tnRequest<TnSuggestResult>('/suggest', opts({ q: query, ...params }));
}

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

// TicketNetwork's actual query params are `page`/`perPage`, not our internal
// `pageNumber`/`pageSize` names — sending the wrong names means TN silently
// ignores them and falls back to its own defaults (page 1, 50 per page) every
// time. `includeTotalCount` is opt-in on TN's side (omitted otherwise), so it's
// requested whenever pagination is in play, since our UI's page counts depend on it.
function opts(p: Record<string, unknown>): { params?: Record<string, string | number> } {
  const filtered: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(p)) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    if (key === 'pageNumber') { filtered.page = value; continue; }
    if (key === 'pageSize') { filtered.perPage = value; continue; }
    filtered[key] = value;
  }
  if ('page' in filtered || 'perPage' in filtered) filtered.includeTotalCount = 'true';
  return Object.keys(filtered).length > 0 ? { params: filtered } : {};
}

// TN's list/search endpoints (`/events`, `/events/search`, `/performers`, `/venues`,
// `/cities`) don't accept flat params like `categoryPath`/`city`/`stateProvince`/
// `country`/`dateFrom`/`dateTo`/`performerId`/`venueId` at all — they only support
// OData-style `filter`/`categoryFilter`/`performerFilter` strings. TN silently ignores
// unrecognized params, so every one of these was a no-op filter that looked like it
// worked (a result grid still rendered) while quietly returning unfiltered data.
function odataQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function odataAnd(clauses: (string | undefined)[]): string | undefined {
  const parts = clauses.filter((c): c is string => Boolean(c));
  return parts.length > 0 ? parts.join(' and ') : undefined;
}

// `date/date` is Edm.DateTimeOffset on TN's side (confirmed via their own OData
// validation error), not Edm.String — DateTimeOffset literals are unquoted.
function odataDate(value: string): string {
  return `${value}T00:00:00Z`;
}

function eventQuery(params: EventParams): Record<string, string | number | undefined> {
  const filter = odataAnd([
    params.city ? `city/text/name eq ${odataQuote(params.city)}` : undefined,
    params.venueId !== undefined ? `venue/id eq ${params.venueId}` : undefined,
    params.dateFrom ? `date/date ge ${odataDate(params.dateFrom)}` : undefined,
    params.dateTo ? `date/date le ${odataDate(params.dateTo)}` : undefined,
  ]);
  return {
    filter,
    categoryFilter: params.categoryPath ? `path eq ${odataQuote(params.categoryPath)}` : undefined,
    performerFilter: params.performerId !== undefined ? `id eq ${params.performerId}` : undefined,
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
  };
}

function performerQuery(params: PerformerParams): Record<string, string | number | undefined> {
  return {
    categoryFilter: params.categoryPath ? `path eq ${odataQuote(params.categoryPath)}` : undefined,
    filter: params.keyword ? `contains(text/name,${odataQuote(params.keyword)})` : undefined,
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
  };
}

function venueQuery(params: VenueParams): Record<string, string | number | undefined> {
  const filter = odataAnd([
    params.city ? `city/text/name eq ${odataQuote(params.city)}` : undefined,
    params.stateProvince ? `stateProvince/text/name eq ${odataQuote(params.stateProvince)}` : undefined,
  ]);
  return { filter, pageNumber: params.pageNumber, pageSize: params.pageSize };
}

function cityQuery(params: CityParams): Record<string, string | number | undefined> {
  const filter = odataAnd([
    params.stateProvince ? `stateProvince/text/name eq ${odataQuote(params.stateProvince)}` : undefined,
    params.country ? `country/text/name eq ${odataQuote(params.country)}` : undefined,
  ]);
  return { filter, pageNumber: params.pageNumber, pageSize: params.pageSize };
}

// --- Categories ---
export function getCategories(params: CategoryParams = {}): Promise<TnPagedResult<TnCategory>> {
  const filter = params.hasEvents ? '_metadata/hasEvents eq true' : undefined;
  return tnRequest<TnPagedResult<TnCategory>>('/categories', opts({
    filter,
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
  }));
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
  return tnRequest<TnPagedResult<TnEvent>>('/events', opts(eventQuery(params)));
}

export function getEventById(id: number): Promise<TnEvent> {
  return tnRequest<TnEvent>(`/events/${id}`, {});
}

export function searchEvents(params: EventParams = {}): Promise<TnPagedResult<TnEvent>> {
  // TN's /events/search requires the search term as `q` (required on their side) —
  // our EventParams calls it `keyword`, which TN doesn't recognize, so every call
  // was silently missing its required param and got rejected with 400.
  return tnRequest<TnPagedResult<TnEvent>>('/events/search', opts({ ...eventQuery(params), q: params.keyword }));
}

export function suggestEvents(params: EventSuggestParams): Promise<TnSuggestGroup<TnEventSuggest>> {
  return tnRequest<TnSuggestGroup<TnEventSuggest>>('/events/suggest', opts(params));
}

export function bulkEvents(params: EventBulkParams = {}): Promise<TnPagedResult<TnEvent>> {
  return tnRequest<TnPagedResult<TnEvent>>('/events/bulk', opts(params));
}

// --- Performers ---
export function getPerformers(params: PerformerParams = {}): Promise<TnPagedResult<TnPerformer>> {
  return tnRequest<TnPagedResult<TnPerformer>>('/performers', opts(performerQuery(params)));
}

export function getPerformerById(id: number): Promise<TnPerformer> {
  return tnRequest<TnPerformer>(`/performers/${id}`, {});
}

export function suggestPerformers(params: SuggestParams): Promise<TnSuggestGroup<TnPerformerSuggest>> {
  return tnRequest<TnSuggestGroup<TnPerformerSuggest>>('/performers/suggest', opts(params));
}

// --- Venues ---
export function getVenues(params: VenueParams = {}): Promise<TnPagedResult<TnVenue>> {
  return tnRequest<TnPagedResult<TnVenue>>('/venues', opts(venueQuery(params)));
}

export function getVenueById(id: number): Promise<TnVenue> {
  return tnRequest<TnVenue>(`/venues/${id}`, {});
}

export function suggestVenues(params: SuggestParams): Promise<TnSuggestGroup<TnVenueSuggest>> {
  return tnRequest<TnSuggestGroup<TnVenueSuggest>>('/venues/suggest', opts(params));
}

// --- Cities ---
export function getCities(params: CityParams = {}): Promise<TnPagedResult<TnCity>> {
  return tnRequest<TnPagedResult<TnCity>>('/cities', opts(cityQuery(params)));
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
  // TN omits each results group (events/performers/venues/cities) from the response
  // entirely unless its *Requested count is explicitly passed — without these, TN
  // returns a bare `{}`, and any caller reading e.g. `.performers.results` crashes.
  return tnRequest<TnSuggestResult>('/suggest', opts({
    q: query,
    eventsRequested: params.eventsRequested ?? 5,
    performersRequested: params.performersRequested ?? 5,
    venuesRequested: params.venuesRequested ?? 5,
    citiesRequested: params.citiesRequested ?? 5,
    filter: params.filter,
  }));
}

// TN OAuth2 token response (snake_case — standard OAuth2)
export interface TnTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// TN API error body on 4xx responses
export interface TnFault {
  code: string;
  message: string;
  description?: string;
}
export interface TnErrorBody {
  fault?: TnFault;
}

// Shared paged result wrapper (PagedResultSet from TN CatalogAPI v2)
export interface TnPagedResult<T> {
  page: number;
  count: number;
  totalCount: number;
  results: T[];
}

// Shared pagination params
export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

// --- Categories ---
export interface TnCategoryText {
  name: string;
}
export interface TnCategory {
  path: string;
  salesRank?: number;
  depth?: number;
  text: TnCategoryText;
  hierarchy?: { id: number; name: string; usages?: string[] };
  parentCategory?: { path: string };
  _metadata?: {
    ticketCount: number;
    hasTickets: boolean;
    eventCount: number;
    hasEvents: boolean;
  };
}
export interface CategoryParams extends PaginationParams {
  // Only categories TN reports as actually having events — most categories in a
  // real hierarchy (e.g. "Performer role": Headliner/Opener/Home Team) structurally
  // never have events attached and lead to dead-end pages if shown as browsable.
  hasEvents?: boolean;
}

// --- Events ---
export interface TnEventDate {
  datetime?: string;
  date?: string;
  time?: string;
  datetimeOffset?: string;
}
export interface TnEventText {
  name: string;
}
export interface TnVenueEmbedded {
  id?: number;
  text?: { name: string };
}
export interface TnPerformerEmbedded {
  id?: number;
  text?: { name: string };
}
export interface TnCategoryEmbedded {
  path?: string;
  text?: { name: string };
}
export interface TnPricingInfo {
  lowPrice?: number;
  averagePrice?: number;
  highPrice?: number;
}
export interface TnEvent {
  id: number;
  date: TnEventDate;
  text: TnEventText;
  scheduleStatus?: string;
  venue?: TnVenueEmbedded;
  performers?: TnPerformerEmbedded[];
  pricingInfo?: TnPricingInfo;
  defaultCategory?: TnCategoryEmbedded;
  city?: string;
  stateProvince?: string;
  country?: string;
}
export interface EventParams extends PaginationParams {
  categoryPath?: string;
  performerId?: number;
  venueId?: number;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
}

// --- Performers ---
export interface TnPerformerText {
  name: string;
}
export interface TnPerformer {
  id: number;
  text: TnPerformerText;
  defaultCategory?: TnCategoryEmbedded;
  salesRank?: number;
}
export interface PerformerParams extends PaginationParams {
  categoryPath?: string;
  keyword?: string;
}

// --- Venues ---
export interface TnVenueAddress {
  postalCode?: string;
  text?: string;
}
export interface TnVenueText {
  name: string;
}
export interface TnVenue {
  id: number;
  text: TnVenueText;
  address?: TnVenueAddress;
  capacity?: number;
  city?: string;
  stateProvince?: string;
  country?: string;
}
export interface VenueParams extends PaginationParams {
  city?: string;
  stateProvince?: string;
}

// --- Cities ---
export interface TnCityText {
  name: string;
}
export interface TnCity {
  id: number;
  text: TnCityText;
  salesRank?: number;
  stateProvince?: string;
  country?: string;
  _metadata?: {
    ticketCount: number;
    hasEvents: boolean;
    eventCount: number;
  };
}
export interface CityParams extends PaginationParams {
  stateProvince?: string;
  country?: string;
  // Only cities TN reports as actually having events — otherwise "pick a
  // default city" style features can land on a city with zero events, same
  // failure mode as unfiltered category browsing.
  hasEvents?: boolean;
}

// --- Suggestions ---
export interface TnEventSuggestPerformer {
  name: string;
  id: number;
  role?: string;
  isPerformance?: boolean;
}
export interface TnEventSuggest {
  id: number;
  name: string;
  date?: string;
  time?: string;
  weekday?: number;
  scheduleStatus?: string;
  performers?: TnEventSuggestPerformer[];
}
export interface TnPerformerSuggest {
  id: number;
  name: string;
}
export interface TnVenueSuggest {
  id: number;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}
export interface TnCitySuggest {
  id: number;
  name: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}
export interface TnSuggestGroup<T> {
  totalResultCount: number;
  results: T[];
}
export interface TnSuggestResult {
  events: TnSuggestGroup<TnEventSuggest>;
  performers: TnSuggestGroup<TnPerformerSuggest>;
  venues: TnSuggestGroup<TnVenueSuggest>;
  cities: TnSuggestGroup<TnCitySuggest>;
}

// --- Category Hierarchies ---
export interface TnCategoryHierarchy {
  id: number;
  name: string;
  description?: string;
  usages?: string[];
  topCategoryNodeId?: number;
}
export interface CategoryHierarchyParams extends PaginationParams {
  filter?: string;
}

// --- Countries ---
export interface TnCountryText {
  name: string;
}
export interface TnCountry {
  alphaCode: string;
  text: TnCountryText;
}
export interface CountryParams extends PaginationParams {
  filter?: string;
}

// --- State Provinces ---
export interface TnStateProvinceText {
  name: string;
  abbr?: string;
}
export interface TnStateProvince {
  id: number;
  text: TnStateProvinceText;
  country?: { alphaCode: string; text: TnCountryText };
}
export interface StateProvinceParams extends PaginationParams {
  filter?: string;
}

// --- Postal Codes ---
export interface TnPostalCode {
  id: number;
  code: string;
  geoCenter?: { latitude: number; longitude: number };
}
export interface PostalCodeParams extends PaginationParams {
  filter?: string;
  geoFilter?: string;
}

// --- Individual Suggest Params ---
export interface SuggestParams {
  q: string;
  numberOfSuggestions?: number;
  filter?: string;
}

export interface EventSuggestParams extends SuggestParams {
  includeVenueInfo?: boolean;
}

// --- Global Suggest Params ---
export interface GlobalSuggestParams {
  q: string;
  eventsRequested?: number;
  performersRequested?: number;
  venuesRequested?: number;
  citiesRequested?: number;
  filter?: string;
}

// --- Event Bulk Params ---
export interface EventBulkParams extends PaginationParams {
  filter?: string;
  categoryFilter?: string;
  performerFilter?: string;
  geoFilter?: string;
  fields?: string;
}


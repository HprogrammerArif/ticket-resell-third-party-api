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
  parentCategory?: { path: string };
}
export interface CategoryParams extends PaginationParams {
  path?: string;
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
}
export interface CityParams extends PaginationParams {
  stateProvince?: string;
  country?: string;
}

// --- Suggestions ---
export interface TnEventSuggest {
  id: number;
  name: string;
  date?: string;
  time?: string;
  weekday?: string;
  scheduleStatus?: string;
  performers?: string[];
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

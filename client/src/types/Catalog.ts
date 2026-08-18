// ─── Shared ───────────────────────────────────────────────────────────────────

export type TnPagedResult<T> = {
  page: number;
  count: number;
  totalCount: number;
  results: T[];
  _links?: unknown;
};

export type TnLink = {
  href: string;
  rel: string;
  type: string;
  title: string;
};

// ─── Categories ───────────────────────────────────────────────────────────────

export type TnCategory = {
  path: string;
  text: { name: string };
  salesRank?: number;
  depth?: number;
  hierarchy?: { id: number; name: string; usages?: string[] };
  parentCategory?: { path: string; depth?: number; text: { name: string } };
  _metadata?: {
    ticketCount: number;
    hasTickets: boolean;
    eventCount: number;
    hasEvents: boolean;
  };
  _links?: TnLink[];
  uriComponent?: string;
};

// ─── Events ───────────────────────────────────────────────────────────────────

export type TnEventDate = {
  date: string;
  time: string;
  datetime: string;
  datetimeOffset?: string;
  weekday?: number;
  text?: { date: string; time: string };
};

export type TnPriceValue = {
  value: number;
  currencyCode?: string;
  text?: { formatted?: string };
};

export type TnPricingInfo = {
  lowPrice?: TnPriceValue;
  averagePrice?: TnPriceValue;
  highPrice?: TnPriceValue;
};

export type TnEventPerformer = {
  name: string;
  id: number;
  role?: string;
  isPerformance?: boolean;
};

export type TnEventVenue = {
  id: number;
  text: { name: string; formerNames?: string[] };
  _links?: TnLink[];
};

export type TnEventCity = {
  id: number;
  text: { name: string };
  _links?: TnLink[];
};

export type TnEventStateProvince = {
  id: number;
  text: { abbr?: string; name: string };
  _links?: TnLink[];
};

export type TnEventCountry = {
  alphaCode: string;
  text: { name: string };
  _links?: TnLink[];
};

export type TnEventCategory = {
  path: string;
  depth?: number;
  text: { name: string };
  ancestors?: { path: string; depth?: number; text: { name: string } }[];
  _links?: TnLink[];
};

export type TnEventMetadata = {
  ticketCount: number;
  hasTickets: boolean;
  hasMyTickets?: boolean;
  hasTnPrimeTickets?: boolean;
  eTickets?: { ticketCount: number; hasTickets: boolean };
  parkingTickets?: { ticketCount: number; hasTickets: boolean };
  mercuryEligibleTicketCount?: number;
};

export type TnEvent = {
  id: number;
  date: TnEventDate;
  text: { name: string };
  scheduleStatus?: string;
  geoLocation?: { latitude: number; longitude: number };
  venue?: TnEventVenue;
  city?: TnEventCity;
  stateProvince?: TnEventStateProvince;
  country?: TnEventCountry;
  defaultCategory?: TnEventCategory;
  performers?: TnEventPerformer[];
  pricingInfo?: TnPricingInfo;
  _metadata?: TnEventMetadata;
  eventPriority?: number;
  isMultiDayEvent?: boolean;
  isTest?: boolean;
  uriComponent?: string;
  _links?: TnLink[];
};

// ─── Performers ───────────────────────────────────────────────────────────────

export type TnPerformer = {
  id: number;
  text: { name: string };
  defaultCategory?: TnEventCategory;
  _metadata?: {
    hasEvents: boolean;
    eventCount: number;
    hasTickets: boolean;
    ticketCount: number;
  };
  priorityRank?: number;
  isPerformance?: boolean;
  uriComponent?: string;
  _links?: TnLink[];
};

// ─── Venues ───────────────────────────────────────────────────────────────────

export type TnVenue = {
  id: number;
  text: { name: string; formerNames?: string[] };
  address?: {
    postalCode?: string;
    text?: { address1?: string; city?: string; stateProvince?: string; country?: string };
  };
  capacity?: number;
  city?: TnEventCity;
  stateProvince?: TnEventStateProvince;
  country?: TnEventCountry;
  geoLocation?: { latitude: number; longitude: number };
  _metadata?: {
    hasEvents: boolean;
    eventCount: number;
    hasTickets: boolean;
    ticketCount: number;
  };
  uriComponent?: string;
  _links?: TnLink[];
};

// ─── Cities ───────────────────────────────────────────────────────────────────

export type TnCity = {
  id: number;
  text: { name: string };
  salesRank?: number;
  stateProvince?: TnEventStateProvince;
  country?: TnEventCountry;
  _metadata?: {
    hasEvents: boolean;
    eventCount: number;
    hasTickets: boolean;
    ticketCount: number;
  };
  uriComponent?: string;
  _links?: TnLink[];
};

// ─── Category Hierarchies ─────────────────────────────────────────────────────

export type TnCategoryHierarchy = {
  id: number;
  name: string;
  description?: string;
  usages?: string[];
  topCategoryNodeId?: number;
};

// ─── Countries ────────────────────────────────────────────────────────────────

export type TnCountry = {
  alphaCode: string;
  text: { name: string };
  numericCode?: string;
  callingCode?: string;
  languageCode?: string;
};

// ─── State Provinces ──────────────────────────────────────────────────────────

export type TnStateProvince = {
  id: number;
  text: { name: string; abbr?: string };
  country?: TnEventCountry;
};

// ─── Postal Codes ─────────────────────────────────────────────────────────────

export type TnPostalCode = {
  id: number;
  code: string;
  geoCenter?: { latitude: number; longitude: number };
};

// ─── Suggest Types ────────────────────────────────────────────────────────────

export type TnSuggestGroup<T> = {
  totalResultCount: number;
  results: T[];
};

export type TnEventSuggestPerformer = {
  name: string;
  id: number;
  role?: string;
  isPerformance?: boolean;
};

export type TnEventSuggest = {
  id: number;
  name: string;
  date?: string;
  time?: string;
  weekday?: number;
  scheduleStatus?: string;
  performers?: TnEventSuggestPerformer[];
};

export type TnPerformerSuggest = {
  id: number;
  name: string;
};

export type TnVenueSuggest = {
  id: number;
  name: string;
  city?: string;
  state?: string;
  country?: string;
};

export type TnCitySuggest = {
  id: number;
  name: string;
  state?: string;
  country?: string;
};

export type TnSuggestResult = {
  events: TnSuggestGroup<TnEventSuggest>;
  performers: TnSuggestGroup<TnPerformerSuggest>;
  venues: TnSuggestGroup<TnVenueSuggest>;
  cities: TnSuggestGroup<TnCitySuggest>;
};

// ─── Params ───────────────────────────────────────────────────────────────────

export type EventParams = {
  keyword?: string;
  categoryPath?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type PerformerParams = {
  keyword?: string;
  categoryPath?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type VenueParams = {
  city?: string;
  stateProvince?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type CityParams = {
  stateProvince?: string;
  country?: string;
  hasEvents?: boolean;
  pageNumber?: number;
  pageSize?: number;
};

export type CategoryHierarchyParams = {
  filter?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type CountryParams = {
  filter?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type StateProvinceParams = {
  filter?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type PostalCodeParams = {
  filter?: string;
  geoFilter?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type SuggestParams = {
  q: string;
  numberOfSuggestions?: number;
  filter?: string;
};

export type EventSuggestParams = SuggestParams & {
  includeVenueInfo?: boolean;
};

export type EventBulkParams = {
  filter?: string;
  categoryFilter?: string;
  performerFilter?: string;
  geoFilter?: string;
  timeOfDayFilter?: string;
  sort?: string;
  fields?: string;
  // Convenience params (transformed to OData on the server)
  keyword?: string;
  city?: string;
  categoryPath?: string;
  dateFrom?: string;
  dateTo?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type GlobalSuggestParams = {
  eventsRequested?: number;
  performersRequested?: number;
  venuesRequested?: number;
  citiesRequested?: number;
  filter?: string;
};

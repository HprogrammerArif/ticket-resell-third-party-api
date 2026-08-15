export type TnPagedResult<T> = {
  page: number;
  count: number;
  totalCount: number;
  results: T[];
  _links?: unknown;
};

export type TnCategory = {
  path: string;
  text: { name: string };
  salesRank?: number;
  depth?: number;
  parentCategory?: TnCategory;
};

export type TnEvent = {
  id: number;
  date: { datetime: string; date: string; time: string };
  text: { name: string };
  venue?: {
    id: number;
    text: { name: string };
    city?: string;
    stateProvince?: string;
  };
  performers?: TnPerformer[];
  minPrice?: number;
  maxPrice?: number;
};

export type TnPerformer = {
  id: number;
  text: { name: string };
  imageUrl?: string;
  upcomingEventCount?: number;
  categoryPath?: string;
};

export type TnVenue = {
  id: number;
  text: { name: string };
  city?: string;
  stateProvince?: string;
  country?: string;
};

export type TnCity = {
  id: number;
  text: { name: string };
  stateProvince?: string;
  country?: string;
};

export type TnSuggestResult = {
  events: TnEvent[];
  performers: TnPerformer[];
  venues: TnVenue[];
  cities: TnCity[];
};

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
  pageNumber?: number;
  pageSize?: number;
};

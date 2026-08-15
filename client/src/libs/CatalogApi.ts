import { ApiClient } from '@/libs/ApiClient';
import type {
  TnPagedResult,
  TnCategory,
  TnEvent,
  TnPerformer,
  TnVenue,
  TnCity,
  TnSuggestResult,
  EventParams,
  PerformerParams,
  VenueParams,
  CityParams,
} from '@/types/Catalog';

function toParams(obj: Record<string, string | number | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = String(v);
  }
  return out;
}

export async function getCategories(
  params?: { pageNumber?: number; pageSize?: number },
): Promise<TnPagedResult<TnCategory>> {
  return ApiClient.get('/api/catalog/categories', {
    params: toParams({ pageNumber: params?.pageNumber, pageSize: params?.pageSize }),
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

export async function getCities(params?: CityParams): Promise<TnPagedResult<TnCity>> {
  return ApiClient.get('/api/catalog/cities', {
    params: toParams({
      stateProvince: params?.stateProvince,
      country: params?.country,
      pageNumber: params?.pageNumber,
      pageSize: params?.pageSize,
    }),
  });
}

export async function globalSuggest(q: string): Promise<TnSuggestResult> {
  return ApiClient.get('/api/catalog/search/suggest', { params: { q } });
}

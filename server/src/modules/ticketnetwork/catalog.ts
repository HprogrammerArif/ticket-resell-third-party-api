import { tnRequest } from './client';
import type {
  TnPagedResult,
  TnCategory, CategoryParams,
  TnEvent, EventParams,
  TnPerformer, PerformerParams,
  TnVenue, VenueParams,
  TnCity, CityParams,
  TnSuggestResult,
} from './types';

function opts(p: Record<string, unknown>): { params?: Record<string, string | number> } {
  const filtered = Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined),
  ) as Record<string, string | number>;
  return Object.keys(filtered).length > 0 ? { params: filtered } : {};
}

export function getCategories(params: CategoryParams = {}): Promise<TnPagedResult<TnCategory>> {
  return tnRequest<TnPagedResult<TnCategory>>('/categories', opts(params));
}

export function getCategoryByPath(path: string, params: CategoryParams = {}): Promise<TnCategory> {
  return tnRequest<TnCategory>(`/categories/${path}`, opts(params));
}

export function getEvents(params: EventParams = {}): Promise<TnPagedResult<TnEvent>> {
  return tnRequest<TnPagedResult<TnEvent>>('/events', opts(params));
}

export function getEventById(id: number): Promise<TnEvent> {
  return tnRequest<TnEvent>(`/events/${id}`, {});
}

export function searchEvents(params: EventParams = {}): Promise<TnPagedResult<TnEvent>> {
  return tnRequest<TnPagedResult<TnEvent>>('/events/search', opts(params));
}

export function getPerformers(params: PerformerParams = {}): Promise<TnPagedResult<TnPerformer>> {
  return tnRequest<TnPagedResult<TnPerformer>>('/performers', opts(params));
}

export function getPerformerById(id: number): Promise<TnPerformer> {
  return tnRequest<TnPerformer>(`/performers/${id}`, {});
}

export function getVenues(params: VenueParams = {}): Promise<TnPagedResult<TnVenue>> {
  return tnRequest<TnPagedResult<TnVenue>>('/venues', opts(params));
}

export function getVenueById(id: number): Promise<TnVenue> {
  return tnRequest<TnVenue>(`/venues/${id}`, {});
}

export function getCities(params: CityParams = {}): Promise<TnPagedResult<TnCity>> {
  return tnRequest<TnPagedResult<TnCity>>('/cities', opts(params));
}

export function globalSuggest(query: string): Promise<TnSuggestResult> {
  return tnRequest<TnSuggestResult>('/suggest', { params: { q: query } });
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/modules/ticketnetwork/catalog', () => ({
  getCategories: vi.fn(),
  getCategoryByPath: vi.fn(),
  getEvents: vi.fn(),
  getEventById: vi.fn(),
  searchEvents: vi.fn(),
  getPerformers: vi.fn(),
  getPerformerById: vi.fn(),
  getVenues: vi.fn(),
  getVenueById: vi.fn(),
  getCities: vi.fn(),
  globalSuggest: vi.fn(),
}));

import app from '../../src/app';
import * as catalog from '../../src/modules/ticketnetwork/catalog';

describe('Catalog routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /api/categories', () => {
    it('returns 200 with category list', async () => {
      const data = { page: 1, count: 1, totalCount: 1, results: [{ path: 'sports', text: { name: 'Sports' } }] };
      vi.mocked(catalog.getCategories).mockResolvedValueOnce(data);

      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(data);
    });

    it('forwards pageSize and pageNumber as numbers', async () => {
      vi.mocked(catalog.getCategories).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
      await request(app).get('/api/categories?pageSize=5&pageNumber=2');
      expect(catalog.getCategories).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 5, pageNumber: 2 }));
    });

    it('returns 502 when catalog throws ApiError', async () => {
      const { ApiError } = await import('../../src/middleware/errorHandler');
      vi.mocked(catalog.getCategories).mockRejectedValueOnce(new ApiError(502, 'TN_API_ERROR', 'down'));
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('TN_API_ERROR');
    });
  });

  describe('GET /api/categories/:path (nested)', () => {
    it('passes the full nested path to getCategoryByPath', async () => {
      vi.mocked(catalog.getCategoryByPath).mockResolvedValueOnce({ path: 'sports/hockey', text: { name: 'Hockey' } });
      const res = await request(app).get('/api/categories/sports/hockey');
      expect(res.status).toBe(200);
      expect(catalog.getCategoryByPath).toHaveBeenCalledWith('sports/hockey', expect.any(Object));
    });
  });

  describe('GET /api/events/search', () => {
    it('calls searchEvents (not getEventById)', async () => {
      vi.mocked(catalog.searchEvents).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
      const res = await request(app).get('/api/events/search?keyword=hockey');
      expect(res.status).toBe(200);
      expect(catalog.searchEvents).toHaveBeenCalled();
      expect(catalog.getEventById).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/events/:id', () => {
    it('passes numeric id to getEventById', async () => {
      vi.mocked(catalog.getEventById).mockResolvedValueOnce({ id: 42, text: { name: 'Test' }, date: {} });
      const res = await request(app).get('/api/events/42');
      expect(res.status).toBe(200);
      expect(catalog.getEventById).toHaveBeenCalledWith(42);
    });

    it('returns 422 when id is not a number', async () => {
      const res = await request(app).get('/api/events/notanumber');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/search/suggest', () => {
    it('passes q to globalSuggest', async () => {
      vi.mocked(catalog.globalSuggest).mockResolvedValueOnce({
        events: { totalResultCount: 0, results: [] },
        performers: { totalResultCount: 0, results: [] },
        venues: { totalResultCount: 0, results: [] },
        cities: { totalResultCount: 0, results: [] },
      });
      const res = await request(app).get('/api/search/suggest?q=leaf');
      expect(res.status).toBe(200);
      expect(catalog.globalSuggest).toHaveBeenCalledWith('leaf');
    });

    it('returns 422 when q is missing', async () => {
      const res = await request(app).get('/api/search/suggest');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

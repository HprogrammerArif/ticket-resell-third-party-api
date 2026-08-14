import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '@/libs/ApiClient';

vi.mock('@/libs/ApiClient', () => ({
  ApiClient: { get: vi.fn() },
}));

const mockGet = vi.mocked(ApiClient.get);

beforeEach(() => {
  mockGet.mockReset();
});

describe('CatalogApi', () => {
  describe('getCategories', () => {
    it('calls /api/catalog/categories with pageSize as string param', async () => {
      const { getCategories } = await import('./CatalogApi');
      const result = { page: 1, count: 0, totalCount: 0, results: [] };
      mockGet.mockResolvedValue(result);

      await getCategories({ pageSize: 12 });

      expect(mockGet).toHaveBeenCalledWith('/api/catalog/categories', {
        params: { pageSize: '12' },
      });
    });

    it('omits undefined params', async () => {
      const { getCategories } = await import('./CatalogApi');
      mockGet.mockResolvedValue({ page: 1, count: 0, totalCount: 0, results: [] });

      await getCategories();

      expect(mockGet).toHaveBeenCalledWith('/api/catalog/categories', { params: {} });
    });
  });

  describe('getEventById', () => {
    it('calls /api/catalog/events/:id', async () => {
      const { getEventById } = await import('./CatalogApi');
      const event = { id: 42, date: { datetime: '', date: '', time: '' }, text: { name: 'Test' } };
      mockGet.mockResolvedValue(event);

      const result = await getEventById(42);

      expect(mockGet).toHaveBeenCalledWith('/api/catalog/events/42', { params: {} });
      expect(result).toEqual(event);
    });
  });

  describe('searchEvents', () => {
    it('calls /api/catalog/events/search with keyword and city', async () => {
      const { searchEvents } = await import('./CatalogApi');
      mockGet.mockResolvedValue({ page: 1, count: 0, totalCount: 0, results: [] });

      await searchEvents({ keyword: 'Taylor Swift', city: 'New York' });

      expect(mockGet).toHaveBeenCalledWith('/api/catalog/events/search', {
        params: { keyword: 'Taylor Swift', city: 'New York' },
      });
    });
  });

  describe('globalSuggest', () => {
    it('calls /api/catalog/search/suggest with q param', async () => {
      const { globalSuggest } = await import('./CatalogApi');
      const suggest = { events: [], performers: [], venues: [], cities: [] };
      mockGet.mockResolvedValue(suggest);

      await globalSuggest('taylor');

      expect(mockGet).toHaveBeenCalledWith('/api/catalog/search/suggest', {
        params: { q: 'taylor' },
      });
    });
  });

  describe('getPerformerById', () => {
    it('calls /api/catalog/performers/:id', async () => {
      const { getPerformerById } = await import('./CatalogApi');
      const performer = { id: 99, text: { name: 'Artist' } };
      mockGet.mockResolvedValue(performer);

      await getPerformerById(99);

      expect(mockGet).toHaveBeenCalledWith('/api/catalog/performers/99', { params: {} });
    });
  });
});

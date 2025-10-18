import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedSearch,
  cacheSearchResults,
  clearSearchCache,
  cleanupSearchCache,
} from '../searchCache';
import type { SearchResult } from '../../types/search';

describe('searchCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCachedSearch', () => {
    it('should return cached results if not expired', async () => {
      const mockResults: SearchResult[] = [
        { tabId: 1, title: 'Test', url: 'https://test.com', score: 0.9 },
      ];

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockCache = {
        'test query': {
          query: 'Test Query',
          results: mockResults,
          timestamp: new Date(),
          expiresAt: futureDate,
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ search_cache: mockCache });

      const result = await getCachedSearch('Test Query');

      expect(result).toEqual(mockResults);
    });

    it('should return null if query not in cache', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ search_cache: {} });

      const result = await getCachedSearch('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if cache is empty', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const result = await getCachedSearch('any query');

      expect(result).toBeNull();
    });

    it('should return null and remove expired cache', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 25); // 25 hours ago

      const mockCache = {
        'old query': {
          query: 'Old Query',
          results: [],
          timestamp: pastDate,
          expiresAt: pastDate,
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ search_cache: mockCache });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      const result = await getCachedSearch('Old Query');

      expect(result).toBeNull();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ search_cache: {} });
    });

    it('should normalize query for lookup', async () => {
      const mockResults: SearchResult[] = [
        { tabId: 2, title: 'Test', url: 'https://test.com', score: 0.8 },
      ];

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockCache = {
        'test query': {
          query: 'test query',
          results: mockResults,
          timestamp: new Date(),
          expiresAt: futureDate,
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ search_cache: mockCache });

      // Try different variations
      const result1 = await getCachedSearch('Test Query');
      const result2 = await getCachedSearch('TEST QUERY');
      const result3 = await getCachedSearch('  test   query  ');

      expect(result1).toEqual(mockResults);
      expect(result2).toEqual(mockResults);
      expect(result3).toEqual(mockResults);
    });
  });

  describe('cacheSearchResults', () => {
    it('should cache search results with expiry', async () => {
      const mockResults: SearchResult[] = [
        { tabId: 1, title: 'Test', url: 'https://test.com', score: 0.9 },
      ];

      vi.mocked(chrome.storage.local.get).mockResolvedValue({});
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await cacheSearchResults('Test Query', mockResults);

      expect(chrome.storage.local.set).toHaveBeenCalled();
      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];

      expect(callArg.search_cache['test query']).toBeDefined();
      expect(callArg.search_cache['test query'].query).toBe('Test Query');
      expect(callArg.search_cache['test query'].results).toEqual(mockResults);
      expect(callArg.search_cache['test query'].expiresAt).toBeDefined();
    });

    it('should normalize query when caching', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await cacheSearchResults('  TEST   QUERY  ', []);

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(callArg.search_cache['test query']).toBeDefined();
    });

    it('should set expiry 24 hours in the future', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      const beforeCache = new Date();
      await cacheSearchResults('query', []);
      const afterCache = new Date();

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      const expiresAt = new Date(callArg.search_cache['query'].expiresAt);

      const expectedMinExpiry = new Date(beforeCache.getTime() + 23.9 * 60 * 60 * 1000);
      const expectedMaxExpiry = new Date(afterCache.getTime() + 24.1 * 60 * 60 * 1000);

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry.getTime());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry.getTime());
    });

    it('should update existing cache entry', async () => {
      const existingCache = {
        'old query': {
          query: 'old query',
          results: [{ tabId: 1, title: 'Old', url: 'https://old.com', score: 0.5 }],
          timestamp: new Date(),
          expiresAt: new Date(),
        },
      };

      const newResults: SearchResult[] = [
        { tabId: 2, title: 'New', url: 'https://new.com', score: 0.9 },
      ];

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ search_cache: existingCache });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await cacheSearchResults('new query', newResults);

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(callArg.search_cache['old query']).toBeDefined(); // Preserved
      expect(callArg.search_cache['new query']).toBeDefined(); // Added
      expect(callArg.search_cache['new query'].results).toEqual(newResults);
    });

    it('should overwrite if same query cached again', async () => {
      const existingCache = {
        'test query': {
          query: 'test query',
          results: [{ tabId: 1, title: 'Old', url: 'https://old.com', score: 0.5 }],
          timestamp: new Date(),
          expiresAt: new Date(),
        },
      };

      const newResults: SearchResult[] = [
        { tabId: 2, title: 'New', url: 'https://new.com', score: 0.9 },
      ];

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ search_cache: existingCache });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await cacheSearchResults('Test Query', newResults);

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(callArg.search_cache['test query'].results).toEqual(newResults);
    });
  });

  describe('clearSearchCache', () => {
    it('should remove all cached searches', async () => {
      vi.mocked(chrome.storage.local.remove).mockResolvedValue(undefined);

      await clearSearchCache();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith('search_cache');
    });
  });

  describe('cleanupSearchCache', () => {
    it('should remove expired entries', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 25);

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockCache = {
        'expired query': {
          query: 'Expired',
          results: [],
          timestamp: pastDate,
          expiresAt: pastDate,
        },
        'valid query': {
          query: 'Valid',
          results: [{ tabId: 1, title: 'Test', url: 'https://test.com', score: 0.9 }],
          timestamp: new Date(),
          expiresAt: futureDate,
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ search_cache: mockCache });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await cleanupSearchCache();

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(callArg.search_cache['expired query']).toBeUndefined();
      expect(callArg.search_cache['valid query']).toBeDefined();
    });

    it('should not call set if no expired entries', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockCache = {
        'valid query': {
          query: 'Valid',
          results: [],
          timestamp: new Date(),
          expiresAt: futureDate,
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ search_cache: mockCache });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await cleanupSearchCache();

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should handle empty cache', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await cleanupSearchCache();

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should remove multiple expired entries', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 25);

      const mockCache = {
        'expired1': {
          query: 'Expired1',
          results: [],
          timestamp: pastDate,
          expiresAt: pastDate,
        },
        'expired2': {
          query: 'Expired2',
          results: [],
          timestamp: pastDate,
          expiresAt: pastDate,
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ search_cache: mockCache });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await cleanupSearchCache();

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(Object.keys(callArg.search_cache)).toHaveLength(0);
    });
  });
});

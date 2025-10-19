import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedSearch,
  cacheSearchResults,
  clearSearchCache,
  cleanupSearchCache,
} from '../searchCache';
import * as caching from '../caching';
import type { SearchResult } from '../../types/search';

// Mock the caching module
vi.mock('../caching');

describe('searchCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCachedSearch', () => {
    it('should return cached results if available', async () => {
      const mockResults: SearchResult[] = [
        {
          tab: { id: 1, url: 'https://example.com', title: 'Test' },
          relevanceScore: 0.9,
          matchedFields: ['title'],
          highlights: [],
        },
      ];

      vi.mocked(caching.getCachedItem).mockResolvedValue(mockResults);

      const result = await getCachedSearch('test query');

      expect(result).toEqual(mockResults);
      expect(caching.getCachedItem).toHaveBeenCalledWith('test query', 'search');
    });

    it('should return null if query not in cache', async () => {
      vi.mocked(caching.getCachedItem).mockResolvedValue(null);

      const result = await getCachedSearch('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if cache is empty', async () => {
      vi.mocked(caching.getCachedItem).mockResolvedValue(null);

      const result = await getCachedSearch('test');

      expect(result).toBeNull();
    });

    it('should normalize query for lookup', async () => {
      const mockResults: SearchResult[] = [
        {
          tab: { id: 2, url: 'https://example.com', title: 'Test' },
          relevanceScore: 0.8,
          matchedFields: ['title'],
          highlights: [],
        },
      ];

      vi.mocked(caching.getCachedItem).mockResolvedValue(mockResults);

      const result = await getCachedSearch('  TEST   QUERY  ');

      expect(result).toEqual(mockResults);
      expect(caching.getCachedItem).toHaveBeenCalledWith('test query', 'search');
    });
  });

  describe('cacheSearchResults', () => {
    it('should cache search results with TTL', async () => {
      const mockResults: SearchResult[] = [
        {
          tab: { id: 1, url: 'https://example.com', title: 'Test' },
          relevanceScore: 0.9,
          matchedFields: ['title'],
          highlights: [],
        },
      ];

      vi.mocked(caching.setCachedItem).mockResolvedValue(undefined);

      await cacheSearchResults('test query', mockResults);

      expect(caching.setCachedItem).toHaveBeenCalledWith(
        'test query',
        mockResults,
        24 * 60 * 60 * 1000,
        'search'
      );
    });

    it('should normalize query when caching', async () => {
      const mockResults: SearchResult[] = [];

      vi.mocked(caching.setCachedItem).mockResolvedValue(undefined);

      await cacheSearchResults('  TEST   QUERY  ', mockResults);

      expect(caching.setCachedItem).toHaveBeenCalledWith(
        'test query',
        mockResults,
        24 * 60 * 60 * 1000,
        'search'
      );
    });
  });

  describe('clearSearchCache', () => {
    it('should clear all cached searches', async () => {
      vi.mocked(caching.clearCacheByPrefix).mockResolvedValue(undefined);

      await clearSearchCache();

      expect(caching.clearCacheByPrefix).toHaveBeenCalledWith('search');
    });
  });

  describe('cleanupSearchCache', () => {
    it('should be a no-op (automatic cleanup in caching utility)', async () => {
      await cleanupSearchCache();

      // Should not call any caching functions since cleanup is automatic
      expect(caching.getCachedItem).not.toHaveBeenCalled();
      expect(caching.setCachedItem).not.toHaveBeenCalled();
      expect(caching.clearCacheByPrefix).not.toHaveBeenCalled();
    });
  });
});

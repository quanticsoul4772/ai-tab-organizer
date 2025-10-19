import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCachedItem,
  setCachedItem,
  removeCachedItem,
  clearCacheByPrefix,
  withCache,
  createCachedFunction,
  invalidateCache,
  getCacheStats,
} from '../caching';
import { storage } from '../../core/browserApi';

// Mock the browserApi storage
vi.mock('../../core/browserApi', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    getAll: vi.fn(),
    removeMultiple: vi.fn(),
  },
}));

describe('caching utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCachedItem', () => {
    it('should return cached item if not expired', async () => {
      const now = Date.now();
      const cachedData = {
        data: 'test value',
        timestamp: now,
        ttl: 5000,
      };

      vi.mocked(storage.get).mockResolvedValue(cachedData);
      vi.setSystemTime(now + 1000); // 1 second later

      const result = await getCachedItem('testKey');

      expect(result).toBe('test value');
      expect(storage.get).toHaveBeenCalledWith('cache:testKey');
    });

    it('should return null if cache expired', async () => {
      const now = Date.now();
      const cachedData = {
        data: 'test value',
        timestamp: now,
        ttl: 5000,
      };

      vi.mocked(storage.get).mockResolvedValue(cachedData);
      vi.setSystemTime(now + 6000); // 6 seconds later (past TTL)

      const result = await getCachedItem('testKey');

      expect(result).toBeNull();
      expect(storage.remove).toHaveBeenCalledWith('cache:testKey');
    });

    it('should return null if not in cache', async () => {
      vi.mocked(storage.get).mockResolvedValue(null);

      const result = await getCachedItem('testKey');

      expect(result).toBeNull();
    });

    it('should use custom key prefix', async () => {
      vi.mocked(storage.get).mockResolvedValue(null);

      await getCachedItem('testKey', 'custom');

      expect(storage.get).toHaveBeenCalledWith('custom:testKey');
    });
  });

  describe('setCachedItem', () => {
    it('should set an item in cache', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await setCachedItem('testKey', 'testValue', 5000);

      expect(storage.set).toHaveBeenCalledWith('cache:testKey', {
        data: 'testValue',
        timestamp: now,
        ttl: 5000,
      });
    });

    it('should use custom key prefix', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await setCachedItem('testKey', 'testValue', 5000, 'custom');

      expect(storage.set).toHaveBeenCalledWith('custom:testKey', {
        data: 'testValue',
        timestamp: now,
        ttl: 5000,
      });
    });
  });

  describe('removeCachedItem', () => {
    it('should remove an item from cache', async () => {
      await removeCachedItem('testKey');

      expect(storage.remove).toHaveBeenCalledWith('cache:testKey');
    });

    it('should use custom key prefix', async () => {
      await removeCachedItem('testKey', 'custom');

      expect(storage.remove).toHaveBeenCalledWith('custom:testKey');
    });
  });

  describe('clearCacheByPrefix', () => {
    it('should clear all items with given prefix', async () => {
      vi.mocked(storage.getAll).mockResolvedValue({
        'myprefix:key1': 'value1',
        'myprefix:key2': 'value2',
        'otherprefix:key3': 'value3',
        'cache:key4': 'value4',
      });

      await clearCacheByPrefix('myprefix');

      expect(storage.removeMultiple).toHaveBeenCalledWith(['myprefix:key1', 'myprefix:key2']);
    });

    it('should not remove anything if no matching keys', async () => {
      vi.mocked(storage.getAll).mockResolvedValue({
        'cache:key1': 'value1',
        'otherprefix:key2': 'value2',
      });

      await clearCacheByPrefix('nonexistent');

      expect(storage.removeMultiple).not.toHaveBeenCalled();
    });
  });

  describe('withCache', () => {
    it('should return cached value if available', async () => {
      const now = Date.now();
      const cachedData = {
        data: 'cached result',
        timestamp: now,
        ttl: 5000,
      };

      vi.mocked(storage.get).mockResolvedValue(cachedData);
      vi.setSystemTime(now + 1000);

      const fetcher = vi.fn().mockResolvedValue('fresh result');

      const result = await withCache('testKey', fetcher, { ttl: 5000 });

      expect(result).toBe('cached result');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher if cache miss', async () => {
      const now = Date.now();
      vi.setSystemTime(now);
      vi.mocked(storage.get).mockResolvedValue(null);

      const fetcher = vi.fn().mockResolvedValue('fresh result');

      const result = await withCache('testKey', fetcher, { ttl: 5000 });

      expect(result).toBe('fresh result');
      expect(fetcher).toHaveBeenCalled();
      expect(storage.set).toHaveBeenCalledWith('cache:testKey', {
        data: 'fresh result',
        timestamp: now,
        ttl: 5000,
      });
    });

    it('should force refresh if force option is true', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const cachedData = {
        data: 'cached result',
        timestamp: now,
        ttl: 5000,
      };

      vi.mocked(storage.get).mockResolvedValue(cachedData);

      const fetcher = vi.fn().mockResolvedValue('fresh result');

      const result = await withCache('testKey', fetcher, { ttl: 5000, force: true });

      expect(result).toBe('fresh result');
      expect(fetcher).toHaveBeenCalled();
    });

    it('should use custom key prefix', async () => {
      const now = Date.now();
      vi.setSystemTime(now);
      vi.mocked(storage.get).mockResolvedValue(null);

      const fetcher = vi.fn().mockResolvedValue('fresh result');

      await withCache('testKey', fetcher, { ttl: 5000, keyPrefix: 'custom' });

      expect(storage.get).toHaveBeenCalledWith('custom:testKey');
      expect(storage.set).toHaveBeenCalledWith('custom:testKey', {
        data: 'fresh result',
        timestamp: now,
        ttl: 5000,
      });
    });
  });

  describe('createCachedFunction', () => {
    it('should create a cached version of a function', async () => {
      const now = Date.now();
      vi.setSystemTime(now);
      vi.mocked(storage.get).mockResolvedValue(null);

      const originalFn = vi.fn().mockResolvedValue('result');
      const cachedFn = createCachedFunction(originalFn, { ttl: 5000 });

      // First call - should execute and cache
      const result1 = await cachedFn('arg1', 'arg2');
      expect(result1).toBe('result');
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');

      // Second call with same args - should return from cache
      const cachedData = {
        data: 'result',
        timestamp: now,
        ttl: 5000,
      };
      vi.mocked(storage.get).mockResolvedValue(cachedData);
      originalFn.mockClear();

      const result2 = await cachedFn('arg1', 'arg2');
      expect(result2).toBe('result');
      expect(originalFn).not.toHaveBeenCalled();
    });

    it('should cache different results for different arguments', async () => {
      const now = Date.now();
      vi.setSystemTime(now);
      vi.mocked(storage.get).mockResolvedValue(null);

      const originalFn = vi.fn().mockResolvedValueOnce('result1').mockResolvedValueOnce('result2');

      const cachedFn = createCachedFunction(originalFn, { ttl: 5000 });

      const result1 = await cachedFn('arg1');
      const result2 = await cachedFn('arg2');

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(originalFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate multiple cache keys', async () => {
      await invalidateCache(['key1', 'key2', 'key3']);

      expect(storage.removeMultiple).toHaveBeenCalledWith([
        'cache:key1',
        'cache:key2',
        'cache:key3',
      ]);
    });

    it('should use custom key prefix', async () => {
      await invalidateCache(['key1', 'key2'], 'custom');

      expect(storage.removeMultiple).toHaveBeenCalledWith(['custom:key1', 'custom:key2']);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      vi.mocked(storage.getAll).mockResolvedValue({
        'cache:key1': {
          data: 'value1',
          timestamp: now - 1000,
          ttl: 5000,
        },
        'cache:key2': {
          data: 'value2value2', // 12 characters
          timestamp: now - 2000,
          ttl: 5000,
        },
        'otherprefix:key3': {
          data: 'value3',
          timestamp: now,
          ttl: 5000,
        },
      });

      const stats = await getCacheStats();

      expect(stats.totalItems).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.items).toHaveLength(2);
      expect(stats.items[0].key).toMatch(/^cache:/);
      expect(stats.items[0].age).toBeGreaterThan(0);
    });

    it('should filter by custom prefix', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      vi.mocked(storage.getAll).mockResolvedValue({
        'custom:key1': {
          data: 'value1',
          timestamp: now,
          ttl: 5000,
        },
        'cache:key2': {
          data: 'value2',
          timestamp: now,
          ttl: 5000,
        },
      });

      const stats = await getCacheStats('custom');

      expect(stats.totalItems).toBe(1);
      expect(stats.items[0].key).toBe('custom:key1');
    });
  });
});

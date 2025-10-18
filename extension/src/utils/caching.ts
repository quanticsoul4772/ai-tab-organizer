import { storage as browserStorage } from '../core/browserApi';

/**
 * Options for cache operations
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Force refresh, bypass cache */
  force?: boolean;
  /** Custom cache key prefix */
  keyPrefix?: string;
}

/**
 * Cached item wrapper
 */
interface CachedItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Default cache key prefix
 */
const DEFAULT_KEY_PREFIX = 'cache';

/**
 * Generate a cache key with optional prefix
 */
function getCacheKey(key: string, prefix?: string): string {
  const actualPrefix = prefix || DEFAULT_KEY_PREFIX;
  return `${actualPrefix}:${key}`;
}

/**
 * Get an item from cache
 */
export async function getCachedItem<T>(key: string, keyPrefix?: string): Promise<T | null> {
  const cacheKey = getCacheKey(key, keyPrefix);
  const cached = await browserStorage.get<CachedItem<T>>(cacheKey);

  if (!cached) {
    return null;
  }

  // Check if cache is expired
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    // Cache expired, remove it
    await browserStorage.remove(cacheKey);
    return null;
  }

  return cached.data;
}

/**
 * Set an item in cache
 */
export async function setCachedItem<T>(
  key: string,
  data: T,
  ttl: number,
  keyPrefix?: string
): Promise<void> {
  const cacheKey = getCacheKey(key, keyPrefix);
  const cachedItem: CachedItem<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  await browserStorage.set(cacheKey, cachedItem);
}

/**
 * Remove an item from cache
 */
export async function removeCachedItem(key: string, keyPrefix?: string): Promise<void> {
  const cacheKey = getCacheKey(key, keyPrefix);
  await browserStorage.remove(cacheKey);
}

/**
 * Clear all cached items with a specific prefix
 */
export async function clearCacheByPrefix(prefix: string): Promise<void> {
  const allItems = await browserStorage.getAll();
  const keysToRemove: string[] = [];

  for (const key in allItems) {
    if (key.startsWith(`${prefix}:`)) {
      keysToRemove.push(key);
    }
  }

  if (keysToRemove.length > 0) {
    await browserStorage.removeMultiple(keysToRemove);
  }
}

/**
 * Higher-order function that wraps a fetcher with caching logic
 *
 * @param key - Unique cache key
 * @param fetcher - Async function that fetches the data
 * @param options - Cache options (ttl, force refresh, key prefix)
 * @returns Cached data or freshly fetched data
 *
 * @example
 * ```typescript
 * const result = await withCache(
 *   'user-profile-123',
 *   async () => fetchUserProfile(123),
 *   { ttl: 5 * 60 * 1000 } // 5 minutes
 * );
 * ```
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const { ttl, force = false, keyPrefix } = options;

  // Check cache unless force refresh is requested
  if (!force) {
    const cached = await getCachedItem<T>(key, keyPrefix);
    if (cached !== null) {
      return cached;
    }
  }

  // Cache miss or force refresh - fetch fresh data
  const result = await fetcher();

  // Store in cache
  await setCachedItem(key, result, ttl, keyPrefix);

  return result;
}

/**
 * Create a cached version of a function
 *
 * @param fetcher - Async function to cache
 * @param options - Default cache options
 * @returns Cached version of the function
 *
 * @example
 * ```typescript
 * const cachedFetchUser = createCachedFunction(
 *   async (userId: string) => fetchUser(userId),
 *   { ttl: 5 * 60 * 1000, keyPrefix: 'users' }
 * );
 *
 * // First call fetches, second call uses cache
 * const user1 = await cachedFetchUser('user123');
 * const user2 = await cachedFetchUser('user123'); // from cache
 * ```
 */
export function createCachedFunction<TArgs extends unknown[], TResult>(
  fetcher: (...args: TArgs) => Promise<TResult>,
  defaultOptions: Omit<CacheOptions, 'force'>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    // Use function arguments as part of the cache key
    const key = JSON.stringify(args);

    return withCache(
      key,
      () => fetcher(...args),
      defaultOptions
    );
  };
}

/**
 * Batch invalidate multiple cache entries
 */
export async function invalidateCache(keys: string[], keyPrefix?: string): Promise<void> {
  const cacheKeys = keys.map(k => getCacheKey(k, keyPrefix));
  await browserStorage.removeMultiple(cacheKeys);
}

/**
 * Get cache statistics (useful for debugging)
 */
export async function getCacheStats(prefix?: string): Promise<{
  totalItems: number;
  totalSize: number;
  items: Array<{ key: string; size: number; age: number }>;
}> {
  const allItems = await browserStorage.getAll();
  const stats = {
    totalItems: 0,
    totalSize: 0,
    items: [] as Array<{ key: string; size: number; age: number }>,
  };

  const filterPrefix = prefix ? `${prefix}:` : DEFAULT_KEY_PREFIX + ':';

  for (const [key, value] of Object.entries(allItems)) {
    if (!key.startsWith(filterPrefix)) continue;

    const size = JSON.stringify(value).length;
    const cached = value as CachedItem<unknown>;
    const age = Date.now() - cached.timestamp;

    stats.totalItems++;
    stats.totalSize += size;
    stats.items.push({ key, size, age });
  }

  return stats;
}

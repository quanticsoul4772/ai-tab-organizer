import type { SearchResult } from '../types/search';
import { getCachedItem, setCachedItem, clearCacheByPrefix } from './caching';

const SEARCH_CACHE_PREFIX = 'search';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Normalize query for caching (lowercase, trim, remove extra spaces)
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Get cached search results
 */
export async function getCachedSearch(query: string): Promise<SearchResult[] | null> {
  const normalizedQuery = normalizeQuery(query);
  return await getCachedItem<SearchResult[]>(normalizedQuery, SEARCH_CACHE_PREFIX);
}

/**
 * Cache search results
 */
export async function cacheSearchResults(query: string, results: SearchResult[]): Promise<void> {
  const normalizedQuery = normalizeQuery(query);
  await setCachedItem(normalizedQuery, results, CACHE_TTL, SEARCH_CACHE_PREFIX);
}

/**
 * Clear all cached searches
 */
export async function clearSearchCache(): Promise<void> {
  await clearCacheByPrefix(SEARCH_CACHE_PREFIX);
}

/**
 * Clean up expired cache entries
 * Note: With the new caching utility, expired entries are automatically
 * removed when accessed, so this is a no-op for compatibility
 */
export async function cleanupSearchCache(): Promise<void> {
  // Automatic cleanup happens on access with the new caching utility
  // This function maintained for backward compatibility
}

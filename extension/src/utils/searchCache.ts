import type { SearchResult, SearchCache } from '../types/search';

const SEARCH_CACHE_KEY = 'search_cache';
const CACHE_EXPIRY_HOURS = 24;

/**
 * Get cached search results
 */
export async function getCachedSearch(query: string): Promise<SearchResult[] | null> {
  const result = await chrome.storage.local.get(SEARCH_CACHE_KEY);
  const cache = result[SEARCH_CACHE_KEY] || {};

  const normalizedQuery = normalizeQuery(query);
  const cached: SearchCache | undefined = cache[normalizedQuery];

  if (!cached) return null;

  // Check expiry
  const expiresAt = new Date(cached.expiresAt);
  if (expiresAt < new Date()) {
    // Expired
    delete cache[normalizedQuery];
    await chrome.storage.local.set({ [SEARCH_CACHE_KEY]: cache });
    return null;
  }

  return cached.results;
}

/**
 * Cache search results
 */
export async function cacheSearchResults(
  query: string,
  results: SearchResult[]
): Promise<void> {
  const result = await chrome.storage.local.get(SEARCH_CACHE_KEY);
  const cache = result[SEARCH_CACHE_KEY] || {};

  const normalizedQuery = normalizeQuery(query);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_EXPIRY_HOURS);

  cache[normalizedQuery] = {
    query,
    results,
    timestamp: new Date(),
    expiresAt
  };

  await chrome.storage.local.set({ [SEARCH_CACHE_KEY]: cache });
}

/**
 * Clear all cached searches
 */
export async function clearSearchCache(): Promise<void> {
  await chrome.storage.local.remove(SEARCH_CACHE_KEY);
}

/**
 * Normalize query for caching (lowercase, trim, remove extra spaces)
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Clean up expired cache entries
 */
export async function cleanupSearchCache(): Promise<void> {
  const result = await chrome.storage.local.get(SEARCH_CACHE_KEY);
  const cache = result[SEARCH_CACHE_KEY] || {};

  const now = new Date();
  let cleaned = false;

  for (const key in cache) {
    const entry: SearchCache = cache[key];
    if (new Date(entry.expiresAt) < now) {
      delete cache[key];
      cleaned = true;
    }
  }

  if (cleaned) {
    await chrome.storage.local.set({ [SEARCH_CACHE_KEY]: cache });
  }
}

import type { IndexedTab } from '../types/search';

const INDEXED_TABS_KEY = 'indexed_tabs';
const MAX_CONTENT_LENGTH = 5000; // Limit stored content size
const INDEX_EXPIRY_HOURS = 24;

/**
 * Index a tab's content for searching
 */
export async function indexTab(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.url) return;

  // Skip protected URLs
  if (tab.url.startsWith('chrome://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('chrome-extension://')) {
    return;
  }

  try {
    // Request content extraction from background script
    const response = await chrome.runtime.sendMessage({
      action: 'extractContent',
      tabId: tab.id,
      url: tab.url
    });

    if (!response.success) {
      console.warn(`Failed to extract content for tab ${tab.id}:`, response.error);
      return;
    }

    const content = response.data.content || '';

    // Truncate if too long
    const truncatedContent = content.length > MAX_CONTENT_LENGTH
      ? content.substring(0, MAX_CONTENT_LENGTH) + '...'
      : content;

    // Create indexed tab entry
    const indexedTab: IndexedTab = {
      tabId: tab.id,
      title: tab.title || '',
      url: tab.url,
      content: truncatedContent,
      contentHash: simpleHash(truncatedContent),
      lastAccessed: new Date().toISOString(),
      indexed: new Date().toISOString()
    };

    // Store in chrome.storage.local
    const result = await chrome.storage.local.get(INDEXED_TABS_KEY);
    const existingTabs = result[INDEXED_TABS_KEY] || {};

    existingTabs[tab.id] = indexedTab;

    await chrome.storage.local.set({ [INDEXED_TABS_KEY]: existingTabs });

    console.log(`Indexed tab ${tab.id}: ${tab.title}`);
  } catch (error) {
    console.error(`Failed to index tab ${tab.id}:`, error);
  }
}

/**
 * Get all indexed tabs
 */
export async function getIndexedTabs(): Promise<Map<number, IndexedTab>> {
  const result = await chrome.storage.local.get(INDEXED_TABS_KEY);
  const tabs = result[INDEXED_TABS_KEY] || {};

  return new Map(Object.entries(tabs).map(([id, tab]) => [parseInt(id), tab as IndexedTab]));
}

/**
 * Remove indexed tab
 */
export async function removeIndexedTab(tabId: number): Promise<void> {
  const result = await chrome.storage.local.get(INDEXED_TABS_KEY);
  const tabs = result[INDEXED_TABS_KEY] || {};

  delete tabs[tabId];

  await chrome.storage.local.set({ [INDEXED_TABS_KEY]: tabs });
}

/**
 * Clean up old indexed tabs (tabs that no longer exist)
 */
export async function cleanupIndexedTabs(): Promise<void> {
  const allTabs = await chrome.tabs.query({});
  const activeTabIds = new Set(allTabs.map(t => t.id).filter(id => id !== undefined));

  const result = await chrome.storage.local.get(INDEXED_TABS_KEY);
  const indexed = result[INDEXED_TABS_KEY] || {};

  let cleaned = false;
  for (const tabId in indexed) {
    if (!activeTabIds.has(parseInt(tabId))) {
      delete indexed[tabId];
      cleaned = true;
    }
  }

  if (cleaned) {
    await chrome.storage.local.set({ [INDEXED_TABS_KEY]: indexed });
    console.log('Cleaned up old indexed tabs');
  }
}

/**
 * Simple hash function for change detection
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Re-index tab if content has changed
 */
export async function reindexIfNeeded(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) return;

  const indexed = await getIndexedTabs();
  const existing = indexed.get(tab.id);

  if (!existing) {
    // Not indexed yet, index it
    await indexTab(tab);
    return;
  }

  // Check if URL changed
  if (existing.url !== tab.url) {
    await indexTab(tab);
    return;
  }

  // Check if content is stale (>24 hours)
  const age = Date.now() - new Date(existing.indexed).getTime();
  if (age > INDEX_EXPIRY_HOURS * 60 * 60 * 1000) {
    await indexTab(tab);
    return;
  }
}

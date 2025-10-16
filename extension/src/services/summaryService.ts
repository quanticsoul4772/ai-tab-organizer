import type { Tab, TabSummary, CategorySummary } from '../types';
import { storage } from '../utils/storage';

/**
 * Service for managing tab and category summarization
 */
export const summaryService = {
  /**
   * Summarize an individual tab
   * @param tab - Tab to summarize
   * @param apiKey - Anthropic API key
   * @returns Promise resolving to tab summary
   */
  async summarizeTab(tab: Tab, apiKey: string): Promise<TabSummary> {
    // Check cache first
    const cached = await storage.getCachedTabSummary(tab.id);
    if (cached) {
      console.log(`[SummaryService] Using cached summary for tab ${tab.id}`);
      return cached;
    }

    // Call background worker to generate summary
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'summarizeTab',
          tab: tab,
          apiKey: apiKey,
        },
        async (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response.success && response.data) {
            // Cache the summary
            await storage.cacheTabSummary(response.data);
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Failed to summarize tab'));
          }
        }
      );
    });
  },

  /**
   * Summarize a category of tabs
   * @param category - Category name
   * @param tabs - Array of tabs in the category
   * @param apiKey - Anthropic API key
   * @returns Promise resolving to category summary
   */
  async summarizeCategory(
    category: string,
    tabs: Tab[],
    apiKey: string
  ): Promise<CategorySummary> {
    // Check cache first
    const cached = await storage.getCachedCategorySummary(category);
    if (cached && cached.tabCount === tabs.length) {
      console.log(`[SummaryService] Using cached summary for category ${category}`);
      return cached;
    }

    // Call background worker to generate summary
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'summarizeCategory',
          tabs: tabs,
          categoryName: category,
          apiKey: apiKey,
        },
        async (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response.success && response.data) {
            // Cache the summary
            await storage.cacheCategorySummary(response.data);
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Failed to summarize category'));
          }
        }
      );
    });
  },

  /**
   * Get cached tab summary (without making API call)
   * @param tabId - Tab ID
   * @returns Promise resolving to cached summary or null
   */
  async getCachedTabSummary(tabId: number): Promise<TabSummary | null> {
    return await storage.getCachedTabSummary(tabId);
  },

  /**
   * Get cached category summary (without making API call)
   * @param category - Category name
   * @returns Promise resolving to cached summary or null
   */
  async getCachedCategorySummary(category: string): Promise<CategorySummary | null> {
    return await storage.getCachedCategorySummary(category);
  },

  /**
   * Clear all summary cache
   */
  async clearCache(): Promise<void> {
    await storage.clearSummaryCache();
    console.log('[SummaryService] Cache cleared');
  },

  /**
   * Remove a specific tab summary from cache
   * @param tabId - Tab ID
   */
  async removeCachedTabSummary(tabId: number): Promise<void> {
    await storage.removeCachedTabSummary(tabId);
  },

  /**
   * Remove a specific category summary from cache
   * @param category - Category name
   */
  async removeCachedCategorySummary(category: string): Promise<void> {
    await storage.removeCachedCategorySummary(category);
  },
};

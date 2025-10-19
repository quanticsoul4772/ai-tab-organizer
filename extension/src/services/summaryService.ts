import type { Tab, TabSummary, CategorySummary } from '../types';
import { storage } from '../utils/storage';
import { runtime } from '../core/browserApi';
import { BACKGROUND_ACTIONS } from '../constants/actions';

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
    const cached = tab.id !== undefined ? await storage.getCachedTabSummary(tab.id) : null;
    if (cached) {
      console.log(`[SummaryService] Using cached summary for tab ${tab.id}`);
      return cached;
    }

    // Call background worker to generate summary
    const summary = await runtime.sendMessage<TabSummary>(BACKGROUND_ACTIONS.SUMMARIZE_TAB, {
      tab,
      apiKey,
    });

    // Cache the summary
    await storage.cacheTabSummary(summary);
    return summary;
  },

  /**
   * Summarize a category of tabs
   * @param category - Category name
   * @param tabs - Array of tabs in the category
   * @param apiKey - Anthropic API key
   * @returns Promise resolving to category summary
   */
  async summarizeCategory(category: string, tabs: Tab[], apiKey: string): Promise<CategorySummary> {
    // Check cache first
    const cached = await storage.getCachedCategorySummary(category);
    if (cached && cached.tabCount === tabs.length) {
      console.log(`[SummaryService] Using cached summary for category ${category}`);
      return cached;
    }

    // Call background worker to generate summary
    const summary = await runtime.sendMessage<CategorySummary>(
      BACKGROUND_ACTIONS.SUMMARIZE_CATEGORY,
      { tabs, categoryName: category, apiKey }
    );

    // Cache the summary
    await storage.cacheCategorySummary(summary);
    return summary;
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

import type { SummaryCache, TabSummary, CategorySummary, SummarySettings, JiraSettings } from '../types';
import type { DensityMode } from '../types/density';

const STORAGE_KEYS = {
  API_KEY: 'anthropicApiKey',
  SUMMARY_CACHE: 'summaryCache',
  SUMMARY_SETTINGS: 'summarySettings',
  JIRA_SETTINGS: 'jiraSettings',
  DENSITY_MODE: 'densityMode',
} as const;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const storage = {
  /**
   * Get the stored API key from chrome.storage.local
   */
  async getApiKey(): Promise<string | null> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.API_KEY]);
    return result[STORAGE_KEYS.API_KEY] || null;
  },

  /**
   * Save the API key to chrome.storage.local
   */
  async setApiKey(apiKey: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.API_KEY]: apiKey });
  },

  /**
   * Remove the stored API key
   */
  async clearApiKey(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.API_KEY);
  },

  /**
   * Get summary cache from storage
   */
  async getSummaryCache(): Promise<SummaryCache> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.SUMMARY_CACHE]);
    return result[STORAGE_KEYS.SUMMARY_CACHE] || { tabs: {}, categories: {} };
  },

  /**
   * Save summary cache to storage
   */
  async setSummaryCache(cache: SummaryCache): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SUMMARY_CACHE]: cache });
  },

  /**
   * Get a cached tab summary
   */
  async getCachedTabSummary(tabId: number): Promise<TabSummary | null> {
    const cache = await this.getSummaryCache();
    const summary = cache.tabs[tabId];

    if (!summary) return null;

    // Check if cache is expired
    if (Date.now() - summary.timestamp > CACHE_DURATION) {
      await this.removeCachedTabSummary(tabId);
      return null;
    }

    return summary;
  },

  /**
   * Cache a tab summary
   */
  async cacheTabSummary(summary: TabSummary): Promise<void> {
    const cache = await this.getSummaryCache();
    cache.tabs[summary.tabId] = summary;
    await this.setSummaryCache(cache);
  },

  /**
   * Remove a cached tab summary
   */
  async removeCachedTabSummary(tabId: number): Promise<void> {
    const cache = await this.getSummaryCache();
    delete cache.tabs[tabId];
    await this.setSummaryCache(cache);
  },

  /**
   * Get a cached category summary
   */
  async getCachedCategorySummary(category: string): Promise<CategorySummary | null> {
    const cache = await this.getSummaryCache();
    const summary = cache.categories[category];

    if (!summary) return null;

    // Check if cache is expired
    if (Date.now() - summary.timestamp > CACHE_DURATION) {
      await this.removeCachedCategorySummary(category);
      return null;
    }

    return summary;
  },

  /**
   * Cache a category summary
   */
  async cacheCategorySummary(summary: CategorySummary): Promise<void> {
    const cache = await this.getSummaryCache();
    cache.categories[summary.category] = summary;
    await this.setSummaryCache(cache);
  },

  /**
   * Remove a cached category summary
   */
  async removeCachedCategorySummary(category: string): Promise<void> {
    const cache = await this.getSummaryCache();
    delete cache.categories[category];
    await this.setSummaryCache(cache);
  },

  /**
   * Clear all summary cache
   */
  async clearSummaryCache(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.SUMMARY_CACHE);
  },

  /**
   * Get summary settings
   */
  async getSummarySettings(): Promise<SummarySettings> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.SUMMARY_SETTINGS]);
    return result[STORAGE_KEYS.SUMMARY_SETTINGS] || { enabled: true, cacheDuration: 24 };
  },

  /**
   * Save summary settings
   */
  async setSummarySettings(settings: SummarySettings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SUMMARY_SETTINGS]: settings });
  },

  /**
   * Get Jira settings
   */
  async getJiraSettings(): Promise<JiraSettings> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JIRA_SETTINGS]);
    return result[STORAGE_KEYS.JIRA_SETTINGS] || { smartMode: true };
  },

  /**
   * Save Jira settings
   */
  async setJiraSettings(settings: JiraSettings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.JIRA_SETTINGS]: settings });
  },

  /**
   * Get density mode preference
   */
  async getDensityMode(): Promise<DensityMode | null> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.DENSITY_MODE]);
    return result[STORAGE_KEYS.DENSITY_MODE] || null;
  },

  /**
   * Save density mode preference
   */
  async setDensityMode(mode: DensityMode): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.DENSITY_MODE]: mode });
  },
};

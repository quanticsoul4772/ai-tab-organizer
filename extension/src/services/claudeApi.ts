import type { Tab, CategoryResponse, BackgroundResponse } from '../types';

/**
 * Service for interacting with Claude API via the background worker
 */
export const claudeApi = {
  /**
   * Categorize tabs using Claude API via background service worker
   * @param tabs - Array of tabs to categorize
   * @param apiKey - Anthropic API key
   * @returns Promise resolving to category mapping (category -> tab indices)
   */
  async categorizeTabs(tabs: Tab[], apiKey: string): Promise<CategoryResponse> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'categorize', tabs, apiKey },
        (response: BackgroundResponse) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response.success && response.data) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Failed to categorize tabs'));
          }
        }
      );
    });
  },
};

import type { Tab, CategoryResponse } from '../types';
import { runtime } from '../core/browserApi';
import { BACKGROUND_ACTIONS } from '../constants/actions';

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
    return await runtime.sendMessage<CategoryResponse>(
      BACKGROUND_ACTIONS.CATEGORIZE,
      { tabs, apiKey }
    );
  },
};

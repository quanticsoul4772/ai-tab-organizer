import type { Tab, CategoryResponse } from '../types';
import { runtime } from '../core/browserApi';
import { BACKGROUND_ACTIONS } from '../constants/actions';
import { storage } from '../utils/storage';

/**
 * Service for interacting with AI API via the background worker
 * Supports multiple providers: Anthropic Claude, OpenAI GPT, Google Gemini
 */
export const claudeApi = {
  /**
   * Categorize tabs using AI API via background service worker
   * @param tabs - Array of tabs to categorize
   * @param apiKey - API key for the selected provider
   * @returns Promise resolving to category mapping (category -> tab indices)
   */
  async categorizeTabs(tabs: Tab[], apiKey: string): Promise<CategoryResponse> {
    // Get provider settings from storage
    const providerSettings = await storage.getProviderSettings();

    console.log('[claudeApi] Categorizing tabs with provider:', providerSettings);
    console.log('[claudeApi] API key length:', apiKey?.length || 0);
    console.log('[claudeApi] Tab count:', tabs.length);

    try {
      const result = await runtime.sendMessage<CategoryResponse>(BACKGROUND_ACTIONS.CATEGORIZE, {
        tabs,
        apiKey,
        provider: providerSettings.provider,
        model: providerSettings.model,
      });
      console.log('[claudeApi] Categorization result:', result);
      return result;
    } catch (error) {
      console.error('[claudeApi] Categorization error:', error);
      throw error;
    }
  },
};

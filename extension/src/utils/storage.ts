const STORAGE_KEYS = {
  API_KEY: 'anthropicApiKey',
} as const;

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
};

import type { Tab } from '../types';

/**
 * Service for managing browser tabs
 */
export const tabManager = {
  /**
   * Get all open tabs
   */
  async getAllTabs(): Promise<Tab[]> {
    return await chrome.tabs.query({});
  },

  /**
   * Switch to a specific tab
   */
  async switchToTab(tabId: number): Promise<void> {
    await chrome.tabs.update(tabId, { active: true });
  },

  /**
   * Close a specific tab
   */
  async closeTab(tabId: number): Promise<void> {
    await chrome.tabs.remove(tabId);
  },
};

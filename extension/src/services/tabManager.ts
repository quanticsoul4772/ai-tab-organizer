import type { Tab } from '../types';
import { tabs } from '../core/browserApi';

/**
 * Service for managing browser tabs
 */
export const tabManager = {
  /**
   * Get all open tabs, filtering out browser internal pages and blank tabs
   */
  async getAllTabs(): Promise<Tab[]> {
    const allTabs = await tabs.getAll();

    // Filter out tabs that shouldn't be categorized
    return allTabs.filter((tab) => {
      // Skip tabs without URLs
      if (!tab.url) return false;

      // Skip browser internal pages
      const internalProtocols = [
        'chrome://',
        'chrome-extension://',
        'edge://',
        'about:',
        'view-source:',
      ];

      if (internalProtocols.some((protocol) => tab.url!.startsWith(protocol))) {
        return false;
      }

      // Skip new tabs (various patterns)
      const newTabPatterns = ['chrome://newtab', 'edge://newtab', 'about:newtab', 'about:blank'];

      if (newTabPatterns.some((pattern) => tab.url!.startsWith(pattern))) {
        return false;
      }

      return true;
    });
  },

  /**
   * Switch to a specific tab
   */
  async switchToTab(tabId: number): Promise<void> {
    await tabs.switchTo(tabId);
  },

  /**
   * Close a specific tab
   */
  async closeTab(tabId: number): Promise<void> {
    await tabs.close(tabId);
  },
};

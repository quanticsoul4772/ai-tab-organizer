import type { Tab } from '../types';
import { tabs } from '../core/browserApi';

/**
 * Service for managing browser tabs
 */
export const tabManager = {
  /**
   * Get all open tabs
   */
  async getAllTabs(): Promise<Tab[]> {
    return await tabs.getAll();
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

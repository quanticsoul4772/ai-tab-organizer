import type { Tab, BackgroundResponse } from '../types';
import { logger } from './logger';

/**
 * Browser API abstraction layer
 * Centralizes all Chrome API calls for easier testing and maintenance
 */

// ============================================================================
// TABS API
// ============================================================================

const tabs = {
  /**
   * Get all open tabs
   */
  async getAll(): Promise<Tab[]> {
    return await chrome.tabs.query({});
  },

  /**
   * Get the currently active tab
   */
  async getActive(): Promise<Tab | null> {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return activeTabs[0] || null;
  },

  /**
   * Get a specific tab by ID
   */
  async getById(tabId: number): Promise<Tab | null> {
    try {
      return await chrome.tabs.get(tabId);
    } catch (error) {
      // Tab might not exist
      logger.debug(`Tab ${tabId} not found`, 'browserApi.tabs.getById', error);
      return null;
    }
  },

  /**
   * Switch to a specific tab
   */
  async switchTo(tabId: number): Promise<void> {
    await chrome.tabs.update(tabId, { active: true });
  },

  /**
   * Close a specific tab
   */
  async close(tabId: number): Promise<void> {
    await chrome.tabs.remove(tabId);
  },

  /**
   * Close multiple tabs
   */
  async closeMultiple(tabIds: number[]): Promise<void> {
    await chrome.tabs.remove(tabIds);
  },

  /**
   * Create a new tab
   */
  async create(options: chrome.tabs.CreateProperties): Promise<Tab> {
    return await chrome.tabs.create(options);
  },

  /**
   * Update a tab
   */
  async update(tabId: number, updateProperties: chrome.tabs.UpdateProperties): Promise<Tab> {
    return await chrome.tabs.update(tabId, updateProperties);
  },

  /**
   * Query tabs based on criteria
   */
  async query(queryInfo: chrome.tabs.QueryInfo): Promise<Tab[]> {
    return await chrome.tabs.query(queryInfo);
  },
};

// ============================================================================
// STORAGE API
// ============================================================================

const storage = {
  /**
   * Get a single item from storage
   */
  async get<T>(key: string, defaultValue?: T): Promise<T | null> {
    const result = await chrome.storage.local.get([key]);
    return result[key] !== undefined ? result[key] : (defaultValue ?? null);
  },

  /**
   * Get multiple items from storage
   */
  async getMultiple<T extends Record<string, unknown>>(keys: string[]): Promise<Partial<T>> {
    const result = await chrome.storage.local.get(keys);
    return result as Partial<T>;
  },

  /**
   * Set a single item in storage
   */
  async set(key: string, value: unknown): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },

  /**
   * Set multiple items in storage
   */
  async setMultiple(items: Record<string, unknown>): Promise<void> {
    await chrome.storage.local.set(items);
  },

  /**
   * Remove a single item from storage
   */
  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  },

  /**
   * Remove multiple items from storage
   */
  async removeMultiple(keys: string[]): Promise<void> {
    await chrome.storage.local.remove(keys);
  },

  /**
   * Clear all items from storage
   */
  async clear(): Promise<void> {
    await chrome.storage.local.clear();
  },

  /**
   * Get all items from storage
   */
  async getAll(): Promise<Record<string, unknown>> {
    return await chrome.storage.local.get(null);
  },
};

// ============================================================================
// RUNTIME API (for background messaging)
// ============================================================================

const runtime = {
  /**
   * Send a message to the background service worker
   * Wraps the callback-based API in a Promise
   */
  async sendMessage<T = unknown>(action: string, data?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, ...data }, (response: BackgroundResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          resolve(response.data as T);
        } else {
          reject(new Error(response?.error || `Failed to execute action: ${action}`));
        }
      });
    });
  },

  /**
   * Get the extension's unique ID
   */
  getId(): string {
    return chrome.runtime.id;
  },

  /**
   * Get the URL for a resource within the extension
   */
  getURL(path: string): string {
    return chrome.runtime.getURL(path);
  },
};

// ============================================================================
// SCRIPTING API
// ============================================================================

const scripting = {
  /**
   * Execute a script in a tab
   */
  async executeScript<T>(tabId: number, options: chrome.scripting.ScriptInjection): Promise<T[]> {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      ...options,
    });
    return results.map((r) => r.result as T);
  },
};

// ============================================================================
// UNIFIED BROWSER API
// ============================================================================

/**
 * Main browser API object that consolidates all APIs
 */
export const browserApi = {
  tabs,
  storage,
  runtime,
  scripting,
};

// Export individual APIs for tree-shaking
export { tabs, storage, runtime, scripting };

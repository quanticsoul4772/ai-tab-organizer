import type {
  SummaryCache,
  TabSummary,
  CategorySummary,
  SummarySettings,
  JiraSettings,
} from '../types';
import type { DensityMode } from '../types/density';
import type { GroupStates } from '../types/groupState';
import type { Session, SessionListItem } from '../types/session';
import { storage as browserStorage } from '../core/browserApi';
import { AIProvider } from '../providers/base/types';

interface ProviderSettings {
  provider: AIProvider;
  model: string;
}

const STORAGE_KEYS = {
  API_KEY: 'anthropicApiKey',
  PROVIDER_SETTINGS: 'providerSettings',
  SUMMARY_CACHE: 'summaryCache',
  SUMMARY_SETTINGS: 'summarySettings',
  JIRA_SETTINGS: 'jiraSettings',
  DENSITY_MODE: 'densityMode',
  GROUP_STATES: 'groupStates',
  SESSIONS: 'sessions',
} as const;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const storage = {
  /**
   * Get the stored API key from chrome.storage.local
   */
  async getApiKey(): Promise<string | null> {
    return await browserStorage.get<string>(STORAGE_KEYS.API_KEY);
  },

  /**
   * Save the API key to chrome.storage.local
   */
  async setApiKey(apiKey: string): Promise<void> {
    await browserStorage.set(STORAGE_KEYS.API_KEY, apiKey);
  },

  /**
   * Remove the stored API key
   */
  async clearApiKey(): Promise<void> {
    await browserStorage.remove(STORAGE_KEYS.API_KEY);
  },

  /**
   * Get summary cache from storage
   */
  async getSummaryCache(): Promise<SummaryCache> {
    const cache = await browserStorage.get<SummaryCache>(STORAGE_KEYS.SUMMARY_CACHE, {
      tabs: {},
      categories: {},
    });
    return cache ?? { tabs: {}, categories: {} };
  },

  /**
   * Save summary cache to storage
   */
  async setSummaryCache(cache: SummaryCache): Promise<void> {
    await browserStorage.set(STORAGE_KEYS.SUMMARY_CACHE, cache);
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
    await browserStorage.remove(STORAGE_KEYS.SUMMARY_CACHE);
  },

  /**
   * Get summary settings
   */
  async getSummarySettings(): Promise<SummarySettings> {
    const settings = await browserStorage.get<SummarySettings>(STORAGE_KEYS.SUMMARY_SETTINGS, {
      enabled: true,
      cacheDuration: 24,
    });
    return settings ?? { enabled: true, cacheDuration: 24 };
  },

  /**
   * Save summary settings
   */
  async setSummarySettings(settings: SummarySettings): Promise<void> {
    await browserStorage.set(STORAGE_KEYS.SUMMARY_SETTINGS, settings);
  },

  /**
   * Get Jira settings
   */
  async getJiraSettings(): Promise<JiraSettings> {
    const settings = await browserStorage.get<JiraSettings>(STORAGE_KEYS.JIRA_SETTINGS, {
      smartMode: true,
    });
    return settings ?? { smartMode: true };
  },

  /**
   * Save Jira settings
   */
  async setJiraSettings(settings: JiraSettings): Promise<void> {
    await browserStorage.set(STORAGE_KEYS.JIRA_SETTINGS, settings);
  },

  /**
   * Get density mode preference
   */
  async getDensityMode(): Promise<DensityMode | null> {
    return await browserStorage.get<DensityMode>(STORAGE_KEYS.DENSITY_MODE);
  },

  /**
   * Save density mode preference
   */
  async setDensityMode(mode: DensityMode): Promise<void> {
    await browserStorage.set(STORAGE_KEYS.DENSITY_MODE, mode);
  },

  /**
   * Get group collapse states
   */
  async getGroupStates(): Promise<GroupStates> {
    const states = await browserStorage.get<GroupStates>(STORAGE_KEYS.GROUP_STATES, {});
    return states ?? {};
  },

  /**
   * Set collapse state for a specific group
   */
  async setGroupState(categoryId: string, isCollapsed: boolean): Promise<void> {
    const states = await this.getGroupStates();
    states[categoryId] = isCollapsed;
    await browserStorage.set(STORAGE_KEYS.GROUP_STATES, states);
  },

  /**
   * Clear all group states
   */
  async clearGroupStates(): Promise<void> {
    await browserStorage.remove(STORAGE_KEYS.GROUP_STATES);
  },

  /**
   * Get all sessions (returns list items only, not full session data)
   */
  async getAllSessions(): Promise<SessionListItem[]> {
    const sessions = await browserStorage.get<Record<string, Session>>(STORAGE_KEYS.SESSIONS, {});
    const sessionsObj = sessions ?? {};
    return Object.values(sessionsObj).map((session: Session) => ({
      id: session.id,
      name: session.name,
      description: session.description,
      created: session.created,
      lastModified: session.lastModified,
      tabCount: session.metadata.tabCount,
      preview: session.tabs
        .slice(0, 3)
        .map((t) => t.title)
        .join(', '),
      categories: session.metadata.categories,
      jiraTickets: session.metadata.jiraTickets,
    }));
  },

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const sessions = await browserStorage.get<Record<string, Session>>(STORAGE_KEYS.SESSIONS, {});
    const sessionsObj = sessions ?? {};
    return sessionsObj[sessionId] || null;
  },

  /**
   * Save a session
   */
  async saveSession(session: Session): Promise<void> {
    const sessions = await browserStorage.get<Record<string, Session>>(STORAGE_KEYS.SESSIONS, {});
    const sessionsObj = sessions ?? {};
    sessionsObj[session.id] = session;
    await browserStorage.set(STORAGE_KEYS.SESSIONS, sessionsObj);
  },

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await browserStorage.get<Record<string, Session>>(STORAGE_KEYS.SESSIONS, {});
    const sessionsObj = sessions ?? {};
    delete sessionsObj[sessionId];
    await browserStorage.set(STORAGE_KEYS.SESSIONS, sessionsObj);
  },

  /**
   * Update session metadata (name, description, etc.)
   */
  async updateSessionMetadata(
    sessionId: string,
    updates: Partial<Pick<Session, 'name' | 'description'>>
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const updatedSession: Session = {
      ...session,
      ...updates,
      lastModified: Date.now(),
    };

    await this.saveSession(updatedSession);
  },

  /**
   * Get provider settings
   */
  async getProviderSettings(): Promise<ProviderSettings> {
    const settings = await browserStorage.get<ProviderSettings>(STORAGE_KEYS.PROVIDER_SETTINGS, {
      provider: AIProvider.ANTHROPIC,
      model: 'claude-3-5-sonnet-20241022',
    });
    return (
      settings ?? {
        provider: AIProvider.ANTHROPIC,
        model: 'claude-3-5-sonnet-20241022',
      }
    );
  },

  /**
   * Save provider settings
   */
  async setProviderSettings(settings: ProviderSettings): Promise<void> {
    await browserStorage.set(STORAGE_KEYS.PROVIDER_SETTINGS, settings);
  },
};

// Export ProviderSettings type for use in other modules
export type { ProviderSettings };

import { useState, useEffect } from 'react';
import type {
  Tab,
  CategorizedTabs,
  CategoryResponse,
  TabSummary,
  CategorySummary,
  SummarySettings,
  JiraSettings,
} from '../types';
import type { DensityMode } from '../types/density';
import { getAutoSelectedDensity } from '../types/density';
import { storage } from '../utils/storage';
import { tabManager } from '../services/tabManager';
import { claudeApi } from '../services/claudeApi';
import { summaryService } from '../services/summaryService';

type View = 'categories' | 'search' | 'duplicates' | 'jira' | 'sessions' | 'settings';

/**
 * Custom hook to manage popup state and initialization
 *
 * Manages:
 * - Tabs loading and categorization
 * - API key and settings persistence
 * - View navigation
 * - Density mode
 * - Error handling
 *
 * @returns Object containing popup state and handlers
 */
export function usePopupState() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [categorized, setCategorized] = useState<CategorizedTabs>({});
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [activeView, setActiveView] = useState<View>('categories');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [summarySettings, setSummarySettings] = useState<SummarySettings>({
    enabled: true,
    cacheDuration: 24,
  });
  const [jiraSettings, setJiraSettings] = useState<JiraSettings>({
    smartMode: true,
  });
  const [densityMode, setDensityMode] = useState<DensityMode>('normal');

  useEffect(() => {
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Initialize the app by loading tabs and API key
   */
  const initializeApp = async () => {
    await loadTabs();
    await loadApiKey();
    await loadSummarySettings();
    await loadJiraSettings();
    await loadDensityMode();
  };

  /**
   * Load API key from storage
   */
  const loadApiKey = async () => {
    const key = await storage.getApiKey();
    if (key) {
      setApiKey(key);
    }
  };

  /**
   * Load summary settings from storage
   */
  const loadSummarySettings = async () => {
    const settings = await storage.getSummarySettings();
    setSummarySettings(settings);
  };

  /**
   * Load Jira settings from storage
   */
  const loadJiraSettings = async () => {
    const settings = await storage.getJiraSettings();
    setJiraSettings(settings);
  };

  /**
   * Load density mode from storage or auto-select based on tab count
   */
  const loadDensityMode = async () => {
    const storedMode = await storage.getDensityMode();
    if (storedMode) {
      setDensityMode(storedMode);
    } else {
      // Auto-select based on tab count
      const autoMode = getAutoSelectedDensity(tabs.length);
      setDensityMode(autoMode);
      await storage.setDensityMode(autoMode);
    }
  };

  /**
   * Handle density mode change
   */
  const handleDensityChange = async (mode: DensityMode) => {
    console.log('handleDensityChange called with mode:', mode);
    setDensityMode(mode);
    await storage.setDensityMode(mode);
    console.log('Density mode saved to storage:', mode);
  };

  /**
   * Save settings to storage and trigger categorization
   */
  const saveSettings = async () => {
    await storage.setApiKey(apiKey);
    await storage.setSummarySettings(summarySettings);
    await storage.setJiraSettings(jiraSettings);
    setShowSettings(false);
    if (tabs.length > 0) {
      categorizeTabs(tabs);
    }
  };

  /**
   * Clear summary cache
   */
  const handleClearCache = async () => {
    await storage.clearSummaryCache();
    alert('Summary cache cleared successfully!');
  };

  /**
   * Load all browser tabs and categorize if API key exists
   */
  const loadTabs = async () => {
    const allTabs = await tabManager.getAllTabs();
    setTabs(allTabs);

    const key = await storage.getApiKey();
    if (key) {
      categorizeTabs(allTabs);
    } else {
      setLoading(false);
      setShowSettings(true);
    }
  };

  /**
   * Categorize tabs using Claude API
   */
  const categorizeTabs = async (tabList: Tab[]) => {
    setLoading(true);
    setError('');

    const key = await storage.getApiKey();
    if (!key) {
      setLoading(false);
      setShowSettings(true);
      return;
    }

    try {
      const categories: CategoryResponse = await claudeApi.categorizeTabs(tabList, key);
      const result: CategorizedTabs = {};

      for (const [category, indices] of Object.entries(categories)) {
        result[category] = indices.map((i) => tabList[i]).filter(Boolean);
      }

      setCategorized(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to categorize tabs';
      setError(errorMessage);
      // Fallback to showing all tabs in one category
      setCategorized({ 'All Tabs': tabList });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch to a specific tab
   */
  const handleTabClick = (tabId: number) => {
    tabManager.switchToTab(tabId);
  };

  /**
   * Close a tab and update state
   */
  const handleTabClose = (tabId: number) => {
    tabManager.closeTab(tabId);

    // Update local state
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    setCategorized((prev) => {
      const updated = { ...prev };
      for (const category in updated) {
        updated[category] = updated[category].filter((t) => t.id !== tabId);
        if (updated[category].length === 0) {
          delete updated[category];
        }
      }
      return updated;
    });
  };

  /**
   * Request a summary for a tab
   */
  const handleTabSummaryRequest = async (tab: Tab): Promise<TabSummary> => {
    const key = await storage.getApiKey();
    if (!key) {
      throw new Error('API key not configured');
    }
    return await summaryService.summarizeTab(tab, key);
  };

  /**
   * Request a summary for a category
   */
  const handleCategorySummaryRequest = async (
    category: string,
    tabs: Tab[]
  ): Promise<CategorySummary> => {
    const key = await storage.getApiKey();
    if (!key) {
      throw new Error('API key not configured');
    }
    return await summaryService.summarizeCategory(category, tabs, key);
  };

  return {
    // State
    tabs,
    categorized,
    loading,
    apiKey,
    activeView,
    showSettings,
    error,
    summarySettings,
    jiraSettings,
    densityMode,

    // Setters
    setApiKey,
    setActiveView,
    setShowSettings,
    setError,
    setSummarySettings,
    setJiraSettings,

    // Handlers
    handleDensityChange,
    saveSettings,
    handleClearCache,
    handleTabClick,
    handleTabClose,
    handleTabSummaryRequest,
    handleCategorySummaryRequest,
  };
}

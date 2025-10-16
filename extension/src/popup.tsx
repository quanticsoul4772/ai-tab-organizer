import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

import type {
  Tab,
  CategorizedTabs,
  CategoryResponse,
  TabSummary,
  CategorySummary,
  SummarySettings,
  JiraSettings,
} from './types';
import { storage } from './utils/storage';
import { tabManager } from './services/tabManager';
import { claudeApi } from './services/claudeApi';
import { summaryService } from './services/summaryService';
import { SettingsPanel } from './components/SettingsPanel';
import { CategoryView } from './components/CategoryView';
import { TabSearch } from './components/TabSearch';
import { DuplicateDetection } from './components/DuplicateDetection';
import { JiraView } from './components/JiraView';
import './components/TabSearch.css';
import './components/DuplicateDetection.css';
import './components/JiraView.css';

type View = 'categories' | 'search' | 'duplicates' | 'jira' | 'settings';

function Popup() {
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

  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize the app by loading tabs and API key
   */
  const initializeApp = async () => {
    await loadTabs();
    await loadApiKey();
    await loadSummarySettings();
    await loadJiraSettings();
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

  // Render settings panel if shown
  if (showSettings) {
    return (
      <SettingsPanel
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        summarySettings={summarySettings}
        onSummarySettingsChange={setSummarySettings}
        jiraSettings={jiraSettings}
        onJiraSettingsChange={setJiraSettings}
        onSave={saveSettings}
        onClearCache={handleClearCache}
      />
    );
  }

  // Render loading state
  if (loading) {
    return <div className="loading">AI is organizing your tabs...</div>;
  }

  // Render main popup with navigation
  return (
    <div className="popup">
      <div className="header">
        <h1>AI Tab Organizer</h1>
        <button onClick={() => setShowSettings(true)} className="settings-btn">
          Settings
        </button>
      </div>

      {/* Navigation */}
      <nav className="popup-nav">
        <button
          onClick={() => setActiveView('search')}
          className={activeView === 'search' ? 'nav-btn active' : 'nav-btn'}
        >
          Search
        </button>
        <button
          onClick={() => setActiveView('categories')}
          className={activeView === 'categories' ? 'nav-btn active' : 'nav-btn'}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveView('jira')}
          className={activeView === 'jira' ? 'nav-btn active' : 'nav-btn'}
        >
          Jira
        </button>
        <button
          onClick={() => setActiveView('duplicates')}
          className={activeView === 'duplicates' ? 'nav-btn active' : 'nav-btn'}
        >
          Duplicates
        </button>
      </nav>

      {activeView === 'categories' && (
        <>
          <div className="stats">{tabs.length} tabs open</div>
          {error && <div className="error">{error}</div>}
          <CategoryView
            categorizedTabs={categorized}
            onTabClick={handleTabClick}
            onTabClose={handleTabClose}
            onTabSummaryRequest={handleTabSummaryRequest}
            onCategorySummaryRequest={handleCategorySummaryRequest}
            summariesEnabled={summarySettings.enabled}
          />
        </>
      )}

      {activeView === 'search' && <TabSearch />}

      {activeView === 'jira' && <JiraView />}

      {activeView === 'duplicates' && <DuplicateDetection />}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);

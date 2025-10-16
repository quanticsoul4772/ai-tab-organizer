import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

import type { Tab, CategorizedTabs, CategoryResponse } from './types';
import { storage } from './utils/storage';
import { tabManager } from './services/tabManager';
import { claudeApi } from './services/claudeApi';
import { SettingsPanel } from './components/SettingsPanel';
import { CategoryView } from './components/CategoryView';

function Popup() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [categorized, setCategorized] = useState<CategorizedTabs>({});
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize the app by loading tabs and API key
   */
  const initializeApp = async () => {
    await loadTabs();
    await loadApiKey();
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
   * Save API key to storage and trigger categorization
   */
  const saveApiKey = async () => {
    await storage.setApiKey(apiKey);
    setShowSettings(false);
    if (tabs.length > 0) {
      categorizeTabs(tabs);
    }
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

  // Render settings panel if shown
  if (showSettings) {
    return (
      <SettingsPanel apiKey={apiKey} onApiKeyChange={setApiKey} onSave={saveApiKey} />
    );
  }

  // Render loading state
  if (loading) {
    return <div className="loading">🤖 AI is organizing your tabs...</div>;
  }

  // Render main popup with categorized tabs
  return (
    <div className="popup">
      <div className="header">
        <h1>🗂️ AI Tab Organizer</h1>
        <button onClick={() => setShowSettings(true)} className="settings-btn">
          ⚙️
        </button>
      </div>
      <div className="stats">{tabs.length} tabs open</div>

      {error && <div className="error">{error}</div>}

      <CategoryView
        categorizedTabs={categorized}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
      />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);

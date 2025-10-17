import React, { useState, useEffect } from 'react';
import type { CategorizedTabs, Tab, TabSummary, CategorySummary } from '../types';
import type { DensityMode } from '../types/density';
import { TabList } from './TabList';
import { CategorySummaryCard } from './CategorySummaryCard';
import { GroupHeader } from './shared/GroupHeader';
import { storage } from '../utils/storage';
import { getDefaultCollapseState } from '../utils/groupDefaults';

interface CategoryViewProps {
  categorizedTabs: CategorizedTabs;
  onTabClick: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
  onTabSummaryRequest?: (tab: Tab) => Promise<TabSummary>;
  onCategorySummaryRequest?: (category: string, tabs: Tab[]) => Promise<CategorySummary>;
  summariesEnabled?: boolean;
  densityMode?: DensityMode;
}

/**
 * Component for rendering categorized tabs
 */
export function CategoryView({
  categorizedTabs,
  onTabClick,
  onTabClose,
  onTabSummaryRequest,
  onCategorySummaryRequest,
  summariesEnabled = true,
  densityMode = 'normal'
}: CategoryViewProps) {
  console.log('CategoryView rendered with densityMode:', densityMode);

  const [activeCategorySummary, setActiveCategorySummary] = useState<CategorySummary | null>(null);
  const [loadingCategorySummary, setLoadingCategorySummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [groupStates, setGroupStates] = useState<{ [key: string]: boolean }>({});

  // Load group collapse states on mount and when categories change
  useEffect(() => {
    const loadStates = async () => {
      const savedStates = await storage.getGroupStates();
      const initialStates: { [key: string]: boolean } = {};

      Object.entries(categorizedTabs).forEach(([category, tabs]) => {
        // Use saved state if available, otherwise use smart default
        initialStates[category] = savedStates[category] ?? getDefaultCollapseState(category, tabs);
      });

      setGroupStates(initialStates);
    };

    loadStates();
  }, [categorizedTabs]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Left Arrow: Collapse All
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        collapseAll();
      }
      // Cmd/Ctrl + Right Arrow: Expand All
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        expandAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [categorizedTabs]);

  const handleCategorySummaryClick = async (category: string, tabs: Tab[]) => {
    if (!onCategorySummaryRequest) return;

    setLoadingCategorySummary(category);
    setSummaryError(null);

    try {
      const summary = await onCategorySummaryRequest(category, tabs);
      setActiveCategorySummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate summary';
      setSummaryError(message);
    } finally {
      setLoadingCategorySummary(null);
    }
  };

  const handleCloseCategorySummary = () => {
    setActiveCategorySummary(null);
    setSummaryError(null);
  };

  const toggleGroup = async (categoryId: string) => {
    const newState = !groupStates[categoryId];
    setGroupStates(prev => ({ ...prev, [categoryId]: newState }));
    await storage.setGroupState(categoryId, newState);
  };

  const collapseAll = async () => {
    const newStates: { [key: string]: boolean } = {};
    Object.keys(categorizedTabs).forEach(key => {
      newStates[key] = true;
    });
    setGroupStates(newStates);

    // Persist all states
    for (const [key, value] of Object.entries(newStates)) {
      await storage.setGroupState(key, value);
    }
  };

  const expandAll = async () => {
    const newStates: { [key: string]: boolean } = {};
    Object.keys(categorizedTabs).forEach(key => {
      newStates[key] = false;
    });
    setGroupStates(newStates);

    // Persist all states
    for (const [key, value] of Object.entries(newStates)) {
      await storage.setGroupState(key, value);
    }
  };

  const handleCloseAll = async (category: string, tabs: Tab[]) => {
    for (const tab of tabs) {
      await chrome.tabs.remove(tab.id);
      onTabClose(tab.id);
    }
  };

  const handleBookmarkAll = async (category: string, tabs: Tab[]) => {
    const folderName = `${category} - ${new Date().toLocaleDateString()}`;
    const folder = await chrome.bookmarks.create({ title: folderName });

    for (const tab of tabs) {
      await chrome.bookmarks.create({
        parentId: folder.id,
        title: tab.title,
        url: tab.url,
      });
    }

    alert(`Bookmarked ${tabs.length} tabs to folder "${folderName}"`);
  };

  const hasMultipleGroups = Object.keys(categorizedTabs).length > 1;

  return (
    <div className="categories">
      {hasMultipleGroups && (
        <div className="group-controls" style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 12px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <button
            onClick={collapseAll}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              cursor: 'pointer',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#374151'
            }}
          >
            Collapse All
          </button>
          <button
            onClick={expandAll}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              cursor: 'pointer',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#374151'
            }}
          >
            Expand All
          </button>
        </div>
      )}
      {Object.entries(categorizedTabs).map(([category, categoryTabs]) => {
        const isCollapsed = groupStates[category] ?? false;

        // Check if any tabs in this group are active (opened in last 5 minutes)
        // This is a simple heuristic - in production you'd check actual lastAccessed times
        const hasRecentActivity = categoryTabs.length >= 5; // Large groups tend to be active

        return (
          <div
            key={category}
            className="category"
            style={{
              borderLeft: hasRecentActivity ? '3px solid #3b82f6' : 'none',
              paddingLeft: hasRecentActivity ? '9px' : '12px',
            }}
          >
            <GroupHeader
              categoryId={category}
              categoryName={category}
              tabCount={categoryTabs.length}
              isCollapsed={isCollapsed}
              onToggle={() => toggleGroup(category)}
              onSummarize={
                summariesEnabled && onCategorySummaryRequest && categoryTabs.length > 1
                  ? () => handleCategorySummaryClick(category, categoryTabs)
                  : undefined
              }
              isLoadingSummary={loadingCategorySummary === category}
              summariesEnabled={summariesEnabled}
              onCloseAll={() => handleCloseAll(category, categoryTabs)}
              onBookmarkAll={() => handleBookmarkAll(category, categoryTabs)}
            />
            {activeCategorySummary && activeCategorySummary.category === category && (
              <CategorySummaryCard
                summary={activeCategorySummary}
                onClose={handleCloseCategorySummary}
              />
            )}
            {summaryError && loadingCategorySummary === null && (
              <div className="summary-error">
                {summaryError}
                <button onClick={() => setSummaryError(null)} className="error-close-btn">
                  ✕
                </button>
              </div>
            )}
            <div
              style={{
                maxHeight: isCollapsed ? '0px' : '10000px',
                overflow: 'hidden',
                transition: 'max-height 0.2s ease-in-out',
              }}
            >
              <TabList
                tabs={categoryTabs}
                onTabClick={onTabClick}
                onTabClose={onTabClose}
                onSummaryRequest={onTabSummaryRequest}
                summariesEnabled={summariesEnabled}
                densityMode={densityMode}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

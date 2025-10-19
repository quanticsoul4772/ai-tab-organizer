import { useMemo, useCallback } from 'react';
import type { CategorizedTabs, Tab, TabSummary, CategorySummary } from '../../../types';
import { TabList } from '../../TabList';
import { CategorySummaryCard } from './CategorySummaryCard';
import { GroupHeader } from '../../shared/GroupHeader';
import { useCategoryState } from '../../../hooks/useCategoryState';
import { useDensity } from '../../../context/DensityContext';

interface CategoryViewProps {
  categorizedTabs: CategorizedTabs;
  onTabClick: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
  onTabSummaryRequest?: (tab: Tab) => Promise<TabSummary>;
  onCategorySummaryRequest?: (category: string, tabs: Tab[]) => Promise<CategorySummary>;
  summariesEnabled?: boolean;
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
}: CategoryViewProps) {
  const { densityMode } = useDensity();

  // Use custom hook for category state management
  const {
    groupStates,
    activeCategorySummary,
    loadingCategorySummary,
    summaryError,
    toggleGroup,
    collapseAll,
    expandAll,
    handleCategorySummaryClick,
    handleCloseCategorySummary,
    setSummaryError,
  } = useCategoryState({
    categorizedTabs,
    onCategorySummaryRequest,
  });

  const handleCloseAll = useCallback(
    async (_category: string, tabs: Tab[]) => {
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          await chrome.tabs.remove(tab.id);
          onTabClose(tab.id);
        }
      }
    },
    [onTabClose]
  );

  const handleBookmarkAll = useCallback(async (category: string, tabs: Tab[]) => {
    const folderName = `${category} - ${new Date().toLocaleDateString()}`;
    const folder = await chrome.bookmarks.create({ title: folderName });

    for (const tab of tabs) {
      if (tab.url && tab.title) {
        await chrome.bookmarks.create({
          parentId: folder.id,
          title: tab.title,
          url: tab.url,
        });
      }
    }

    alert(`Bookmarked ${tabs.length} tabs to folder "${folderName}"`);
  }, []);

  // Memoize expensive computation
  const sortedCategories = useMemo(() => {
    return Object.entries(categorizedTabs).sort(([a], [b]) => a.localeCompare(b));
  }, [categorizedTabs]);

  const hasMultipleGroups = useMemo(() => {
    return Object.keys(categorizedTabs).length > 1;
  }, [categorizedTabs]);

  return (
    <div className="categories">
      {hasMultipleGroups && (
        <div
          className="group-controls"
          style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <button
            onClick={collapseAll}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              cursor: 'pointer',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#374151',
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
              color: '#374151',
            }}
          >
            Expand All
          </button>
        </div>
      )}
      {sortedCategories.map(([category, categoryTabs]) => {
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

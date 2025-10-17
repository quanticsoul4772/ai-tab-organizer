import React, { useState } from 'react';
import type { CategorizedTabs, Tab, TabSummary, CategorySummary } from '../types';
import type { DensityMode } from '../types/density';
import { TabList } from './TabList';
import { CategorySummaryCard } from './CategorySummaryCard';

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

  return (
    <div className="categories">
      {Object.entries(categorizedTabs).map(([category, categoryTabs]) => (
        <div key={category} className="category">
          <div className="category-header">
            <h3>
              {category} ({categoryTabs.length})
            </h3>
            {summariesEnabled && onCategorySummaryRequest && categoryTabs.length > 1 && (
              <button
                onClick={() => handleCategorySummaryClick(category, categoryTabs)}
                className="category-summary-btn"
                title="Get AI summary of this category"
                disabled={loadingCategorySummary === category}
              >
                {loadingCategorySummary === category ? '⏳ Summarizing...' : '📝 Summarize'}
              </button>
            )}
          </div>
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
          <TabList
            tabs={categoryTabs}
            onTabClick={onTabClick}
            onTabClose={onTabClose}
            onSummaryRequest={onTabSummaryRequest}
            summariesEnabled={summariesEnabled}
            densityMode={densityMode}
          />
        </div>
      ))}
    </div>
  );
}

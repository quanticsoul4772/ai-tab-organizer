import React, { useState } from 'react';
import type { Tab, TabSummary } from '../types';
import { SummaryCard } from './SummaryCard';
import { VirtualTabList } from './shared/VirtualTabList';
import { useDensity } from '../context/DensityContext';

interface TabListProps {
  tabs: Tab[];
  onTabClick: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
  onSummaryRequest?: (tab: Tab) => Promise<TabSummary>;
  summariesEnabled?: boolean;
  useVirtualScrolling?: boolean;
}

/**
 * Component for rendering a list of tabs
 */
export function TabList({
  tabs,
  onTabClick,
  onTabClose,
  onSummaryRequest,
  summariesEnabled = true,
  useVirtualScrolling = true,
}: TabListProps) {
  const { densityMode } = useDensity();

  const [activeSummary, setActiveSummary] = useState<TabSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<number | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleSummaryClick = async (tab: Tab, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!onSummaryRequest) return;

    setLoadingSummary(tab.id);
    setSummaryError(null);

    try {
      const summary = await onSummaryRequest(tab);
      setActiveSummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate summary';
      setSummaryError(message);
    } finally {
      setLoadingSummary(null);
    }
  };

  const handleCloseSummary = () => {
    setActiveSummary(null);
    setSummaryError(null);
  };

  const handleTabClickWrapper = (tab: chrome.tabs.Tab) => {
    if (tab.id) {
      onTabClick(tab.id);
    }
  };

  // Always use virtual scrolling when enabled to support density modes
  if (useVirtualScrolling) {
    return (
      <div>
        <VirtualTabList
          tabs={tabs}
          densityMode={densityMode}
          onTabClick={handleTabClickWrapper}
          onTabClose={onTabClose}
        />
        {activeSummary && (
          <SummaryCard summary={activeSummary} onClose={handleCloseSummary} />
        )}
        {summaryError && (
          <div className="summary-error">
            {summaryError}
            <button onClick={() => setSummaryError(null)} className="error-close-btn">
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  // Original rendering for small lists
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <div key={tab.id} className="tab-container">
          <div className="tab">
            <img
              src={tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}
              className="favicon"
              alt=""
            />
            <div className="tab-info" onClick={() => onTabClick(tab.id)}>
              <div className="tab-title">{tab.title}</div>
              <div className="tab-url">{new URL(tab.url).hostname}</div>
            </div>
            {summariesEnabled && onSummaryRequest && (
              <button
                onClick={(e) => handleSummaryClick(tab, e)}
                className="summary-btn"
                title="Get AI summary"
                disabled={loadingSummary === tab.id}
              >
                {loadingSummary === tab.id ? '⏳' : '💬'}
              </button>
            )}
            <button onClick={() => onTabClose(tab.id)} className="close-btn">
              ✕
            </button>
          </div>
          {activeSummary && activeSummary.tabId === tab.id && (
            <SummaryCard summary={activeSummary} onClose={handleCloseSummary} />
          )}
          {summaryError && loadingSummary === null && (
            <div className="summary-error">
              {summaryError}
              <button onClick={() => setSummaryError(null)} className="error-close-btn">
                ✕
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

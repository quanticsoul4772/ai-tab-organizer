import { memo } from 'react';

interface GroupHeaderProps {
  categoryId: string;
  categoryName: string;
  tabCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  memoryUsage?: number;
  onSummarize?: () => void;
  isLoadingSummary?: boolean;
  summariesEnabled?: boolean;
  onCloseAll?: () => void;
  onBookmarkAll?: () => void;
}

export const GroupHeader = memo(function GroupHeader({
  categoryId,
  categoryName,
  tabCount,
  isCollapsed,
  onToggle,
  memoryUsage,
  onSummarize,
  isLoadingSummary = false,
  summariesEnabled = true,
  onCloseAll,
  onBookmarkAll,
}: GroupHeaderProps) {
  const handleHeaderClick = () => {
    onToggle();
  };

  const handleSummarizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSummarize) {
      onSummarize();
    }
  };

  const handleCloseAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCloseAll && confirm(`Close all ${tabCount} tabs in "${categoryName}"?`)) {
      onCloseAll();
    }
  };

  const handleBookmarkAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBookmarkAll) {
      onBookmarkAll();
    }
  };

  return (
    <div
      className="category-header"
      onClick={handleHeaderClick}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '14px',
            color: '#9ca3af',
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
            transition: 'transform 0.2s ease-in-out',
            display: 'inline-block',
          }}
        >
          ▶
        </span>
        <span>{categoryName} ({tabCount})</span>
        {memoryUsage && (
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'normal' }}>
            • {Math.round(memoryUsage / (1024 * 1024))}MB
          </span>
        )}
      </h3>
      <div style={{ display: 'flex', gap: '4px' }}>
        {summariesEnabled && onSummarize && tabCount > 1 && (
          <button
            onClick={handleSummarizeClick}
            className="category-summary-btn"
            title="Get AI summary of this category"
            disabled={isLoadingSummary}
          >
            {isLoadingSummary ? '⏳ Summarizing...' : '📝 Summarize'}
          </button>
        )}
        {onCloseAll && (
          <button
            onClick={handleCloseAll}
            className="category-summary-btn"
            title="Close all tabs in this category"
            style={{ backgroundColor: '#ef4444', color: 'white', border: '1px solid #dc2626' }}
          >
            ✕ Close All
          </button>
        )}
        {onBookmarkAll && (
          <button
            onClick={handleBookmarkAll}
            className="category-summary-btn"
            title="Bookmark all tabs in this category"
          >
            ★ Bookmark All
          </button>
        )}
      </div>
    </div>
  );
});

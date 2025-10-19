import { useState } from 'react';
import type { CategorySummary } from '../../../types';

interface CategorySummaryCardProps {
  summary: CategorySummary;
  onClose: () => void;
}

/**
 * Component for displaying a category summary
 */
export function CategorySummaryCard({ summary, onClose }: CategorySummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summary.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="category-summary-card">
      <div className="category-summary-header">
        <span className="category-summary-title">
          📝 Category Summary ({summary.tabCount} tabs)
        </span>
        <div className="category-summary-actions">
          <button
            onClick={copyToClipboard}
            className="summary-action-btn"
            title="Copy to clipboard"
          >
            {copied ? '✓' : '📋'}
          </button>
          <button onClick={onClose} className="summary-action-btn" title="Close">
            ✕
          </button>
        </div>
      </div>
      <div className="category-summary-content">
        <p className="category-summary-text">{summary.summary}</p>
        <div className="category-summary-meta">
          <span className="summary-meta-item">{formatTimestamp(summary.timestamp)}</span>
          <span className="summary-meta-item">{summary.tokens} tokens</span>
        </div>
      </div>
    </div>
  );
}

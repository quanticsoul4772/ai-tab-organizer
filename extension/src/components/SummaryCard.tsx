import React, { useState } from 'react';
import type { TabSummary } from '../types';

interface SummaryCardProps {
  summary: TabSummary;
  onClose: () => void;
}

/**
 * Component for displaying an individual tab summary
 */
export function SummaryCard({ summary, onClose }: SummaryCardProps) {
  const [expanded, setExpanded] = useState(true);
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
    <div className="summary-card">
      <div className="summary-header">
        <span className="summary-title">AI Summary</span>
        <div className="summary-actions">
          <button
            onClick={() => setExpanded(!expanded)}
            className="summary-action-btn"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '▶'}
          </button>
          <button
            onClick={copyToClipboard}
            className="summary-action-btn"
            title="Copy to clipboard"
          >
            {copied ? '✓' : '📋'}
          </button>
          <button
            onClick={onClose}
            className="summary-action-btn"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
      {expanded && (
        <div className="summary-content">
          <p className="summary-text">{summary.summary}</p>
          <div className="summary-meta">
            <span className="summary-meta-item">{formatTimestamp(summary.timestamp)}</span>
            <span className="summary-meta-item">{summary.tokens} tokens</span>
          </div>
        </div>
      )}
    </div>
  );
}

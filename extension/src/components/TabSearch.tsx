import React, { useState, useCallback, useEffect } from 'react';
import type { SearchResult } from '../types/search';
import { searchTabs, switchToTab, closeTab } from '../services/searchService';
import { storage } from '../utils/storage';
import { JiraSearchEnhancer } from '../services/jira/jiraSearchEnhancer';
import { JiraTitleParser } from '../services/jira/titleParser';
import { useDebounce } from '../hooks/useDebounce';

export const TabSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the query to avoid excessive searches while typing
  const debouncedQuery = useDebounce(query, 500); // 500ms delay

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const apiKey = await storage.getApiKey();
      if (!apiKey) {
        throw new Error('API key not configured. Please add your key in settings.');
      }

      const searchResults = await searchTabs(searchQuery, apiKey);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Auto-search when debounced query changes
  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery, handleSearch]);

  // Search immediately on Enter key (bypass debounce)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSearch(query);
    }
  };

  const handleSwitchToTab = async (tabId: number) => {
    await switchToTab(tabId);
    // Close popup after switching
    window.close();
  };

  const handleCloseTab = async (tabId: number) => {
    await closeTab(tabId);
    // Remove from results
    setResults(prev => prev.filter(r => r.tab.id !== tabId));
  };

  return (
    <div className="tab-search">
      {/* Search Input */}
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder='Search tabs... (e.g., "ENG-123", "eng", or "React tutorial")'
          className="search-input"
          autoFocus
        />
        <button
          onClick={() => handleSearch(query)}
          disabled={isSearching || !query.trim()}
          className="search-button"
        >
          {isSearching ? '🔄' : '🔍'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="search-error">
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            Found {results.length} {results.length === 1 ? 'tab' : 'tabs'}
          </div>

          {results.map((result, index) => (
            <SearchResultItem
              key={result.tab.id || index}
              result={result}
              onSwitch={() => handleSwitchToTab(result.tab.id!)}
              onClose={() => handleCloseTab(result.tab.id!)}
            />
          ))}
        </div>
      )}

      {/* No Results */}
      {!isSearching && query && results.length === 0 && !error && (
        <div className="no-results">
          No tabs found matching "{query}"
        </div>
      )}
    </div>
  );
};

interface SearchResultItemProps {
  result: SearchResult;
  onSwitch: () => void;
  onClose: () => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, onSwitch, onClose }) => {
  const relevancePercent = Math.round(result.relevanceScore * 100);
  const isJiraResult = result.matchedFields.includes('jira-ticket');
  const ticketInfo = isJiraResult ? JiraSearchEnhancer.getTicketInfo(result.tab) : null;

  return (
    <div className={`search-result-item ${isJiraResult ? 'jira-result' : ''}`}>
      {/* Relevance Bar */}
      <div className="relevance-bar-container">
        <div
          className="relevance-bar"
          style={{
            width: `${relevancePercent}%`,
            backgroundColor: getRelevanceColor(result.relevanceScore)
          }}
        />
      </div>

      {/* Tab Info */}
      <div className="result-content">
        {isJiraResult && ticketInfo ? (
          <>
            <div className="result-header jira-header">
              <span className="jira-badge">🎫 JIRA</span>
              <span className="jira-ticket-number">{ticketInfo.fullTicket}</span>
              {ticketInfo.status && ticketInfo.status !== 'unknown' && (
                <span
                  className="jira-status-badge"
                  style={{
                    backgroundColor: JiraTitleParser.getStatusColor(ticketInfo.status),
                  }}
                >
                  {JiraTitleParser.getStatusDisplayName(ticketInfo.status)}
                </span>
              )}
              <span className="result-score">{relevancePercent}%</span>
            </div>
            <div className="jira-summary">{ticketInfo.summary}</div>
          </>
        ) : (
          <>
            <div className="result-header">
              <span className="result-title">{result.tab.title || 'Untitled'}</span>
              <span className="result-score">{relevancePercent}%</span>
            </div>
          </>
        )}

        <div className="result-url">{result.tab.url}</div>

        {/* Matched Fields */}
        {!isJiraResult && result.matchedFields.length > 0 && (
          <div className="matched-fields">
            Matched: {result.matchedFields.map(field => (
              <span key={field} className="field-badge">{field}</span>
            ))}
          </div>
        )}

        {/* Highlights */}
        {!isJiraResult && result.highlights.length > 0 && (
          <div className="highlights">
            {result.highlights.map((highlight, i) => (
              <span key={i} className="highlight">"{highlight}"</span>
            ))}
          </div>
        )}

        {/* Match Reason */}
        {result.matchReason && (
          <div className="match-reason">
            💡 {result.matchReason}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="result-actions">
        <button onClick={onSwitch} className="action-button switch-button">
          Switch
        </button>
        <button onClick={onClose} className="action-button close-button">
          ✕
        </button>
      </div>
    </div>
  );
};

function getRelevanceColor(score: number): string {
  if (score >= 0.8) return '#4ade80'; // Green
  if (score >= 0.6) return '#fbbf24'; // Yellow
  if (score >= 0.4) return '#fb923c'; // Orange
  return '#f87171'; // Red
}

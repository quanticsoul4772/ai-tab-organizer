import { useState, useCallback, useEffect } from 'react';
import type { SearchResult } from '../types/search';
import { searchTabs, switchToTab, closeTab } from '../services/searchService';
import { storage } from '../utils/storage';
import { useDebounce } from './useDebounce';

/**
 * Custom hook to manage tab search functionality
 *
 * Provides:
 * - Search query state with debouncing
 * - Search results management
 * - Loading and error states
 * - Tab switching and closing handlers
 * - Auto-search on debounced query change
 * - Immediate search on Enter key
 *
 * @returns Object containing search state and handlers
 */
export function useSearch() {
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

  const handleSwitchToTab = async (tabId: number) => {
    await switchToTab(tabId);
    // Close popup after switching
    window.close();
  };

  const handleCloseTab = async (tabId: number) => {
    await closeTab(tabId);
    // Remove from results
    setResults((prev) => prev.filter((r) => r.tab.id !== tabId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSearch(query);
    }
  };

  return {
    // State
    query,
    results,
    isSearching,
    error,

    // Handlers
    setQuery,
    handleSearch,
    handleSwitchToTab,
    handleCloseTab,
    handleKeyPress,
  };
}

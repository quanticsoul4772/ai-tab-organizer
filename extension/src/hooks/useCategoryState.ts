import { useState, useEffect } from 'react';
import type { CategorizedTabs, Tab, CategorySummary } from '../types';
import { storage } from '../utils/storage';
import { getDefaultCollapseState } from '../utils/groupDefaults';

interface UseCategoryStateOptions {
  categorizedTabs: CategorizedTabs;
  onCategorySummaryRequest?: (category: string, tabs: Tab[]) => Promise<CategorySummary>;
}

/**
 * Custom hook to manage category-specific state
 *
 * Manages:
 * - Category collapse/expand states (persisted to storage)
 * - Category summary generation and display
 * - Keyboard shortcuts for collapse/expand all
 * - Loading and error states for summaries
 *
 * @param options - Configuration options
 * @returns Object containing category state and handlers
 */
export function useCategoryState({
  categorizedTabs,
  onCategorySummaryRequest,
}: UseCategoryStateOptions) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setGroupStates((prev) => ({ ...prev, [categoryId]: newState }));
    await storage.setGroupState(categoryId, newState);
  };

  const collapseAll = async () => {
    const newStates: { [key: string]: boolean } = {};
    Object.keys(categorizedTabs).forEach((key) => {
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
    Object.keys(categorizedTabs).forEach((key) => {
      newStates[key] = false;
    });
    setGroupStates(newStates);

    // Persist all states
    for (const [key, value] of Object.entries(newStates)) {
      await storage.setGroupState(key, value);
    }
  };

  return {
    // State
    groupStates,
    activeCategorySummary,
    loadingCategorySummary,
    summaryError,

    // Handlers
    toggleGroup,
    collapseAll,
    expandAll,
    handleCategorySummaryClick,
    handleCloseCategorySummary,
    setSummaryError,
  };
}

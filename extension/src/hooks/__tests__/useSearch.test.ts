import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from '../useSearch';
import { searchTabs, switchToTab, closeTab } from '../../services/searchService';
import { storage } from '../../utils/storage';

// Mock dependencies
vi.mock('../../services/searchService');
vi.mock('../../utils/storage');
vi.mock('../useDebounce', () => ({
  useDebounce: (value: string) => value, // No debounce in tests
}));

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should update query when setQuery is called', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test query');
    });

    expect(result.current.query).toBe('test query');
  });

  it('should perform search when query is not empty', async () => {
    const mockResults = [
      {
        tab: { id: 1, url: 'https://example.com', title: 'Example' },
        relevanceScore: 0.9,
        matchedFields: ['title'],
        highlights: [],
      },
    ];

    vi.mocked(storage.getApiKey).mockResolvedValue('test-api-key');
    vi.mocked(searchTabs).mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.handleSearch('test');
    });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should clear results when query is empty', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.handleSearch('');
    });

    expect(result.current.results).toEqual([]);
    expect(searchTabs).not.toHaveBeenCalled();
  });

  it('should set error when API key is missing', async () => {
    vi.mocked(storage.getApiKey).mockResolvedValue(null);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.handleSearch('test');
    });

    expect(result.current.error).toBe('API key not configured. Please add your key in settings.');
    expect(result.current.results).toEqual([]);
  });

  it('should handle search errors', async () => {
    vi.mocked(storage.getApiKey).mockResolvedValue('test-api-key');
    vi.mocked(searchTabs).mockRejectedValue(new Error('Search failed'));

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.handleSearch('test');
    });

    expect(result.current.error).toBe('Search failed');
    expect(result.current.results).toEqual([]);
  });

  it('should switch to tab and close window', async () => {
    const windowCloseSpy = vi.spyOn(window, 'close').mockImplementation(() => {});

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.handleSwitchToTab(123);
    });

    expect(switchToTab).toHaveBeenCalledWith(123);
    expect(windowCloseSpy).toHaveBeenCalled();
  });

  it('should close tab and remove from results', async () => {
    const mockResults = [
      {
        tab: { id: 1, url: 'https://example.com', title: 'Example 1' },
        relevanceScore: 0.9,
        matchedFields: ['title'],
        highlights: [],
      },
      {
        tab: { id: 2, url: 'https://example2.com', title: 'Example 2' },
        relevanceScore: 0.8,
        matchedFields: ['title'],
        highlights: [],
      },
    ];

    vi.mocked(storage.getApiKey).mockResolvedValue('test-api-key');
    vi.mocked(searchTabs).mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    // First perform search to get results
    await act(async () => {
      await result.current.handleSearch('test');
    });

    expect(result.current.results).toHaveLength(2);

    // Close tab
    await act(async () => {
      await result.current.handleCloseTab(1);
    });

    expect(closeTab).toHaveBeenCalledWith(1);
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].tab.id).toBe(2);
  });

  it('should handle Enter key press', async () => {
    const mockResults = [
      {
        tab: { id: 1, url: 'https://example.com', title: 'Example' },
        relevanceScore: 0.9,
        matchedFields: ['title'],
        highlights: [],
      },
    ];

    vi.mocked(storage.getApiKey).mockResolvedValue('test-api-key');
    vi.mocked(searchTabs).mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test query');
    });

    const mockEvent = {
      key: 'Enter',
    } as React.KeyboardEvent;

    await act(async () => {
      result.current.handleKeyPress(mockEvent);
    });

    await waitFor(() => {
      expect(searchTabs).toHaveBeenCalledWith('test query', 'test-api-key');
    });
  });

  it('should not search on non-Enter key press', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test');
    });

    const mockEvent = {
      key: 'a',
    } as React.KeyboardEvent;

    result.current.handleKeyPress(mockEvent);

    expect(searchTabs).not.toHaveBeenCalled();
  });
});

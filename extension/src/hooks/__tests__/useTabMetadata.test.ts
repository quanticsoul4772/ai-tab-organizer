import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTabMetadata } from '../useTabMetadata';
import { runtime } from '../../core/browserApi';
import { BACKGROUND_ACTIONS } from '../../constants/actions';

// Mock browserApi
vi.mock('../../core/browserApi', () => ({
  runtime: {
    sendMessage: vi.fn(),
  },
}));

describe('useTabMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default metadata', () => {
    const { result } = renderHook(() => useTabMetadata(undefined, false));

    expect(result.current.metadata).toEqual({
      lastAccessed: expect.any(Number),
      isSuspended: false,
      duplicateCount: 1,
      isPinned: false,
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch metadata for valid tab ID', async () => {
    const mockMetadata = {
      lastAccessed: Date.now(),
      memoryUsage: 1024,
      isSuspended: false,
      duplicateCount: 2,
      jiraStatus: 'In Progress',
    };

    vi.mocked(runtime.sendMessage).mockResolvedValue(mockMetadata);

    const { result } = renderHook(() => useTabMetadata(123, true));

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for metadata to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(runtime.sendMessage).toHaveBeenCalledWith(
      BACKGROUND_ACTIONS.GET_TAB_METADATA,
      { tabId: 123 }
    );

    expect(result.current.metadata).toEqual({
      lastAccessed: mockMetadata.lastAccessed,
      memoryUsage: 1024,
      isSuspended: false,
      duplicateCount: 2,
      isPinned: true,
      jiraStatus: 'In Progress',
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Failed to fetch metadata');
    vi.mocked(runtime.sendMessage).mockRejectedValue(mockError);

    const { result } = renderHook(() => useTabMetadata(456, false));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should update when tabId changes', async () => {
    const mockMetadata1 = {
      lastAccessed: Date.now(),
      isSuspended: false,
      duplicateCount: 1,
    };

    const mockMetadata2 = {
      lastAccessed: Date.now(),
      isSuspended: true,
      duplicateCount: 3,
    };

    vi.mocked(runtime.sendMessage)
      .mockResolvedValueOnce(mockMetadata1)
      .mockResolvedValueOnce(mockMetadata2);

    const { result, rerender } = renderHook(
      ({ tabId, isPinned }) => useTabMetadata(tabId, isPinned),
      { initialProps: { tabId: 123, isPinned: false } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metadata.duplicateCount).toBe(1);

    // Change tab ID
    rerender({ tabId: 456, isPinned: true });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metadata.duplicateCount).toBe(3);
    expect(result.current.metadata.isPinned).toBe(true);
  });

  it('should not fetch if tabId is undefined', () => {
    const { result } = renderHook(() => useTabMetadata(undefined, false));

    expect(result.current.loading).toBe(false);
    expect(runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('should cleanup on unmount', async () => {
    const mockMetadata = {
      lastAccessed: Date.now(),
      isSuspended: false,
      duplicateCount: 1,
    };

    // Delay the response to simulate slow network
    vi.mocked(runtime.sendMessage).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockMetadata), 100))
    );

    const { unmount } = renderHook(() => useTabMetadata(123, false));

    // Unmount before response arrives
    unmount();

    // Wait to ensure no state updates after unmount
    await new Promise(resolve => setTimeout(resolve, 150));

    // No assertions needed - test passes if no errors are thrown
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '../../utils/storage';
import type { Tab, TabSummary, CategorySummary } from '../../types';

// Mock storage
vi.mock('../../utils/storage');

// Mock browserApi
vi.mock('../../core/browserApi', () => ({
  runtime: {
    sendMessage: vi.fn(),
  },
}));

// Mock constants
vi.mock('../../constants/actions', () => ({
  BACKGROUND_ACTIONS: {
    SUMMARIZE_TAB: 'summarizeTab',
    SUMMARIZE_CATEGORY: 'summarizeCategory',
  },
}));

// Import after mocks
import { runtime } from '../../core/browserApi';
import { BACKGROUND_ACTIONS } from '../../constants/actions';
const { summaryService } = await import('../summaryService');

describe('summaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('summarizeTab', () => {
    it('should return cached summary if available', async () => {
      const mockTab: Tab = {
        id: 123,
        title: 'Example Page',
        url: 'https://example.com',
        favIconUrl: 'https://example.com/favicon.ico',
      };

      const cachedSummary: TabSummary = {
        tabId: 123,
        summary: 'Cached summary',
        timestamp: Date.now(),
      };

      vi.mocked(storage.getCachedTabSummary).mockResolvedValue(cachedSummary);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await summaryService.summarizeTab(mockTab, 'test-api-key');

      expect(result).toEqual(cachedSummary);
      expect(storage.getCachedTabSummary).toHaveBeenCalledWith(123);
      expect(consoleSpy).toHaveBeenCalledWith('[SummaryService] Using cached summary for tab 123');
      expect(runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should generate new summary if not cached', async () => {
      const mockTab: Tab = {
        id: 456,
        title: 'New Page',
        url: 'https://new.com',
        favIconUrl: 'https://new.com/favicon.ico',
      };

      const newSummary: TabSummary = {
        tabId: 456,
        summary: 'Generated summary',
        timestamp: Date.now(),
      };

      vi.mocked(storage.getCachedTabSummary).mockResolvedValue(null);
      vi.mocked(storage.cacheTabSummary).mockResolvedValue(undefined);
      vi.mocked(runtime.sendMessage).mockResolvedValue(newSummary);

      const result = await summaryService.summarizeTab(mockTab, 'test-api-key');

      expect(result).toEqual(newSummary);
      expect(runtime.sendMessage).toHaveBeenCalledWith('summarizeTab', {
        tab: mockTab,
        apiKey: 'test-api-key',
      });
      expect(storage.cacheTabSummary).toHaveBeenCalledWith(newSummary);
    });

    it('should reject if runtime error occurs', async () => {
      const mockTab: Tab = {
        id: 789,
        title: 'Error Page',
        url: 'https://error.com',
      };

      vi.mocked(storage.getCachedTabSummary).mockResolvedValue(null);
      vi.mocked(runtime.sendMessage).mockRejectedValue(new Error('Runtime error occurred'));

      await expect(summaryService.summarizeTab(mockTab, 'test-api-key')).rejects.toThrow(
        'Runtime error occurred'
      );
    });

    it('should reject if response indicates failure', async () => {
      const mockTab: Tab = {
        id: 101,
        title: 'Fail Page',
        url: 'https://fail.com',
      };

      vi.mocked(storage.getCachedTabSummary).mockResolvedValue(null);
      vi.mocked(runtime.sendMessage).mockRejectedValue(new Error('API error'));

      await expect(summaryService.summarizeTab(mockTab, 'test-api-key')).rejects.toThrow(
        'API error'
      );
    });

    it('should reject with default message if no error provided', async () => {
      const mockTab: Tab = {
        id: 202,
        title: 'No Error Page',
        url: 'https://noerror.com',
      };

      vi.mocked(storage.getCachedTabSummary).mockResolvedValue(null);
      vi.mocked(runtime.sendMessage).mockRejectedValue(
        new Error('Failed to execute action: summarizeTab')
      );

      await expect(summaryService.summarizeTab(mockTab, 'test-api-key')).rejects.toThrow(
        'Failed to execute action: summarizeTab'
      );
    });
  });

  describe('summarizeCategory', () => {
    it('should return cached summary if available and tab count matches', async () => {
      const mockTabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://one.com' },
        { id: 2, title: 'Tab 2', url: 'https://two.com' },
      ];

      const cachedSummary: CategorySummary = {
        category: 'Work',
        summary: 'Cached category summary',
        tabCount: 2,
        timestamp: Date.now(),
      };

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(cachedSummary);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await summaryService.summarizeCategory('Work', mockTabs, 'test-api-key');

      expect(result).toEqual(cachedSummary);
      expect(storage.getCachedCategorySummary).toHaveBeenCalledWith('Work');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SummaryService] Using cached summary for category Work'
      );
      expect(runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should generate new summary if tab count changed', async () => {
      const mockTabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://one.com' },
        { id: 2, title: 'Tab 2', url: 'https://two.com' },
        { id: 3, title: 'Tab 3', url: 'https://three.com' },
      ];

      const cachedSummary: CategorySummary = {
        category: 'Work',
        summary: 'Old summary',
        tabCount: 2, // Different from current tab count
        timestamp: Date.now(),
      };

      const newSummary: CategorySummary = {
        category: 'Work',
        summary: 'New summary',
        tabCount: 3,
        timestamp: Date.now(),
      };

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(cachedSummary);
      vi.mocked(storage.cacheCategorySummary).mockResolvedValue(undefined);
      vi.mocked(runtime.sendMessage).mockResolvedValue(newSummary);

      const result = await summaryService.summarizeCategory('Work', mockTabs, 'test-api-key');

      expect(result).toEqual(newSummary);
      expect(runtime.sendMessage).toHaveBeenCalledWith(BACKGROUND_ACTIONS.SUMMARIZE_CATEGORY, {
        tabs: mockTabs,
        categoryName: 'Work',
        apiKey: 'test-api-key',
      });
      expect(storage.cacheCategorySummary).toHaveBeenCalledWith(newSummary);
    });

    it('should generate new summary if not cached', async () => {
      const mockTabs: Tab[] = [{ id: 1, title: 'Tab 1', url: 'https://one.com' }];

      const newSummary: CategorySummary = {
        category: 'Personal',
        summary: 'Generated category summary',
        tabCount: 1,
        timestamp: Date.now(),
      };

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(null);
      vi.mocked(storage.cacheCategorySummary).mockResolvedValue(undefined);
      vi.mocked(runtime.sendMessage).mockResolvedValue(newSummary);

      const result = await summaryService.summarizeCategory('Personal', mockTabs, 'test-api-key');

      expect(result).toEqual(newSummary);
      expect(storage.cacheCategorySummary).toHaveBeenCalledWith(newSummary);
    });

    it('should reject if runtime error occurs', async () => {
      const mockTabs: Tab[] = [{ id: 1, title: 'Tab 1', url: 'https://one.com' }];

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(null);
      vi.mocked(runtime.sendMessage).mockRejectedValue(new Error('Category runtime error'));

      await expect(
        summaryService.summarizeCategory('Work', mockTabs, 'test-api-key')
      ).rejects.toThrow('Category runtime error');
    });

    it('should reject if response indicates failure', async () => {
      const mockTabs: Tab[] = [{ id: 1, title: 'Tab 1', url: 'https://one.com' }];

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(null);
      vi.mocked(runtime.sendMessage).mockRejectedValue(new Error('Category API error'));

      await expect(
        summaryService.summarizeCategory('Work', mockTabs, 'test-api-key')
      ).rejects.toThrow('Category API error');
    });

    it('should reject with default message if no error provided', async () => {
      const mockTabs: Tab[] = [{ id: 1, title: 'Tab 1', url: 'https://one.com' }];

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(null);
      vi.mocked(runtime.sendMessage).mockRejectedValue(
        new Error('Failed to execute action: summarizeCategory')
      );

      await expect(
        summaryService.summarizeCategory('Work', mockTabs, 'test-api-key')
      ).rejects.toThrow('Failed to execute action: summarizeCategory');
    });
  });

  describe('getCachedTabSummary', () => {
    it('should return cached tab summary', async () => {
      const cachedSummary: TabSummary = {
        tabId: 123,
        summary: 'Cached summary',
        timestamp: Date.now(),
      };

      vi.mocked(storage.getCachedTabSummary).mockResolvedValue(cachedSummary);

      const result = await summaryService.getCachedTabSummary(123);

      expect(result).toEqual(cachedSummary);
      expect(storage.getCachedTabSummary).toHaveBeenCalledWith(123);
    });

    it('should return null if no cache exists', async () => {
      vi.mocked(storage.getCachedTabSummary).mockResolvedValue(null);

      const result = await summaryService.getCachedTabSummary(456);

      expect(result).toBeNull();
    });
  });

  describe('getCachedCategorySummary', () => {
    it('should return cached category summary', async () => {
      const cachedSummary: CategorySummary = {
        category: 'Work',
        summary: 'Cached category summary',
        tabCount: 5,
        timestamp: Date.now(),
      };

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(cachedSummary);

      const result = await summaryService.getCachedCategorySummary('Work');

      expect(result).toEqual(cachedSummary);
      expect(storage.getCachedCategorySummary).toHaveBeenCalledWith('Work');
    });

    it('should return null if no cache exists', async () => {
      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(null);

      const result = await summaryService.getCachedCategorySummary('Personal');

      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all summary cache', async () => {
      vi.mocked(storage.clearSummaryCache).mockResolvedValue(undefined);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await summaryService.clearCache();

      expect(storage.clearSummaryCache).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[SummaryService] Cache cleared');
    });
  });

  describe('removeCachedTabSummary', () => {
    it('should remove specific tab summary from cache', async () => {
      vi.mocked(storage.removeCachedTabSummary).mockResolvedValue(undefined);

      await summaryService.removeCachedTabSummary(123);

      expect(storage.removeCachedTabSummary).toHaveBeenCalledWith(123);
    });
  });

  describe('removeCachedCategorySummary', () => {
    it('should remove specific category summary from cache', async () => {
      vi.mocked(storage.removeCachedCategorySummary).mockResolvedValue(undefined);

      await summaryService.removeCachedCategorySummary('Work');

      expect(storage.removeCachedCategorySummary).toHaveBeenCalledWith('Work');
    });
  });
});

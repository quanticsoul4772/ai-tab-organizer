import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '../../utils/storage';
import type { Tab, TabSummary, CategorySummary } from '../../types';

// Mock storage
vi.mock('../../utils/storage');

// Import summaryService AFTER setting up mocks
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
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SummaryService] Using cached summary for tab 123'
      );
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
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
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
        callback({ success: true, data: newSummary });
      });

      const result = await summaryService.summarizeTab(mockTab, 'test-api-key');

      expect(result).toEqual(newSummary);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'summarizeTab',
          tab: mockTab,
          apiKey: 'test-api-key',
        },
        expect.any(Function)
      );
      expect(storage.cacheTabSummary).toHaveBeenCalledWith(newSummary);
    });

    it('should reject if chrome.runtime.lastError occurs', async () => {
      const mockTab: Tab = {
        id: 789,
        title: 'Error Page',
        url: 'https://error.com',
      };

      vi.mocked(storage.getCachedTabSummary).mockResolvedValue(null);
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
        (chrome.runtime as any).lastError = { message: 'Runtime error occurred' };
        callback(null);
      });

      await expect(summaryService.summarizeTab(mockTab, 'test-api-key')).rejects.toThrow(
        'Runtime error occurred'
      );

      // Clean up lastError
      delete (chrome.runtime as any).lastError;
    });

    it('should reject if response indicates failure', async () => {
      const mockTab: Tab = {
        id: 101,
        title: 'Fail Page',
        url: 'https://fail.com',
      };

      vi.mocked(storage.getCachedTabSummary).mockResolvedValue(null);
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
        callback({ success: false, error: 'API error' });
      });

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
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
        callback({ success: false });
      });

      await expect(summaryService.summarizeTab(mockTab, 'test-api-key')).rejects.toThrow(
        'Failed to summarize tab'
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
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
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
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
        callback({ success: true, data: newSummary });
      });

      const result = await summaryService.summarizeCategory('Work', mockTabs, 'test-api-key');

      expect(result).toEqual(newSummary);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'summarizeCategory',
          tabs: mockTabs,
          categoryName: 'Work',
          apiKey: 'test-api-key',
        },
        expect.any(Function)
      );
      expect(storage.cacheCategorySummary).toHaveBeenCalledWith(newSummary);
    });

    it('should generate new summary if not cached', async () => {
      const mockTabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://one.com' },
      ];

      const newSummary: CategorySummary = {
        category: 'Personal',
        summary: 'Generated category summary',
        tabCount: 1,
        timestamp: Date.now(),
      };

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(null);
      vi.mocked(storage.cacheCategorySummary).mockResolvedValue(undefined);
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
        callback({ success: true, data: newSummary });
      });

      const result = await summaryService.summarizeCategory('Personal', mockTabs, 'test-api-key');

      expect(result).toEqual(newSummary);
      expect(storage.cacheCategorySummary).toHaveBeenCalledWith(newSummary);
    });

    it('should reject if chrome.runtime.lastError occurs', async () => {
      const mockTabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://one.com' },
      ];

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(null);
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
        (chrome.runtime as any).lastError = { message: 'Category runtime error' };
        callback(null);
      });

      await expect(
        summaryService.summarizeCategory('Work', mockTabs, 'test-api-key')
      ).rejects.toThrow('Category runtime error');

      // Clean up lastError
      delete (chrome.runtime as any).lastError;
    });

    it('should reject if response indicates failure', async () => {
      const mockTabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://one.com' },
      ];

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(null);
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
        callback({ success: false, error: 'Category API error' });
      });

      await expect(
        summaryService.summarizeCategory('Work', mockTabs, 'test-api-key')
      ).rejects.toThrow('Category API error');
    });

    it('should reject with default message if no error provided', async () => {
      const mockTabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://one.com' },
      ];

      vi.mocked(storage.getCachedCategorySummary).mockResolvedValue(null);
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
        callback({ success: false });
      });

      await expect(
        summaryService.summarizeCategory('Work', mockTabs, 'test-api-key')
      ).rejects.toThrow('Failed to summarize category');
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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  indexTab,
  getIndexedTabs,
  removeIndexedTab,
  cleanupIndexedTabs,
  reindexIfNeeded,
} from '../tabIndexer';
import { runtime, storage } from '../../core/browserApi';

// Mock browserApi
vi.mock('../../core/browserApi');

describe('tabIndexer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('indexTab', () => {
    it('should index a tab successfully', async () => {
      const mockTab = {
        id: 123,
        url: 'https://example.com',
        title: 'Example Page',
      } as chrome.tabs.Tab;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(runtime.sendMessage).mockResolvedValue({ content: 'page content here' } as any);
      vi.mocked(storage.get).mockResolvedValue({});
      vi.mocked(storage.set).mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await indexTab(mockTab);

      expect(runtime.sendMessage).toHaveBeenCalledWith('extractContent', {
        tabId: 123,
        url: 'https://example.com',
      });

      expect(storage.set).toHaveBeenCalledWith(
        'indexed_tabs',
        expect.objectContaining({
          123: expect.objectContaining({
            tabId: 123,
            title: 'Example Page',
            url: 'https://example.com',
            content: 'page content here',
          }),
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith('Indexed tab 123: Example Page');
    });

    it('should skip tabs without ID', async () => {
      const mockTab = {
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab;

      await indexTab(mockTab);

      expect(runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip tabs without URL', async () => {
      const mockTab = {
        id: 123,
        title: 'Example',
      } as chrome.tabs.Tab;

      await indexTab(mockTab);

      expect(runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip chrome:// URLs', async () => {
      const mockTab = {
        id: 123,
        url: 'chrome://extensions',
        title: 'Extensions',
      } as chrome.tabs.Tab;

      await indexTab(mockTab);

      expect(runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip edge:// URLs', async () => {
      const mockTab = {
        id: 123,
        url: 'edge://settings',
        title: 'Settings',
      } as chrome.tabs.Tab;

      await indexTab(mockTab);

      expect(runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip about: URLs', async () => {
      const mockTab = {
        id: 123,
        url: 'about:blank',
        title: 'Blank',
      } as chrome.tabs.Tab;

      await indexTab(mockTab);

      expect(runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip chrome-extension:// URLs', async () => {
      const mockTab = {
        id: 123,
        url: 'chrome-extension://abc123/popup.html',
        title: 'Extension',
      } as chrome.tabs.Tab;

      await indexTab(mockTab);

      expect(runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle extraction failure gracefully', async () => {
      const mockTab = {
        id: 123,
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab;

      vi.mocked(runtime.sendMessage).mockRejectedValue(new Error('Extraction failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await indexTab(mockTab);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to index tab 123:', expect.any(Error));
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('should truncate content if too long', async () => {
      const longContent = 'a'.repeat(6000);
      const mockTab = {
        id: 123,
        url: 'https://example.com',
        title: 'Long Page',
      } as chrome.tabs.Tab;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(runtime.sendMessage).mockResolvedValue({ content: longContent } as any);

      vi.mocked(storage.get).mockResolvedValue({});
      vi.mocked(storage.set).mockResolvedValue(undefined);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await indexTab(mockTab);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setCall = vi.mocked(storage.set).mock.calls[0][1] as any;
      const savedContent = setCall[123].content;

      expect(savedContent.length).toBeLessThanOrEqual(5003); // 5000 + '...'
      expect(savedContent.endsWith('...')).toBe(true);
    });

    it('should preserve existing indexed tabs when adding new one', async () => {
      const existingIndexedTabs = {
        456: {
          tabId: 456,
          title: 'Existing',
          url: 'https://existing.com',
          content: 'existing content',
          contentHash: 'hash1',
          lastAccessed: new Date().toISOString(),
          indexed: new Date().toISOString(),
        },
      };

      const mockTab = {
        id: 123,
        url: 'https://new.com',
        title: 'New Page',
      } as chrome.tabs.Tab;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(runtime.sendMessage).mockResolvedValue({ content: 'new content' } as any);

      vi.mocked(storage.get).mockResolvedValue(existingIndexedTabs);
      vi.mocked(storage.set).mockResolvedValue(undefined);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await indexTab(mockTab);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setCall = vi.mocked(storage.set).mock.calls[0][1] as any;
      expect(setCall[456]).toBeDefined(); // Preserved
      expect(setCall[123]).toBeDefined(); // Added
    });

    it('should handle errors gracefully', async () => {
      const mockTab = {
        id: 123,
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab;

      vi.mocked(runtime.sendMessage).mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await indexTab(mockTab);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to index tab 123:', expect.any(Error));
    });
  });

  describe('getIndexedTabs', () => {
    it('should return indexed tabs as Map', async () => {
      const mockIndexedTabs = {
        '123': {
          tabId: 123,
          title: 'Page 1',
          url: 'https://page1.com',
          content: 'content 1',
          contentHash: 'hash1',
          lastAccessed: new Date().toISOString(),
          indexed: new Date().toISOString(),
        },
        '456': {
          tabId: 456,
          title: 'Page 2',
          url: 'https://page2.com',
          content: 'content 2',
          contentHash: 'hash2',
          lastAccessed: new Date().toISOString(),
          indexed: new Date().toISOString(),
        },
      };

      vi.mocked(storage.get).mockResolvedValue(mockIndexedTabs);

      const result = await getIndexedTabs();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get(123)).toBeDefined();
      expect(result.get(456)).toBeDefined();
      expect(result.get(123)?.title).toBe('Page 1');
    });

    it('should return empty Map if no indexed tabs', async () => {
      vi.mocked(storage.get).mockResolvedValue({});

      const result = await getIndexedTabs();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('removeIndexedTab', () => {
    it('should remove indexed tab by ID', async () => {
      const mockIndexedTabs = {
        '123': { tabId: 123, title: 'Page 1' },
        '456': { tabId: 456, title: 'Page 2' },
      };

      vi.mocked(storage.get).mockResolvedValue(mockIndexedTabs);
      vi.mocked(storage.set).mockResolvedValue(undefined);

      await removeIndexedTab(123);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setCall = vi.mocked(storage.set).mock.calls[0][1] as any;
      expect(setCall[123]).toBeUndefined();
      expect(setCall[456]).toBeDefined();
    });

    it('should handle removing non-existent tab', async () => {
      vi.mocked(storage.get).mockResolvedValue({});
      vi.mocked(storage.set).mockResolvedValue(undefined);

      await removeIndexedTab(999);

      expect(storage.set).toHaveBeenCalled();
    });
  });

  describe('cleanupIndexedTabs', () => {
    it('should remove indexed tabs that no longer exist', async () => {
      const activeTabs = [
        { id: 123, url: 'https://page1.com' },
        { id: 456, url: 'https://page2.com' },
      ] as chrome.tabs.Tab[];

      const mockIndexedTabs = {
        '123': { tabId: 123, title: 'Active 1' },
        '456': { tabId: 456, title: 'Active 2' },
        '789': { tabId: 789, title: 'Closed' },
      };

      vi.mocked(chrome.tabs.query).mockResolvedValue(activeTabs);
      vi.mocked(storage.get).mockResolvedValue(mockIndexedTabs);
      vi.mocked(storage.set).mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cleanupIndexedTabs();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setCall = vi.mocked(storage.set).mock.calls[0][1] as any;
      expect(setCall['123']).toBeDefined();
      expect(setCall['456']).toBeDefined();
      expect(setCall['789']).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Cleaned up old indexed tabs');
    });

    it('should not update storage if nothing to clean', async () => {
      const activeTabs = [{ id: 123, url: 'https://page1.com' }] as chrome.tabs.Tab[];

      const mockIndexedTabs = {
        '123': { tabId: 123, title: 'Active 1' },
      };

      vi.mocked(chrome.tabs.query).mockResolvedValue(activeTabs);
      vi.mocked(storage.get).mockResolvedValue(mockIndexedTabs);
      vi.mocked(storage.set).mockResolvedValue(undefined);

      await cleanupIndexedTabs();

      expect(storage.set).not.toHaveBeenCalled();
    });
  });

  describe('reindexIfNeeded', () => {
    it('should index tab if not indexed before', async () => {
      const mockTab = {
        id: 123,
        url: 'https://new.com',
        title: 'New Page',
      } as chrome.tabs.Tab;

      vi.mocked(storage.get).mockResolvedValue({});
      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'content' },
      });
      vi.mocked(storage.set).mockResolvedValue(undefined);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await reindexIfNeeded(mockTab);

      expect(runtime.sendMessage).toHaveBeenCalled();
    });

    it('should reindex if URL changed', async () => {
      const mockTab = {
        id: 123,
        url: 'https://new-url.com',
        title: 'Page',
      } as chrome.tabs.Tab;

      const existingIndexed = {
        '123': {
          tabId: 123,
          url: 'https://old-url.com',
          title: 'Page',
          content: 'old content',
          contentHash: 'hash',
          lastAccessed: new Date().toISOString(),
          indexed: new Date().toISOString(),
        },
      };

      vi.mocked(storage.get).mockResolvedValue(existingIndexed);
      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'new content' },
      });
      vi.mocked(storage.set).mockResolvedValue(undefined);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await reindexIfNeeded(mockTab);

      expect(runtime.sendMessage).toHaveBeenCalled();
    });

    it('should reindex if content is stale (>24 hours)', async () => {
      const mockTab = {
        id: 123,
        url: 'https://example.com',
        title: 'Page',
      } as chrome.tabs.Tab;

      const staleDate = new Date();
      staleDate.setHours(staleDate.getHours() - 25); // 25 hours ago

      const existingIndexed = {
        '123': {
          tabId: 123,
          url: 'https://example.com',
          title: 'Page',
          content: 'old content',
          contentHash: 'hash',
          lastAccessed: new Date().toISOString(),
          indexed: staleDate.toISOString(),
        },
      };

      vi.mocked(storage.get).mockResolvedValue(existingIndexed);
      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'fresh content' },
      });
      vi.mocked(storage.set).mockResolvedValue(undefined);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await reindexIfNeeded(mockTab);

      expect(runtime.sendMessage).toHaveBeenCalled();
    });

    it('should not reindex if content is fresh and URL unchanged', async () => {
      const mockTab = {
        id: 123,
        url: 'https://example.com',
        title: 'Page',
      } as chrome.tabs.Tab;

      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 1); // 1 hour ago

      const existingIndexed = {
        '123': {
          tabId: 123,
          url: 'https://example.com',
          title: 'Page',
          content: 'recent content',
          contentHash: 'hash',
          lastAccessed: new Date().toISOString(),
          indexed: recentDate.toISOString(),
        },
      };

      vi.mocked(storage.get).mockResolvedValue(existingIndexed);

      await reindexIfNeeded(mockTab);

      expect(runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip tabs without ID', async () => {
      const mockTab = {
        url: 'https://example.com',
        title: 'Page',
      } as chrome.tabs.Tab;

      await reindexIfNeeded(mockTab);

      expect(storage.get).not.toHaveBeenCalled();
    });
  });
});

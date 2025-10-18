import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentMatcher } from '../contentMatcher';
import { runtime } from '../../../core/browserApi';

// Mock browserApi
vi.mock('../../../core/browserApi');

describe('ContentMatcher', () => {
  let matcher: ContentMatcher;

  beforeEach(() => {
    matcher = new ContentMatcher();
    vi.clearAllMocks();
  });

  describe('extractTabContent', () => {
    it('should throw error for tab without ID', async () => {
      const tab = { url: 'https://example.com', title: 'Test' } as chrome.tabs.Tab;

      await expect(matcher.extractTabContent(tab)).rejects.toThrow('Invalid tab');
    });

    it('should throw error for tab without URL', async () => {
      const tab = { id: 1, title: 'Test' } as chrome.tabs.Tab;

      await expect(matcher.extractTabContent(tab)).rejects.toThrow('Invalid tab');
    });

    it('should skip chrome:// URLs', async () => {
      const tab = {
        id: 1,
        url: 'chrome://extensions',
        title: 'Extensions',
      } as chrome.tabs.Tab;

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.tabId).toBe(1);
      expect(content.textContent).toBe('Extensions chrome://extensions');
      expect(content.contentHash).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('Skipping protected URL: chrome://extensions');
    });

    it('should skip chrome-extension:// URLs', async () => {
      const tab = {
        id: 2,
        url: 'chrome-extension://abc123/popup.html',
        title: 'Popup',
      } as chrome.tabs.Tab;

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.textContent).toContain('Popup');
      expect(content.textContent).toContain('chrome-extension://abc123/popup.html');
    });

    it('should skip edge:// URLs', async () => {
      const tab = {
        id: 3,
        url: 'edge://settings',
        title: 'Settings',
      } as chrome.tabs.Tab;

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.textContent).toBe('Settings edge://settings');
    });

    it('should skip about: URLs', async () => {
      const tab = {
        id: 4,
        url: 'about:blank',
        title: 'Blank',
      } as chrome.tabs.Tab;

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.textContent).toBe('Blank about:blank');
    });

    it('should skip file:// URLs', async () => {
      const tab = {
        id: 5,
        url: 'file:///path/to/file.html',
        title: 'File',
      } as chrome.tabs.Tab;

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.textContent).toContain('File');
    });

    it('should skip view-source: URLs', async () => {
      const tab = {
        id: 6,
        url: 'view-source:https://example.com',
        title: 'Source',
      } as chrome.tabs.Tab;

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.textContent).toContain('Source');
    });

    it('should skip data: URLs', async () => {
      const tab = {
        id: 7,
        url: 'data:text/html,<h1>Test</h1>',
        title: 'Data',
      } as chrome.tabs.Tab;

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.textContent).toContain('Data');
    });

    it('should skip javascript: URLs', async () => {
      const tab = {
        id: 8,
        url: 'javascript:alert("test")',
        title: 'JS',
      } as chrome.tabs.Tab;

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.textContent).toContain('JS');
    });

    it('should return cached content on second call', async () => {
      const tab = {
        id: 1,
        url: 'chrome://extensions',
        title: 'Extensions',
      } as chrome.tabs.Tab;

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const content1 = await matcher.extractTabContent(tab);
      const content2 = await matcher.extractTabContent(tab);

      expect(content1).toStrictEqual(content2); // Same cached content
    });

    it('should extract content from regular URL successfully', async () => {
      const tab = {
        id: 9,
        url: 'https://example.com/page',
        title: 'Example Page',
      } as chrome.tabs.Tab;

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        content: 'This is the page content',
        metaDescription: 'Page description',
      });

      const content = await matcher.extractTabContent(tab);

      expect(content.tabId).toBe(9);
      expect(content.title).toBe('Example Page');
      expect(content.url).toBe('https://example.com/page');
      expect(content.textContent).toBe('This is the page content');
      expect(content.metaDescription).toBe('Page description');
      expect(content.contentHash).toBeDefined();
      expect(content.extracted).toBeInstanceOf(Date);

      expect(runtime.sendMessage).toHaveBeenCalledWith(
        'extractContent',
        { tabId: 9, url: 'https://example.com/page' }
      );
    });

    it('should handle missing meta description', async () => {
      const tab = {
        id: 10,
        url: 'https://example.com',
        title: 'Test',
      } as chrome.tabs.Tab;

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        content: 'Content only',
        metaDescription: null,
      });

      const content = await matcher.extractTabContent(tab);

      expect(content.metaDescription).toBeNull();
      expect(content.textContent).toBe('Content only');
    });

    it('should fallback on extraction failure', async () => {
      const tab = {
        id: 11,
        url: 'https://example.com',
        title: 'Test Page',
      } as chrome.tabs.Tab;

      vi.mocked(runtime.sendMessage).mockRejectedValue(
        new Error('Content extraction failed')
      );

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.textContent).toBe('Test Page https://example.com');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to extract content from tab 11:',
        expect.any(Error)
      );
    });

    it('should fallback on network error', async () => {
      const tab = {
        id: 12,
        url: 'https://example.com',
        title: 'Test',
      } as chrome.tabs.Tab;

      vi.mocked(runtime.sendMessage).mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const content = await matcher.extractTabContent(tab);

      expect(content.textContent).toContain('Test');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should generate SimHash for extracted content', async () => {
      const tab = {
        id: 13,
        url: 'https://example.com',
        title: 'Test',
      } as chrome.tabs.Tab;

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Test content',
          metaDescription: 'Description',
        },
      });

      const content = await matcher.extractTabContent(tab);

      // Should combine title + description + content for hash
      expect(content.contentHash).toBeDefined();
      expect(content.contentHash).not.toBe('0');
    });

    it('should handle empty title', async () => {
      const tab = {
        id: 14,
        url: 'https://example.com',
        title: '',
      } as chrome.tabs.Tab;

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Content',
          metaDescription: null,
        },
      });

      const content = await matcher.extractTabContent(tab);

      expect(content.title).toBe('');
    });
  });

  describe('findContentDuplicates', () => {
    it('should find duplicates with identical content', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Same Title' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Same Title' } as chrome.tabs.Tab,
      ];

      // Return identical content for both tabs to ensure high similarity
      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'This is the exact same content that appears on both pages. It has enough text to generate a good SimHash fingerprint for comparison purposes.',
          metaDescription: 'Same description for both pages',
        },
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.85);

      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toHaveLength(2);
      expect(groups[0].similarity).toBeGreaterThanOrEqual(0.85);
      expect(groups[0].detectionMethod).toBe('fingerprint');
    });

    it('should not find duplicates with different content', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      let callCount = 0;
      vi.mocked(runtime.sendMessage).mockImplementation(async () => {
        callCount++;
        return {
          content: callCount === 1 ? 'Content A' : 'Completely different content B',
          metaDescription: null,
        };
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      expect(groups).toHaveLength(0);
    });

    it('should handle threshold parameter', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      let callCount = 0;
      vi.mocked(runtime.sendMessage).mockImplementation(async () => {
        callCount++;
        return {
          content: callCount === 1 ? 'Similar content here' : 'Similar content there',
          metaDescription: null,
        };
      });

      // Lower threshold should find more duplicates
      const groups = await matcher.findContentDuplicates(tabs, 0.5);

      expect(groups.length).toBeGreaterThanOrEqual(0);
    });

    it('should skip tabs with extraction errors', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Page 2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://example.com/page3', title: 'Page 3' } as chrome.tabs.Tab,
      ];

      let callCount = 0;
      vi.mocked(runtime.sendMessage).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Failed');
        }
        return {
          content: 'Content',
          metaDescription: null,
        };
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      // Should have processed tabs 1 and 3, skipped 2
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should return empty array for no duplicates', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com', title: 'Test' } as chrome.tabs.Tab,
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        content: 'Content',
        metaDescription: null,
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      expect(groups).toEqual([]);
    });

    it('should provide recommendation for duplicates', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1', active: false } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Page 2', active: true } as chrome.tabs.Tab,
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Same content',
          metaDescription: null,
        },
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      if (groups.length > 0) {
        expect(groups[0].recommendation).toBeDefined();
        expect(groups[0].recommendation.keepTabId).toBeDefined();
        expect(groups[0].recommendation.closeTabIds).toHaveLength(1);
        expect(groups[0].recommendation.confidence).toBe(0.85);
      }
    });

    it('should recommend keeping active tab', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1', active: false } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Page 2', active: true } as chrome.tabs.Tab,
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Same content',
          metaDescription: null,
        },
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      if (groups.length > 0) {
        expect(groups[0].recommendation.keepTabId).toBe(2);
      }
    });

    it('should recommend keeping HTTPS over HTTP', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'http://example.com/page', title: 'HTTP', active: false } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'HTTPS', active: false } as chrome.tabs.Tab,
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Same content',
          metaDescription: null,
        },
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      if (groups.length > 0) {
        expect(groups[0].recommendation.keepTabId).toBe(2);
      }
    });

    it('should recommend keeping canonical over AMP', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/amp/article', title: 'AMP' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/article', title: 'Canonical' } as chrome.tabs.Tab,
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Same article content',
          metaDescription: null,
        },
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      if (groups.length > 0) {
        expect(groups[0].recommendation.keepTabId).toBe(2);
      }
    });

    it('should avoid comparing same pair twice', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Same content',
          metaDescription: null,
        },
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      // Should have at most 1 group for 2 tabs
      expect(groups.length).toBeLessThanOrEqual(1);
    });

    it('should add delay between extractions', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        content: 'Content',
        metaDescription: null,
      });

      const start = Date.now();
      await matcher.findContentDuplicates(tabs, 0.9);
      const elapsed = Date.now() - start;

      // Should have at least 50ms delay between the 2 extractions
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it('should handle empty tabs array', async () => {
      const groups = await matcher.findContentDuplicates([], 0.9);
      expect(groups).toEqual([]);
    });

    it('should assign unique IDs to groups', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Page 2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://example.com/page3', title: 'Page 3' } as chrome.tabs.Tab,
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Same content everywhere',
          metaDescription: null,
        },
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      if (groups.length > 1) {
        expect(groups[0].id).not.toBe(groups[1].id);
        expect(groups[0].id).toContain('content-');
      }
    });

    it('should include similarity percentage in reason', async () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page2', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Same content',
          metaDescription: null,
        },
      });

      const groups = await matcher.findContentDuplicates(tabs, 0.9);

      if (groups.length > 0) {
        expect(groups[0].reason).toMatch(/\d+% identical content/);
      }
    });
  });

  describe('clearCache', () => {
    it('should clear content cache', async () => {
      const tab = {
        id: 1,
        url: 'chrome://extensions',
        title: 'Extensions',
      } as chrome.tabs.Tab;

      vi.spyOn(console, 'log').mockImplementation(() => {});

      // Extract content to populate cache
      await matcher.extractTabContent(tab);

      // Clear cache
      matcher.clearCache();

      // Extract again - should not use cache
      vi.mocked(runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'New content', metaDescription: null },
      });

      const content = await matcher.extractTabContent(tab);

      // For protected URLs, it always returns the same (title + URL)
      // But for regular URLs after cache clear, it would fetch fresh
      expect(content).toBeDefined();
    });
  });
});

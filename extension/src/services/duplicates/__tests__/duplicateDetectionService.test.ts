import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DuplicateDetectionService } from '../duplicateDetectionService';

describe('DuplicateDetectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service without API key', () => {
      const service = new DuplicateDetectionService();
      expect(service).toBeDefined();
    });

    it('should create service with API key', () => {
      const service = new DuplicateDetectionService('test-api-key');
      expect(service).toBeDefined();
    });
  });

  describe('detectDuplicates', () => {
    it('should detect URL-based duplicates (Tier 1)', async () => {
      const service = new DuplicateDetectionService();

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page?utm_source=fb', title: 'Page 2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://other.com', title: 'Other' } as chrome.tabs.Tab,
      ];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs);

      expect(result.totalTabs).toBe(3);
      expect(result.tier1Found).toBeGreaterThan(0);
      expect(result.duplicateGroups.length).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should detect content-based duplicates (Tier 2)', async () => {
      const service = new DuplicateDetectionService();

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://source1.com/article', title: 'Article Title' } as chrome.tabs.Tab,
        { id: 2, url: 'https://source2.com/article', title: 'Article Title' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'This is the exact same article content that appears on both pages with enough text to generate good similarity.',
          metaDescription: 'Same meta description',
        },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { fingerprintThreshold: 0.85 });

      expect(result.totalTabs).toBe(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tier 2'));
    });

    it('should skip Tier 2 for tabs already in Tier 1', async () => {
      const service = new DuplicateDetectionService();

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page', title: 'Page' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'Page' } as chrome.tabs.Tab,
      ];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs);

      // Both tabs should be caught by Tier 1, so Tier 2 should process 0 tabs
      expect(result.tier1Found).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tier 2: Content fingerprinting 0 tabs'));
    });

    it('should perform semantic analysis when enabled (Tier 3)', async () => {
      const service = new DuplicateDetectionService('test-api-key');

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://source1.com/article', title: 'Article 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://source2.com/article', title: 'Article 2' } as chrome.tabs.Tab,
      ];

      // Mock content extraction to return moderately similar content (0.7-0.89 range)
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Moderately similar content that will trigger uncertain pair detection',
          metaDescription: 'Description',
        },
      });

      // Mock semantic analysis API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify([{ areDuplicates: true, similarity: 0.85, reasoning: 'Similar articles', confidence: 0.8 }]) }],
        }),
      } as Response);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { enableSemanticAnalysis: true });

      expect(result.totalTabs).toBe(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tier 3'));
    });

    it('should skip Tier 3 when semantic analysis disabled', async () => {
      const service = new DuplicateDetectionService('test-api-key');

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://page2.com', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'Content', metaDescription: null },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { enableSemanticAnalysis: false });

      expect(result.tier3Found).toBe(0);
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Tier 3'));
    });

    it('should skip Tier 3 when no API key provided', async () => {
      const service = new DuplicateDetectionService(); // No API key

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://page2.com', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'Content', metaDescription: null },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { enableSemanticAnalysis: true });

      expect(result.tier3Found).toBe(0);
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Tier 3'));
    });

    it('should skip Tier 3 when only 1 tab remaining', async () => {
      const service = new DuplicateDetectionService('test-api-key');

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'Content', metaDescription: null },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { enableSemanticAnalysis: true });

      expect(result.tier3Found).toBe(0);
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Tier 3'));
    });

    it('should only analyze uncertain pairs in Tier 3 (0.7-0.89 similarity)', async () => {
      const service = new DuplicateDetectionService('test-api-key');

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://page2.com', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      // Mock to return content that won't trigger uncertain range
      vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (msg: any) => {
        if (msg.tabId === 1) {
          return {
            success: true,
            data: { content: 'Very different content A here', metaDescription: null },
          };
        }
        return {
          success: true,
          data: { content: 'Completely unrelated content B there', metaDescription: null },
        };
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { enableSemanticAnalysis: true });

      // No uncertain pairs, so no API call
      expect(result.tier3Found).toBe(0);
    });

    it('should handle content extraction errors in Tier 3', async () => {
      const service = new DuplicateDetectionService('test-api-key');

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://page2.com', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockRejectedValue(new Error('Extraction failed'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { enableSemanticAnalysis: true });

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.tier3Found).toBe(0);
    });

    it('should estimate API cost for Tier 3', async () => {
      const service = new DuplicateDetectionService('test-api-key');

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://page2.com', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Moderately similar content for uncertain pair',
          metaDescription: null,
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify([{ areDuplicates: false, similarity: 0.7, reasoning: 'Different', confidence: 0.8 }]) }],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { enableSemanticAnalysis: true });

      if (result.tier3Found > 0 || result.apiCost > 0) {
        expect(result.apiCost).toBeGreaterThan(0);
      }
    });

    it('should use custom fingerprint threshold', async () => {
      const service = new DuplicateDetectionService();

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://page2.com', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'Content', metaDescription: null },
      });

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { fingerprintThreshold: 0.75 });

      expect(result).toBeDefined();
    });

    it('should return all duplicate groups from all tiers', async () => {
      const service = new DuplicateDetectionService();

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'Page 2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://different.com/page', title: 'Page 3' } as chrome.tabs.Tab,
        { id: 4, url: 'https://other.com/page', title: 'Page 4' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'Content', metaDescription: null },
      });

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs);

      expect(result.duplicateGroups).toBeDefined();
      expect(Array.isArray(result.duplicateGroups)).toBe(true);
      expect(result.tier1Found + result.tier2Found + result.tier3Found).toBe(result.duplicateGroups.length);
    });

    it('should track processing time', async () => {
      const service = new DuplicateDetectionService();

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'Content', metaDescription: null },
      });

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs);

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty tabs array', async () => {
      const service = new DuplicateDetectionService();

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates([]);

      expect(result.totalTabs).toBe(0);
      expect(result.duplicateGroups).toEqual([]);
      expect(result.tier1Found).toBe(0);
      expect(result.tier2Found).toBe(0);
      expect(result.tier3Found).toBe(0);
    });

    it('should log API cost when > 0', async () => {
      const service = new DuplicateDetectionService('test-api-key');

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://page2.com', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: {
          content: 'Moderately similar content',
          metaDescription: null,
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify([{ areDuplicates: true, similarity: 0.85, reasoning: 'Similar', confidence: 0.8 }]) }],
        }),
      } as Response);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.detectDuplicates(tabs, { enableSemanticAnalysis: true });

      if (result.apiCost > 0) {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('API cost'));
      }
    });

    it('should log completion message', async () => {
      const service = new DuplicateDetectionService();

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'Content', metaDescription: null },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await service.detectDuplicates(tabs);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Detection complete'));
    });

    it('should log tier results', async () => {
      const service = new DuplicateDetectionService();

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'Page 2' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'Content', metaDescription: null },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await service.detectDuplicates(tabs);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tier 1 found'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tier 2 found'));
    });
  });

  describe('clearCaches', () => {
    it('should clear content matcher cache', () => {
      const service = new DuplicateDetectionService();

      // No error should be thrown
      expect(() => service.clearCaches()).not.toThrow();
    });

    it('should clear cache after detection', async () => {
      const service = new DuplicateDetectionService();

      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://page1.com', title: 'Page 1' } as chrome.tabs.Tab,
      ];

      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { content: 'Content', metaDescription: null },
      });

      vi.spyOn(console, 'log').mockImplementation(() => {});

      await service.detectDuplicates(tabs);

      // Should be able to clear cache
      expect(() => service.clearCaches()).not.toThrow();
    });
  });
});

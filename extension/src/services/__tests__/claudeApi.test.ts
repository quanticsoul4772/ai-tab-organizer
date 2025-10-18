import { describe, it, expect, beforeEach, vi } from 'vitest';
import { claudeApi } from '../claudeApi';
import type { Tab } from '../../types';

describe('claudeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('categorizeTabs', () => {
    it('should successfully categorize tabs', async () => {
      const tabs: Tab[] = [
        { id: 1, url: 'https://github.com', title: 'GitHub' },
        { id: 2, url: 'https://gmail.com', title: 'Gmail' },
      ];

      const mockResponse = {
        Development: [0],
        Personal: [1],
      };

      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback?: any) => {
        if (callback) {
          callback({ success: true, data: mockResponse });
        }
        return undefined as any;
      });

      const result = await claudeApi.categorizeTabs(tabs, 'test-api-key');

      expect(result).toEqual(mockResponse);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'categorize', tabs, apiKey: 'test-api-key' },
        expect.any(Function)
      );
    });

    it('should handle chrome.runtime.lastError', async () => {
      const tabs: Tab[] = [
        { id: 1, url: 'https://example.com', title: 'Test' },
      ];

      // Mock lastError
      Object.defineProperty(chrome.runtime, 'lastError', {
        value: { message: 'Extension context invalidated' },
        writable: true,
        configurable: true,
      });

      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback?: any) => {
        if (callback) {
          callback({});
        }
        return undefined as any;
      });

      await expect(claudeApi.categorizeTabs(tabs, 'test-api-key')).rejects.toThrow(
        'Extension context invalidated'
      );

      // Clean up
      Object.defineProperty(chrome.runtime, 'lastError', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });

    it('should handle API errors', async () => {
      const tabs: Tab[] = [
        { id: 1, url: 'https://example.com', title: 'Test' },
      ];

      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback?: any) => {
        if (callback) {
          callback({ success: false, error: 'API rate limit exceeded' });
        }
        return undefined as any;
      });

      await expect(claudeApi.categorizeTabs(tabs, 'test-api-key')).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should handle errors without error message', async () => {
      const tabs: Tab[] = [
        { id: 1, url: 'https://example.com', title: 'Test' },
      ];

      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback?: any) => {
        if (callback) {
          callback({ success: false });
        }
        return undefined as any;
      });

      await expect(claudeApi.categorizeTabs(tabs, 'test-api-key')).rejects.toThrow(
        'Failed to categorize tabs'
      );
    });

    it('should pass API key to background worker', async () => {
      const tabs: Tab[] = [
        { id: 1, url: 'https://example.com', title: 'Test' },
      ];

      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback?: any) => {
        if (callback) {
          callback({ success: true, data: { Test: [0] } });
        }
        return undefined as any;
      });

      await claudeApi.categorizeTabs(tabs, 'my-secret-key');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'my-secret-key' }),
        expect.any(Function)
      );
    });

    it('should pass tabs to background worker', async () => {
      const tabs: Tab[] = [
        { id: 1, url: 'https://github.com', title: 'GitHub' },
        { id: 2, url: 'https://gitlab.com', title: 'GitLab' },
      ];

      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback?: any) => {
        if (callback) {
          callback({ success: true, data: { Development: [0, 1] } });
        }
        return undefined as any;
      });

      await claudeApi.categorizeTabs(tabs, 'test-api-key');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ tabs }),
        expect.any(Function)
      );
    });

    it('should include categorize action in message', async () => {
      const tabs: Tab[] = [{ id: 1, url: 'https://example.com', title: 'Test' }];

      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback?: any) => {
        if (callback) {
          callback({ success: true, data: {} });
        }
        return undefined as any;
      });

      await claudeApi.categorizeTabs(tabs, 'test-api-key');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'categorize' }),
        expect.any(Function)
      );
    });

    it('should handle empty tabs array', async () => {
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback?: any) => {
        if (callback) {
          callback({ success: true, data: {} });
        }
        return undefined as any;
      });

      const result = await claudeApi.categorizeTabs([], 'test-api-key');

      expect(result).toEqual({});
    });

    it('should return category response data', async () => {
      const tabs: Tab[] = [
        { id: 1, url: 'https://example.com', title: 'Test' },
      ];

      const categoryData = {
        Work: [0],
        Personal: [],
        Development: [],
      };

      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback?: any) => {
        if (callback) {
          callback({ success: true, data: categoryData });
        }
        return undefined as any;
      });

      const result = await claudeApi.categorizeTabs(tabs, 'test-api-key');

      expect(result).toEqual(categoryData);
    });
  });
});

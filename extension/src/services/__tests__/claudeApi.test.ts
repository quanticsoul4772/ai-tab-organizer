import { describe, it, expect, beforeEach, vi } from 'vitest';
import { claudeApi } from '../claudeApi';
import type { Tab } from '../../types';

// Mock the browserApi module
vi.mock('../../core/browserApi', () => ({
  runtime: {
    sendMessage: vi.fn(),
  },
}));

// Mock the constants
vi.mock('../../constants/actions', () => ({
  BACKGROUND_ACTIONS: {
    CATEGORIZE: 'categorize',
  },
}));

import { runtime } from '../../core/browserApi';

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

      vi.mocked(runtime.sendMessage).mockResolvedValue(mockResponse);

      const result = await claudeApi.categorizeTabs(tabs, 'test-api-key');

      expect(result).toEqual(mockResponse);
      expect(runtime.sendMessage).toHaveBeenCalledWith('categorize', {
        tabs,
        apiKey: 'test-api-key',
      });
    });

    it('should handle runtime errors', async () => {
      const tabs: Tab[] = [{ id: 1, url: 'https://example.com', title: 'Test' }];

      vi.mocked(runtime.sendMessage).mockRejectedValue(new Error('Extension context invalidated'));

      await expect(claudeApi.categorizeTabs(tabs, 'test-api-key')).rejects.toThrow(
        'Extension context invalidated'
      );
    });

    it('should handle API errors', async () => {
      const tabs: Tab[] = [{ id: 1, url: 'https://example.com', title: 'Test' }];

      vi.mocked(runtime.sendMessage).mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(claudeApi.categorizeTabs(tabs, 'test-api-key')).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should handle errors without error message', async () => {
      const tabs: Tab[] = [{ id: 1, url: 'https://example.com', title: 'Test' }];

      vi.mocked(runtime.sendMessage).mockRejectedValue(
        new Error('Failed to execute action: categorize')
      );

      await expect(claudeApi.categorizeTabs(tabs, 'test-api-key')).rejects.toThrow(
        'Failed to execute action: categorize'
      );
    });

    it('should pass API key to background worker', async () => {
      const tabs: Tab[] = [{ id: 1, url: 'https://example.com', title: 'Test' }];

      vi.mocked(runtime.sendMessage).mockResolvedValue({ Test: [0] });

      await claudeApi.categorizeTabs(tabs, 'my-secret-key');

      expect(runtime.sendMessage).toHaveBeenCalledWith(
        'categorize',
        expect.objectContaining({ apiKey: 'my-secret-key' })
      );
    });

    it('should pass tabs to background worker', async () => {
      const tabs: Tab[] = [
        { id: 1, url: 'https://github.com', title: 'GitHub' },
        { id: 2, url: 'https://gitlab.com', title: 'GitLab' },
      ];

      vi.mocked(runtime.sendMessage).mockResolvedValue({ Development: [0, 1] });

      await claudeApi.categorizeTabs(tabs, 'test-api-key');

      expect(runtime.sendMessage).toHaveBeenCalledWith(
        'categorize',
        expect.objectContaining({ tabs })
      );
    });

    it('should include categorize action in message', async () => {
      const tabs: Tab[] = [{ id: 1, url: 'https://example.com', title: 'Test' }];

      vi.mocked(runtime.sendMessage).mockResolvedValue({});

      await claudeApi.categorizeTabs(tabs, 'test-api-key');

      expect(runtime.sendMessage).toHaveBeenCalledWith('categorize', expect.anything());
    });

    it('should handle empty tabs array', async () => {
      vi.mocked(runtime.sendMessage).mockResolvedValue({});

      const result = await claudeApi.categorizeTabs([], 'test-api-key');

      expect(result).toEqual({});
    });

    it('should return category response data', async () => {
      const tabs: Tab[] = [{ id: 1, url: 'https://example.com', title: 'Test' }];

      const categoryData = {
        Work: [0],
        Personal: [],
        Development: [],
      };

      vi.mocked(runtime.sendMessage).mockResolvedValue(categoryData);

      const result = await claudeApi.categorizeTabs(tabs, 'test-api-key');

      expect(result).toEqual(categoryData);
    });
  });
});

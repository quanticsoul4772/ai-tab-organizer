import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tabManager } from '../tabManager';

describe('tabManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllTabs', () => {
    it('should get all tabs', async () => {
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
        { id: 2, title: 'Tab 2', url: 'https://google.com' },
      ];
      vi.mocked(chrome.tabs.query).mockResolvedValue(mockTabs as chrome.tabs.Tab[]);

      const result = await tabManager.getAllTabs();

      expect(result).toEqual(mockTabs);
      expect(chrome.tabs.query).toHaveBeenCalledWith({});
    });
  });

  describe('switchToTab', () => {
    it('should switch to a tab', async () => {
      const mockTab = { id: 1, title: 'Tab 1', url: 'https://example.com' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.tabs.update).mockResolvedValue(mockTab as any);

      await tabManager.switchToTab(1);

      expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    });
  });

  describe('closeTab', () => {
    it('should close a tab', async () => {
      vi.mocked(chrome.tabs.remove).mockResolvedValue(undefined);

      await tabManager.closeTab(1);

      expect(chrome.tabs.remove).toHaveBeenCalledWith(1);
    });
  });
});

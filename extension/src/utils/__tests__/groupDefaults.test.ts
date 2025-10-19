import { describe, it, expect } from 'vitest';

// Helper to create mock Tab objects
function createMockTab(partial: Partial<chrome.tabs.Tab>): chrome.tabs.Tab {
  return {
    index: 0,
    pinned: false,
    highlighted: false,
    windowId: 1,
    active: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    ...partial,
  } as chrome.tabs.Tab;
}
import { getDefaultCollapseState, hasRecentActivity } from '../groupDefaults';

describe('groupDefaults', () => {
  describe('getDefaultCollapseState', () => {
    it('should collapse groups with 2 or fewer tabs', () => {
      const tabs = [
        createMockTab({
          id: 1,
          title: 'Tab 1',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
        createMockTab({
          id: 2,
          title: 'Tab 2',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
      ] as chrome.tabs.Tab[];

      const result = getDefaultCollapseState('Test', tabs);

      expect(result).toBe(true);
    });

    it('should collapse single tab groups', () => {
      const tabs = [
        createMockTab({
          id: 1,
          title: 'Tab 1',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
      ] as chrome.tabs.Tab[];

      const result = getDefaultCollapseState('Test', tabs);

      expect(result).toBe(true);
    });

    it('should expand groups with 5 or more tabs', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tabs: any = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        title: `Tab ${i + 1}`,
        url: 'https://example.com',
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = getDefaultCollapseState('Test', tabs as any);

      expect(result).toBe(false);
    });

    it('should expand groups with recent activity', () => {
      const tabs = [
        createMockTab({
          id: 1,
          title: 'Tab 1',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
        createMockTab({
          id: 2,
          title: 'Tab 2',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
        createMockTab({
          id: 3,
          title: 'Tab 3',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
      ] as chrome.tabs.Tab[];

      const metadata = {
        tabCount: 3,
        hasRecentActivity: true,
        lastAccessed: Date.now(),
      };

      const result = getDefaultCollapseState('Test', tabs, metadata);

      expect(result).toBe(false);
    });

    it('should collapse medium groups without recent activity', () => {
      const tabs = [
        createMockTab({
          id: 1,
          title: 'Tab 1',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
        createMockTab({
          id: 2,
          title: 'Tab 2',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
        createMockTab({
          id: 3,
          title: 'Tab 3',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
      ] as chrome.tabs.Tab[];

      const result = getDefaultCollapseState('Test', tabs);

      expect(result).toBe(true);
    });
  });

  describe('hasRecentActivity', () => {
    it('should return true for tabs accessed within 5 minutes', () => {
      const tabs = [
        createMockTab({
          id: 1,
          title: 'Tab 1',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
      ] as chrome.tabs.Tab[];

      const lastAccessedMap = new Map<number, number>();
      lastAccessedMap.set(1, Date.now() - 2 * 60 * 1000); // 2 minutes ago

      const result = hasRecentActivity(tabs, lastAccessedMap);

      expect(result).toBe(true);
    });

    it('should return false for tabs accessed over 5 minutes ago', () => {
      const tabs = [
        createMockTab({
          id: 1,
          title: 'Tab 1',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
      ] as chrome.tabs.Tab[];

      const lastAccessedMap = new Map<number, number>();
      lastAccessedMap.set(1, Date.now() - 10 * 60 * 1000); // 10 minutes ago

      const result = hasRecentActivity(tabs, lastAccessedMap);

      expect(result).toBe(false);
    });

    it('should return false when no access times are tracked', () => {
      const tabs = [
        createMockTab({
          id: 1,
          title: 'Tab 1',
          url: 'https://example.com',
        } as chrome.tabs.Tab as chrome.tabs.Tab),
      ] as chrome.tabs.Tab[];

      const lastAccessedMap = new Map<number, number>();

      const result = hasRecentActivity(tabs, lastAccessedMap);

      expect(result).toBe(false);
    });
  });
});

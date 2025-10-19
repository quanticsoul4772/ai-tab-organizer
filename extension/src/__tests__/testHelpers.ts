import type { Tab } from '../types';

/**
 * Create a mock Chrome Tab object with all required properties
 */
export function createMockTab(overrides: Partial<Tab> = {}): Tab {
  const defaultTab: Tab = {
    id: 1,
    index: 0,
    windowId: 1,
    highlighted: false,
    active: false,
    pinned: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    url: 'https://example.com',
    title: 'Example Page',
    favIconUrl: 'https://example.com/favicon.ico',
  };

  return { ...defaultTab, ...overrides };
}

/**
 * Create multiple mock tabs
 */
export function createMockTabs(count: number, baseOverrides: Partial<Tab> = {}): Tab[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTab({
      ...baseOverrides,
      id: i + 1,
      index: i,
      title: `Tab ${i + 1}`,
      url: `https://example${i + 1}.com`,
    })
  );
}

/**
 * Helper to cast chrome.storage.local.get mock resolved value
 * This helps with TypeScript type inference issues with vitest mocks
 */
export function mockStorageGet<T>(value: T): any {
  return value;
}

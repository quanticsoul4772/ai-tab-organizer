import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '../storage';
import type { TabSummary, CategorySummary, SummarySettings, JiraSettings } from '../../types';
import type { DensityMode } from '../../types/density';

describe('storage - core methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Key Management', () => {
    describe('getApiKey', () => {
      it('should return API key if it exists', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({
          anthropicApiKey: 'test-api-key-123',
        });

        const result = await storage.getApiKey();

        expect(result).toBe('test-api-key-123');
        expect(chrome.storage.local.get).toHaveBeenCalledWith(['anthropicApiKey']);
      });

      it('should return null if no API key exists', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({});

        const result = await storage.getApiKey();

        expect(result).toBeNull();
      });
    });

    describe('setApiKey', () => {
      it('should save API key to storage', async () => {
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.setApiKey('new-api-key');

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          anthropicApiKey: 'new-api-key',
        });
      });
    });

    describe('clearApiKey', () => {
      it('should remove API key from storage', async () => {
        vi.mocked(chrome.storage.local.remove).mockResolvedValue(undefined);

        await storage.clearApiKey();

        expect(chrome.storage.local.remove).toHaveBeenCalledWith('anthropicApiKey');
      });
    });
  });

  describe('Summary Cache Management', () => {
    describe('getSummaryCache', () => {
      it('should return existing cache', async () => {
        const mockCache = {
          tabs: { 123: { tabId: 123, summary: 'Test', timestamp: Date.now() } },
          categories: { Work: { category: 'Work', summary: 'Work tabs', tabCount: 5, timestamp: Date.now() } },
        };

        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: mockCache });

        const result = await storage.getSummaryCache();

        expect(result).toEqual(mockCache);
      });

      it('should return empty cache if none exists', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({});

        const result = await storage.getSummaryCache();

        expect(result).toEqual({ tabs: {}, categories: {} });
      });
    });

    describe('setSummaryCache', () => {
      it('should save cache to storage', async () => {
        const mockCache = {
          tabs: { 456: { tabId: 456, summary: 'Test', timestamp: Date.now() } },
          categories: {},
        };

        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.setSummaryCache(mockCache);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ summaryCache: mockCache });
      });
    });

    describe('getCachedTabSummary', () => {
      it('should return cached tab summary if not expired', async () => {
        const summary: TabSummary = {
          tabId: 123,
          summary: 'Test summary',
          timestamp: Date.now() - 1000, // 1 second ago
        };

        const mockCache = { tabs: { 123: summary }, categories: {} };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: mockCache });

        const result = await storage.getCachedTabSummary(123);

        expect(result).toEqual(summary);
      });

      it('should return null if tab summary not in cache', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: { tabs: {}, categories: {} } });

        const result = await storage.getCachedTabSummary(123);

        expect(result).toBeNull();
      });

      it('should return null and remove expired tab summary', async () => {
        const expiredSummary: TabSummary = {
          tabId: 123,
          summary: 'Old summary',
          timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago (expired)
        };

        const mockCache = { tabs: { 123: expiredSummary }, categories: {} };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: mockCache });
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        const result = await storage.getCachedTabSummary(123);

        expect(result).toBeNull();
        // Should have called setSummaryCache to remove expired entry
        expect(chrome.storage.local.set).toHaveBeenCalled();
      });
    });

    describe('cacheTabSummary', () => {
      it('should add tab summary to cache', async () => {
        const summary: TabSummary = {
          tabId: 456,
          summary: 'New summary',
          timestamp: Date.now(),
        };

        const existingCache = { tabs: {}, categories: {} };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: existingCache });
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.cacheTabSummary(summary);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          summaryCache: {
            tabs: { 456: summary },
            categories: {},
          },
        });
      });
    });

    describe('removeCachedTabSummary', () => {
      it('should remove tab summary from cache', async () => {
        const mockCache = {
          tabs: {
            123: { tabId: 123, summary: 'Test', timestamp: Date.now() },
            456: { tabId: 456, summary: 'Other', timestamp: Date.now() },
          },
          categories: {},
        };

        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: mockCache });
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.removeCachedTabSummary(123);

        const expectedCache = {
          tabs: { 456: mockCache.tabs[456] },
          categories: {},
        };

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ summaryCache: expectedCache });
      });
    });

    describe('getCachedCategorySummary', () => {
      it('should return cached category summary if not expired', async () => {
        const summary: CategorySummary = {
          category: 'Work',
          summary: 'Work tabs',
          tabCount: 5,
          timestamp: Date.now() - 1000,
        };

        const mockCache = { tabs: {}, categories: { Work: summary } };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: mockCache });

        const result = await storage.getCachedCategorySummary('Work');

        expect(result).toEqual(summary);
      });

      it('should return null if category not in cache', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: { tabs: {}, categories: {} } });

        const result = await storage.getCachedCategorySummary('Work');

        expect(result).toBeNull();
      });

      it('should return null and remove expired category summary', async () => {
        const expiredSummary: CategorySummary = {
          category: 'Work',
          summary: 'Old summary',
          tabCount: 3,
          timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        };

        const mockCache = { tabs: {}, categories: { Work: expiredSummary } };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: mockCache });
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        const result = await storage.getCachedCategorySummary('Work');

        expect(result).toBeNull();
        expect(chrome.storage.local.set).toHaveBeenCalled();
      });
    });

    describe('cacheCategorySummary', () => {
      it('should add category summary to cache', async () => {
        const summary: CategorySummary = {
          category: 'Personal',
          summary: 'Personal tabs',
          tabCount: 3,
          timestamp: Date.now(),
        };

        const existingCache = { tabs: {}, categories: {} };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: existingCache });
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.cacheCategorySummary(summary);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          summaryCache: {
            tabs: {},
            categories: { Personal: summary },
          },
        });
      });
    });

    describe('removeCachedCategorySummary', () => {
      it('should remove category summary from cache', async () => {
        const mockCache = {
          tabs: {},
          categories: {
            Work: { category: 'Work', summary: 'Work tabs', tabCount: 5, timestamp: Date.now() },
            Personal: { category: 'Personal', summary: 'Personal tabs', tabCount: 3, timestamp: Date.now() },
          },
        };

        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summaryCache: mockCache });
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.removeCachedCategorySummary('Work');

        const expectedCache = {
          tabs: {},
          categories: { Personal: mockCache.categories.Personal },
        };

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ summaryCache: expectedCache });
      });
    });

    describe('clearSummaryCache', () => {
      it('should remove all summary cache from storage', async () => {
        vi.mocked(chrome.storage.local.remove).mockResolvedValue(undefined);

        await storage.clearSummaryCache();

        expect(chrome.storage.local.remove).toHaveBeenCalledWith('summaryCache');
      });
    });
  });

  describe('Settings Management', () => {
    describe('getSummarySettings', () => {
      it('should return stored summary settings', async () => {
        const settings: SummarySettings = { enabled: false, cacheDuration: 48 };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ summarySettings: settings });

        const result = await storage.getSummarySettings();

        expect(result).toEqual(settings);
      });

      it('should return default settings if none exist', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({});

        const result = await storage.getSummarySettings();

        expect(result).toEqual({ enabled: true, cacheDuration: 24 });
      });
    });

    describe('setSummarySettings', () => {
      it('should save summary settings', async () => {
        const settings: SummarySettings = { enabled: false, cacheDuration: 12 };
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.setSummarySettings(settings);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ summarySettings: settings });
      });
    });

    describe('getJiraSettings', () => {
      it('should return stored Jira settings', async () => {
        const settings: JiraSettings = { smartMode: false };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ jiraSettings: settings });

        const result = await storage.getJiraSettings();

        expect(result).toEqual(settings);
      });

      it('should return default settings if none exist', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({});

        const result = await storage.getJiraSettings();

        expect(result).toEqual({ smartMode: true });
      });
    });

    describe('setJiraSettings', () => {
      it('should save Jira settings', async () => {
        const settings: JiraSettings = { smartMode: false };
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.setJiraSettings(settings);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ jiraSettings: settings });
      });
    });
  });

  describe('Density Mode', () => {
    describe('getDensityMode', () => {
      it('should return stored density mode', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ densityMode: 'compact' as DensityMode });

        const result = await storage.getDensityMode();

        expect(result).toBe('compact');
      });

      it('should return null if no density mode set', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({});

        const result = await storage.getDensityMode();

        expect(result).toBeNull();
      });
    });

    describe('setDensityMode', () => {
      it('should save density mode', async () => {
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.setDensityMode('spacious' as DensityMode);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ densityMode: 'spacious' });
      });
    });
  });

  describe('Group States', () => {
    describe('getGroupStates', () => {
      it('should return stored group states', async () => {
        const states = { 'category-work': true, 'category-personal': false };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ groupStates: states });

        const result = await storage.getGroupStates();

        expect(result).toEqual(states);
      });

      it('should return empty object if no states exist', async () => {
        vi.mocked(chrome.storage.local.get).mockResolvedValue({});

        const result = await storage.getGroupStates();

        expect(result).toEqual({});
      });
    });

    describe('setGroupState', () => {
      it('should set collapse state for a specific group', async () => {
        const existingStates = { 'category-work': false };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ groupStates: existingStates });
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.setGroupState('category-personal', true);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          groupStates: {
            'category-work': false,
            'category-personal': true,
          },
        });
      });

      it('should update existing group state', async () => {
        const existingStates = { 'category-work': false };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ groupStates: existingStates });
        vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

        await storage.setGroupState('category-work', true);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          groupStates: { 'category-work': true },
        });
      });
    });

    describe('clearGroupStates', () => {
      it('should remove all group states from storage', async () => {
        vi.mocked(chrome.storage.local.remove).mockResolvedValue(undefined);

        await storage.clearGroupStates();

        expect(chrome.storage.local.remove).toHaveBeenCalledWith('groupStates');
      });
    });
  });
});

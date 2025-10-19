import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '../storage';
import type { SummarySettings, JiraSettings } from '../../types';
import type { DensityMode } from '../../types/density';

describe('storage - core methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Key Management', () => {
    describe('getApiKey', () => {
      it('should return API key if it exists', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          anthropicApiKey: 'test-api-key-123',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = await storage.getApiKey();

        expect(result).toBe('test-api-key-123');
        expect(chrome.storage.local.get).toHaveBeenCalledWith(['anthropicApiKey']);
      });

      it('should return null if no API key exists', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

        const result = await storage.getApiKey();

        expect(result).toBeNull();
      });
    });

    describe('setApiKey', () => {
      it('should save API key to storage', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

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
          tabs: {
            123: {
              tabId: 123,
              url: '',
              title: '',
              summary: 'Test',
              timestamp: Date.now(),
              tokens: 0,
            },
          },
          categories: {
            Work: {
              category: 'Work',
              summary: 'Work tabs',
              tabCount: 5,
              timestamp: Date.now(),
              tokens: 0,
            },
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: mockCache,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = await storage.getSummaryCache();

        expect(result).toEqual(mockCache);
      });

      it('should return empty cache if none exists', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

        const result = await storage.getSummaryCache();

        expect(result).toEqual({ tabs: {}, categories: {} });
      });
    });

    describe('setSummaryCache', () => {
      it('should save cache to storage', async () => {
        const mockCache = {
          tabs: {
            456: {
              tabId: 456,
              url: '',
              title: '',
              summary: 'Test',
              timestamp: Date.now(),
              tokens: 0,
            },
          },
          categories: {},
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

        await storage.setSummaryCache(mockCache);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ summaryCache: mockCache });
      });
    });

    describe('getCachedTabSummary', () => {
      it('should return cached tab summary if not expired', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary: any = {
          tabId: 123,
          summary: 'Test summary',
          timestamp: Date.now() - 1000, // 1 second ago
        };

        const mockCache = { tabs: { 123: summary }, categories: {} };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: mockCache,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = await storage.getCachedTabSummary(123);

        expect(result).toEqual(summary);
      });

      it('should return null if tab summary not in cache', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: { tabs: {}, categories: {} },
        });

        const result = await storage.getCachedTabSummary(123);

        expect(result).toBeNull();
      });

      it('should return null and remove expired tab summary', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expiredSummary: any = {
          tabId: 123,
          summary: 'Old summary',
          timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (expired)
        };

        const mockCache = { tabs: { 123: expiredSummary }, categories: {} };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: mockCache,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

        const result = await storage.getCachedTabSummary(123);

        expect(result).toBeNull();
        // Should have called setSummaryCache to remove expired entry
        expect(chrome.storage.local.set).toHaveBeenCalled();
      });
    });

    describe('cacheTabSummary', () => {
      it('should add tab summary to cache', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary: any = {
          tabId: 456,
          summary: 'New summary',
          timestamp: Date.now(),
        };

        const existingCache = { tabs: {}, categories: {} };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: existingCache,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

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
            123: {
              tabId: 123,
              url: '',
              title: '',
              summary: 'Test',
              timestamp: Date.now(),
              tokens: 0,
            },
            456: {
              tabId: 456,
              url: '',
              title: '',
              summary: 'Other',
              timestamp: Date.now(),
              tokens: 0,
            },
          },
          categories: {},
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: mockCache,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary: any = {
          category: 'Work',
          summary: 'Work tabs',
          tabCount: 5,
          timestamp: Date.now() - 1000,
        };

        const mockCache = { tabs: {}, categories: { Work: summary } };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: mockCache,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = await storage.getCachedCategorySummary('Work');

        expect(result).toEqual(summary);
      });

      it('should return null if category not in cache', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: { tabs: {}, categories: {} },
        });

        const result = await storage.getCachedCategorySummary('Work');

        expect(result).toBeNull();
      });

      it('should return null and remove expired category summary', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expiredSummary: any = {
          category: 'Work',
          summary: 'Old summary',
          tabCount: 3,
          timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        };

        const mockCache = { tabs: {}, categories: { Work: expiredSummary } };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: mockCache,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

        const result = await storage.getCachedCategorySummary('Work');

        expect(result).toBeNull();
        expect(chrome.storage.local.set).toHaveBeenCalled();
      });
    });

    describe('cacheCategorySummary', () => {
      it('should add category summary to cache', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary: any = {
          category: 'Personal',
          summary: 'Personal tabs',
          tabCount: 3,
          timestamp: Date.now(),
        };

        const existingCache = { tabs: {}, categories: {} };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: existingCache,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

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
            Work: {
              category: 'Work',
              summary: 'Work tabs',
              tabCount: 5,
              timestamp: Date.now(),
              tokens: 0,
            },
            Personal: {
              category: 'Personal',
              summary: 'Personal tabs',
              tabCount: 3,
              timestamp: Date.now(),
            },
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summaryCache: mockCache,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          summarySettings: settings,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = await storage.getSummarySettings();

        expect(result).toEqual(settings);
      });

      it('should return default settings if none exist', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

        const result = await storage.getSummarySettings();

        expect(result).toEqual({ enabled: true, cacheDuration: 24 });
      });
    });

    describe('setSummarySettings', () => {
      it('should save summary settings', async () => {
        const settings: SummarySettings = { enabled: false, cacheDuration: 12 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

        await storage.setSummarySettings(settings);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ summarySettings: settings });
      });
    });

    describe('getJiraSettings', () => {
      it('should return stored Jira settings', async () => {
        const settings: JiraSettings = { smartMode: false };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          jiraSettings: settings,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = await storage.getJiraSettings();

        expect(result).toEqual(settings);
      });

      it('should return default settings if none exist', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

        const result = await storage.getJiraSettings();

        expect(result).toEqual({ smartMode: true });
      });
    });

    describe('setJiraSettings', () => {
      it('should save Jira settings', async () => {
        const settings: JiraSettings = { smartMode: false };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

        await storage.setJiraSettings(settings);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ jiraSettings: settings });
      });
    });
  });

  describe('Density Mode', () => {
    describe('getDensityMode', () => {
      it('should return stored density mode', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          densityMode: 'compact' as DensityMode,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = await storage.getDensityMode();

        expect(result).toBe('compact');
      });

      it('should return null if no density mode set', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

        const result = await storage.getDensityMode();

        expect(result).toBeNull();
      });
    });

    describe('setDensityMode', () => {
      it('should save density mode', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

        await storage.setDensityMode('spacious' as DensityMode);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ densityMode: 'spacious' });
      });
    });
  });

  describe('Group States', () => {
    describe('getGroupStates', () => {
      it('should return stored group states', async () => {
        const states = { 'category-work': true, 'category-personal': false };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          groupStates: states,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = await storage.getGroupStates();

        expect(result).toEqual(states);
      });

      it('should return empty object if no states exist', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

        const result = await storage.getGroupStates();

        expect(result).toEqual({});
      });
    });

    describe('setGroupState', () => {
      it('should set collapse state for a specific group', async () => {
        const existingStates = { 'category-work': false };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          groupStates: existingStates,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
          groupStates: existingStates,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

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

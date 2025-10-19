import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SearchQuery, SearchResult } from '../../types/search';
import type { IndexedTab } from '../../types/search';

// Mock all dependencies
vi.mock('../queryParser');
vi.mock('../tabIndexer');
vi.mock('../localSearch');
vi.mock('../aiRanker');
vi.mock('../../utils/searchCache');
vi.mock('../jira/jiraSearchEnhancer');

// Import mocked modules
import { parseSearchQuery } from '../queryParser';
import { getIndexedTabs } from '../tabIndexer';
import { filterTabsLocally } from '../localSearch';
import { rankTabsByRelevance } from '../aiRanker';
import { getCachedSearch, cacheSearchResults } from '../../utils/searchCache';
import { JiraSearchEnhancer } from '../jira/jiraSearchEnhancer';

// Import service under test
const { searchTabs, switchToTab, closeTab } = await import('../searchService');

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchTabs', () => {
    it('should return cached results if available', async () => {
      const cachedResults: SearchResult[] = [
        {
          tab: { id: 1, title: 'Test', url: 'https://test.com' },
          relevanceScore: 0.9,
          matchedFields: ['title'],
          highlights: ['test'],
        },
      ];

      vi.mocked(getCachedSearch).mockResolvedValue(cachedResults);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await searchTabs('test query', 'api-key');

      expect(results).toEqual(cachedResults);
      expect(getCachedSearch).toHaveBeenCalledWith('test query');
      expect(consoleSpy).toHaveBeenCalledWith('Returning cached results');
      expect(parseSearchQuery).not.toHaveBeenCalled();
    });

    it('should use Jira-enhanced search for ticket patterns', async () => {
      vi.mocked(getCachedSearch).mockResolvedValue(null);
      vi.mocked(JiraSearchEnhancer.isTicketPattern).mockReturnValue(true);
      vi.mocked(JiraSearchEnhancer.isProjectPattern).mockReturnValue(false);

      const mockTab = { id: 1, title: 'ENG-123: Bug', url: 'https://jira.com/browse/ENG-123' };
      const jiraResults = [
        {
          tab: mockTab,
          score: 1.0,
          reason: 'exact-match',
        },
      ];

      vi.mocked(JiraSearchEnhancer.searchJiraTabs).mockReturnValue(jiraResults);
      vi.mocked(chrome.tabs.query).mockResolvedValue([mockTab] as chrome.tabs.Tab[]);
      vi.mocked(cacheSearchResults).mockResolvedValue(undefined);

      const results = await searchTabs('ENG-123', 'api-key');

      expect(results).toHaveLength(1);
      expect(results[0].tab).toEqual(mockTab);
      expect(results[0].relevanceScore).toBe(1.0);
      expect(results[0].matchedFields).toEqual(['jira-ticket']);
      expect(cacheSearchResults).toHaveBeenCalledWith('ENG-123', results);
    });

    it('should use Jira-enhanced search for project patterns', async () => {
      vi.mocked(getCachedSearch).mockResolvedValue(null);
      vi.mocked(JiraSearchEnhancer.isTicketPattern).mockReturnValue(false);
      vi.mocked(JiraSearchEnhancer.isProjectPattern).mockReturnValue(true);

      const mockTab = { id: 2, title: 'ENG-456', url: 'https://jira.com/browse/ENG-456' };
      const jiraResults = [
        {
          tab: mockTab,
          score: 0.8,
          reason: 'project-match',
        },
      ];

      vi.mocked(JiraSearchEnhancer.searchJiraTabs).mockReturnValue(jiraResults);
      vi.mocked(chrome.tabs.query).mockResolvedValue([mockTab] as chrome.tabs.Tab[]);
      vi.mocked(cacheSearchResults).mockResolvedValue(undefined);

      const results = await searchTabs('ENG', 'api-key');

      expect(results).toHaveLength(1);
      expect(results[0].matchReason).toBe('project-match');
    });

    it('should fallback to regular search if Jira search returns no results', async () => {
      vi.mocked(getCachedSearch).mockResolvedValue(null);
      vi.mocked(JiraSearchEnhancer.isTicketPattern).mockReturnValue(true);
      vi.mocked(JiraSearchEnhancer.searchJiraTabs).mockReturnValue([]);
      vi.mocked(chrome.tabs.query).mockResolvedValue([]);

      const mockQuery: SearchQuery = {
        originalQuery: 'ENG-123',
        tokens: ['eng', '123'],
        filters: {},
      };

      const mockIndexedTabs = new Map<number, IndexedTab>([
        [
          1,
          {
            tabId: 1,
            title: 'Different Page',
            url: 'https://different.com',
            content: 'some content',
            timestamp: Date.now(),
          },
        ],
      ]);

      const mockCandidates = [
        {
          tab: { id: 1, title: 'Different Page', url: 'https://different.com' },
          relevanceScore: 0.5,
          matchedFields: ['content'],
          highlights: ['123'],
        },
      ];

      vi.mocked(parseSearchQuery).mockResolvedValue(mockQuery);
      vi.mocked(getIndexedTabs).mockResolvedValue(mockIndexedTabs);
      vi.mocked(filterTabsLocally).mockResolvedValue(mockCandidates);
      vi.mocked(rankTabsByRelevance).mockResolvedValue(mockCandidates);
      vi.mocked(cacheSearchResults).mockResolvedValue(undefined);

      const results = await searchTabs('ENG-123', 'api-key');

      expect(parseSearchQuery).toHaveBeenCalledWith('ENG-123', 'api-key');
      expect(results).toEqual(mockCandidates);
    });

    it('should perform full search pipeline for regular queries', async () => {
      vi.mocked(getCachedSearch).mockResolvedValue(null);
      vi.mocked(JiraSearchEnhancer.isTicketPattern).mockReturnValue(false);
      vi.mocked(JiraSearchEnhancer.isProjectPattern).mockReturnValue(false);

      const mockQuery: SearchQuery = {
        originalQuery: 'login page',
        tokens: ['login', 'page'],
        filters: {},
      };

      const mockIndexedTabs = new Map<number, IndexedTab>([
        [
          1,
          {
            tabId: 1,
            title: 'Login Page',
            url: 'https://example.com/login',
            content: 'login page content',
            timestamp: Date.now(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Home',
            url: 'https://example.com',
            content: 'home content',
            timestamp: Date.now(),
          },
        ],
      ]);

      const mockCandidates = [
        {
          tab: { id: 1, title: 'Login Page', url: 'https://example.com/login' },
          relevanceScore: 0.7,
          matchedFields: ['title', 'content'],
          highlights: ['login', 'page'],
        },
      ];

      const mockRankedResults = [
        {
          tab: { id: 1, title: 'Login Page', url: 'https://example.com/login' },
          relevanceScore: 0.95,
          matchedFields: ['title', 'content'],
          highlights: ['login', 'page'],
        },
      ];

      vi.mocked(parseSearchQuery).mockResolvedValue(mockQuery);
      vi.mocked(getIndexedTabs).mockResolvedValue(mockIndexedTabs);
      vi.mocked(filterTabsLocally).mockResolvedValue(mockCandidates);
      vi.mocked(rankTabsByRelevance).mockResolvedValue(mockRankedResults);
      vi.mocked(cacheSearchResults).mockResolvedValue(undefined);

      const results = await searchTabs('login page', 'api-key');

      expect(parseSearchQuery).toHaveBeenCalledWith('login page', 'api-key');
      expect(getIndexedTabs).toHaveBeenCalled();
      expect(filterTabsLocally).toHaveBeenCalledWith(mockQuery, mockIndexedTabs);
      expect(rankTabsByRelevance).toHaveBeenCalledWith(mockQuery, mockCandidates, 'api-key');
      expect(cacheSearchResults).toHaveBeenCalledWith('login page', mockRankedResults);
      expect(results).toEqual(mockRankedResults);
    });

    it('should return empty array if no tabs are indexed', async () => {
      vi.mocked(getCachedSearch).mockResolvedValue(null);
      vi.mocked(JiraSearchEnhancer.isTicketPattern).mockReturnValue(false);
      vi.mocked(JiraSearchEnhancer.isProjectPattern).mockReturnValue(false);

      const mockQuery: SearchQuery = {
        originalQuery: 'test',
        tokens: ['test'],
        filters: {},
      };

      vi.mocked(parseSearchQuery).mockResolvedValue(mockQuery);
      vi.mocked(getIndexedTabs).mockResolvedValue(new Map());

      const results = await searchTabs('test', 'api-key');

      expect(results).toEqual([]);
      expect(filterTabsLocally).not.toHaveBeenCalled();
    });

    it('should return empty array if no candidates match', async () => {
      vi.mocked(getCachedSearch).mockResolvedValue(null);
      vi.mocked(JiraSearchEnhancer.isTicketPattern).mockReturnValue(false);
      vi.mocked(JiraSearchEnhancer.isProjectPattern).mockReturnValue(false);

      const mockQuery: SearchQuery = {
        originalQuery: 'nonexistent',
        tokens: ['nonexistent'],
        filters: {},
      };

      const mockIndexedTabs = new Map<number, IndexedTab>([
        [
          1,
          {
            tabId: 1,
            title: 'Different',
            url: 'https://different.com',
            content: 'different content',
            timestamp: Date.now(),
          },
        ],
      ]);

      vi.mocked(parseSearchQuery).mockResolvedValue(mockQuery);
      vi.mocked(getIndexedTabs).mockResolvedValue(mockIndexedTabs);
      vi.mocked(filterTabsLocally).mockResolvedValue([]);

      const results = await searchTabs('nonexistent', 'api-key');

      expect(results).toEqual([]);
      expect(rankTabsByRelevance).not.toHaveBeenCalled();
    });

    it('should return top 10 results if more than 10 match', async () => {
      vi.mocked(getCachedSearch).mockResolvedValue(null);
      vi.mocked(JiraSearchEnhancer.isTicketPattern).mockReturnValue(false);
      vi.mocked(JiraSearchEnhancer.isProjectPattern).mockReturnValue(false);

      const mockQuery: SearchQuery = {
        originalQuery: 'test',
        tokens: ['test'],
        filters: {},
      };

      const mockIndexedTabs = new Map<number, IndexedTab>();
      const mockRankedResults: SearchResult[] = [];

      for (let i = 1; i <= 15; i++) {
        mockIndexedTabs.set(i, {
          tabId: i,
          title: `Test ${i}`,
          url: `https://test${i}.com`,
          content: 'test content',
          timestamp: Date.now(),
        });

        mockRankedResults.push({
          tab: { id: i, title: `Test ${i}`, url: `https://test${i}.com` },
          relevanceScore: 1 - i * 0.01,
          matchedFields: ['title'],
          highlights: ['test'],
        });
      }

      vi.mocked(parseSearchQuery).mockResolvedValue(mockQuery);
      vi.mocked(getIndexedTabs).mockResolvedValue(mockIndexedTabs);
      vi.mocked(filterTabsLocally).mockResolvedValue(mockRankedResults);
      vi.mocked(rankTabsByRelevance).mockResolvedValue(mockRankedResults);
      vi.mocked(cacheSearchResults).mockResolvedValue(undefined);

      const results = await searchTabs('test', 'api-key');

      expect(results).toHaveLength(10);
      expect(results[0].tab.id).toBe(1);
      expect(results[9].tab.id).toBe(10);
    });
  });

  describe('switchToTab', () => {
    it('should activate tab and focus window', async () => {
      const mockTab = {
        id: 123,
        windowId: 456,
        title: 'Test',
        url: 'https://test.com',
      };

      vi.mocked(chrome.tabs.get).mockResolvedValue(mockTab as chrome.tabs.Tab);
      vi.mocked(chrome.tabs.update).mockResolvedValue(mockTab as chrome.tabs.Tab);
      vi.mocked(chrome.windows.update).mockResolvedValue({} as chrome.windows.Window);

      await switchToTab(123);

      expect(chrome.tabs.get).toHaveBeenCalledWith(123);
      expect(chrome.tabs.update).toHaveBeenCalledWith(123, { active: true });
      expect(chrome.windows.update).toHaveBeenCalledWith(456, { focused: true });
    });
  });

  describe('closeTab', () => {
    it('should remove the tab', async () => {
      vi.mocked(chrome.tabs.remove).mockResolvedValue(undefined);

      await closeTab(789);

      expect(chrome.tabs.remove).toHaveBeenCalledWith(789);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { filterTabsLocally } from '../localSearch';
import type { SearchQuery, IndexedTab } from '../../types/search';

describe('localSearch', () => {
  describe('filterTabsLocally', () => {
    const createTab = (
      id: number,
      title: string,
      url: string,
      content: string = '',
      category?: string,
      lastAccessed?: number
    ): IndexedTab => ({
      tabId: id,
      title,
      url,
      content,
      timestamp: Date.now(),
      category,
      lastAccessed: lastAccessed || Date.now(),
    });

    it('should match tabs by title keywords', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'Login Page', 'https://example.com/login', 'login form')],
        [2, createTab(2, 'Home Page', 'https://example.com', 'home content')],
        [3, createTab(3, 'Settings', 'https://example.com/settings', 'settings page')],
      ]);

      const query: SearchQuery = {
        originalQuery: 'login',
        keywords: ['login'],
        tokens: ['login'],
        filters: {},
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(1);
      expect(results[0].tabId).toBe(1);
    });

    it('should match tabs by URL keywords', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'Page 1', 'https://github.com/user/repo', 'content 1')],
        [2, createTab(2, 'Page 2', 'https://example.com', 'content 2')],
      ]);

      const query: SearchQuery = {
        originalQuery: 'github',
        keywords: ['github'],
        tokens: ['github'],
        filters: {},
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(1);
      expect(results[0].tabId).toBe(1);
    });

    it('should match tabs by content keywords', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'Article', 'https://blog.com/post1', 'interesting article about react')],
        [2, createTab(2, 'Post', 'https://blog.com/post2', 'tutorial about vue')],
      ]);

      const query: SearchQuery = {
        originalQuery: 'react',
        keywords: ['react'],
        tokens: ['react'],
        filters: {},
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(1);
      expect(results[0].tabId).toBe(1);
    });

    it('should prioritize title matches over URL and content', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'test', 'https://example.com', 'some content')],
        [2, createTab(2, 'Article', 'https://test.com', 'some content')],
        [3, createTab(3, 'Other Page', 'https://example.com', 'test in content')],
      ]);

      const query: SearchQuery = {
        originalQuery: 'test',
        keywords: ['test'],
        tokens: ['test'],
        filters: {},
      };

      const results = await filterTabsLocally(query, tabs);

      // Title match (40 pts) should rank higher than URL (20 pts) and content (10 pts)
      expect(results).toHaveLength(3);
      expect(results[0].tabId).toBe(1); // Title match
      expect(results[1].tabId).toBe(2); // URL match
      expect(results[2].tabId).toBe(3); // Content match
    });

    it('should match multiple keywords', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'React Tutorial', 'https://example.com', 'learn react hooks')],
        [2, createTab(2, 'React Guide', 'https://example.com', 'react guide')],
        [3, createTab(3, 'Vue Tutorial', 'https://example.com', 'vue tutorial')],
      ]);

      const query: SearchQuery = {
        originalQuery: 'react tutorial',
        keywords: ['react', 'tutorial'],
        tokens: ['react', 'tutorial'],
        filters: {},
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results[0].tabId).toBe(1); // Matches both keywords
    });

    it('should return all tabs if no keywords specified', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'Page 1', 'https://a.com', 'content 1')],
        [2, createTab(2, 'Page 2', 'https://b.com', 'content 2')],
        [3, createTab(3, 'Page 3', 'https://c.com', 'content 3')],
      ]);

      const query: SearchQuery = {
        originalQuery: '',
        keywords: [],
        tokens: [],
        filters: {},
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(3);
    });

    it('should filter by category', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'Work Doc', 'https://docs.com', '', 'Work')],
        [2, createTab(2, 'Personal Blog', 'https://blog.com', '', 'Personal')],
        [3, createTab(3, 'Work Task', 'https://tasks.com', '', 'Work')],
      ]);

      const query: SearchQuery = {
        originalQuery: '',
        keywords: [],
        tokens: [],
        filters: {},
        category: 'Work',
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(2);
      expect(results.every((t) => t.category === 'Work')).toBe(true);
    });

    it('should filter by domain', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'GitHub Repo', 'https://github.com/user/repo', 'repo')],
        [2, createTab(2, 'GitHub Issues', 'https://github.com/user/issues', 'issues')],
        [3, createTab(3, 'GitLab Project', 'https://gitlab.com/project', 'project')],
      ]);

      const query: SearchQuery = {
        originalQuery: '',
        keywords: [],
        tokens: [],
        filters: {},
        domain: 'github.com',
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(2);
      expect(results.every((t) => t.url.includes('github.com'))).toBe(true);
    });

    it('should filter by temporal constraint - today', async () => {
      const now = new Date();
      const today = now.getTime();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'Today Tab', 'https://a.com', '', undefined, today)],
        [2, createTab(2, 'Yesterday Tab', 'https://b.com', '', undefined, yesterday.getTime())],
      ]);

      const query: SearchQuery = {
        originalQuery: '',
        keywords: [],
        tokens: [],
        filters: {},
        temporal: {
          type: 'relative',
          relative: 'today',
        },
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(1);
      expect(results[0].tabId).toBe(1);
    });

    it('should filter by temporal constraint - yesterday', async () => {
      const now = new Date();
      const today = now.getTime();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'Today Tab', 'https://a.com', '', undefined, today)],
        [2, createTab(2, 'Yesterday Tab', 'https://b.com', '', undefined, yesterday.getTime())],
      ]);

      const query: SearchQuery = {
        originalQuery: '',
        keywords: [],
        tokens: [],
        filters: {},
        temporal: {
          type: 'relative',
          relative: 'yesterday',
        },
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(1);
      expect(results[0].tabId).toBe(2);
    });

    it('should filter by temporal constraint - this week', async () => {
      const now = new Date();
      const thisWeek = now.getTime();
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 8);

      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'This Week', 'https://a.com', '', undefined, thisWeek)],
        [2, createTab(2, 'Last Week', 'https://b.com', '', undefined, lastWeek.getTime())],
      ]);

      const query: SearchQuery = {
        originalQuery: '',
        keywords: [],
        tokens: [],
        filters: {},
        temporal: {
          type: 'relative',
          relative: 'this-week',
        },
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(1);
      expect(results[0].tabId).toBe(1);
    });

    it('should limit results to top 20', async () => {
      const tabs = new Map<number, IndexedTab>();
      for (let i = 1; i <= 30; i++) {
        tabs.set(i, createTab(i, `Test ${i}`, `https://test${i}.com`, 'test content'));
      }

      const query: SearchQuery = {
        originalQuery: 'test',
        keywords: ['test'],
        tokens: ['test'],
        filters: {},
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(20);
    });

    it('should return empty array when no matches', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'Page 1', 'https://example.com', 'content 1')],
        [2, createTab(2, 'Page 2', 'https://test.com', 'content 2')],
      ]);

      const query: SearchQuery = {
        originalQuery: 'nonexistent',
        keywords: ['nonexistent'],
        tokens: ['nonexistent'],
        filters: {},
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toEqual([]);
    });

    it('should be case-insensitive', async () => {
      const tabs = new Map<number, IndexedTab>([
        [1, createTab(1, 'UPPERCASE TITLE', 'https://EXAMPLE.COM', 'UPPERCASE CONTENT')],
      ]);

      const query: SearchQuery = {
        originalQuery: 'uppercase',
        keywords: ['uppercase'],
        tokens: ['uppercase'],
        filters: {},
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(1);
    });

    it('should combine all filters correctly', async () => {
      const now = new Date();
      const today = now.getTime();

      const tabs = new Map<number, IndexedTab>([
        [
          1,
          createTab(
            1,
            'Work Report',
            'https://github.com/work/report',
            'report content',
            'Work',
            today
          ),
        ],
        [2, createTab(2, 'Personal Note', 'https://notes.com', 'note content', 'Personal', today)],
        [
          3,
          createTab(3, 'Work Code', 'https://gitlab.com/work/code', 'code content', 'Work', today),
        ],
      ]);

      const query: SearchQuery = {
        originalQuery: 'report',
        keywords: ['report'],
        tokens: ['report'],
        filters: {},
        category: 'Work',
        domain: 'github.com',
        temporal: {
          type: 'relative',
          relative: 'today',
        },
      };

      const results = await filterTabsLocally(query, tabs);

      expect(results).toHaveLength(1);
      expect(results[0].tabId).toBe(1);
    });
  });
});

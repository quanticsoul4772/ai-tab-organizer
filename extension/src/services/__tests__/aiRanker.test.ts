import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rankTabsByRelevance } from '../aiRanker';
import type { SearchQuery, IndexedTab } from '../../types/search';

// Mock fetch globally
global.fetch = vi.fn();

describe('aiRanker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rankTabsByRelevance', () => {
    const createIndexedTab = (
      tabId: number,
      title: string,
      url: string,
      content: string = ''
    ): IndexedTab => ({
      tabId,
      title,
      url,
      content,
      contentHash: '',
      lastAccessed: new Date().toISOString(),
      indexed: new Date().toISOString(),
    });

    const createQuery = (rawQuery: string, keywords: string[] = []): SearchQuery => ({
      rawQuery,
      keywords,
    });

    it('should return empty array for empty candidates', async () => {
      const query = createQuery('test', ['test']);
      const results = await rankTabsByRelevance(query, [], 'api-key');
      expect(results).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should successfully rank tabs using Claude API', async () => {
      const candidates = [
        createIndexedTab(1, 'Login Page', 'https://example.com/login', 'login form content here'),
        createIndexedTab(2, 'Home Page', 'https://example.com', 'home content'),
        createIndexedTab(3, 'Settings', 'https://example.com/settings', 'settings page'),
      ];

      const query = createQuery('login', ['login']);

      const mockApiResponse = [
        { index: 0, relevanceScore: 95, matchReason: 'Exact title match', highlights: ['Login'] },
        { index: 1, relevanceScore: 20, matchReason: 'Low relevance', highlights: [] },
        { index: 2, relevanceScore: 10, matchReason: 'No match', highlights: [] },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockApiResponse) }],
        }),
      } as Response);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'test-api-key');

      expect(results).toHaveLength(3);
      expect(results[0].tab.id).toBe(1);
      expect(results[0].relevanceScore).toBe(0.95); // Normalized from 95
      expect(results[0].matchReason).toBe('Exact title match');
      expect(results[0].highlights).toEqual(['Login']);
      expect(results[0].matchedFields).toEqual(['title', 'url', 'content']);

      expect(results[1].relevanceScore).toBe(0.2);
      expect(results[2].relevanceScore).toBe(0.1);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
          }),
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith('AI Ranker raw response:', expect.any(String));
    });

    it('should strip markdown code blocks from API response', async () => {
      const candidates = [createIndexedTab(1, 'Test', 'https://test.com', 'test content')];

      const query = createQuery('test', ['test']);

      const mockApiResponse = [
        { index: 0, relevanceScore: 80, matchReason: 'Good match', highlights: ['test'] },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: '```json\n' + JSON.stringify(mockApiResponse) + '\n```' }],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results).toHaveLength(1);
      expect(results[0].relevanceScore).toBe(0.8);
    });

    it('should extract JSON array from response with additional text', async () => {
      const candidates = [createIndexedTab(1, 'Test', 'https://test.com', 'content')];

      const query = createQuery('test', ['test']);

      const mockApiResponse = [
        { index: 0, relevanceScore: 75, matchReason: 'Match', highlights: [] },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: `Here are the ranked results:\n${JSON.stringify(mockApiResponse)}\nThese are sorted by relevance.`,
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results).toHaveLength(1);
      expect(results[0].relevanceScore).toBe(0.75);
    });

    it('should clean trailing commas from JSON', async () => {
      const candidates = [createIndexedTab(1, 'Test', 'https://test.com', 'content')];

      const query = createQuery('test', ['test']);

      const malformedJson =
        '[{"index":0,"relevanceScore":70,"matchReason":"Match","highlights":[],}]';

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: malformedJson }],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results).toHaveLength(1);
      expect(results[0].relevanceScore).toBe(0.7);
    });

    it('should remove control characters from JSON', async () => {
      const candidates = [createIndexedTab(1, 'Test', 'https://test.com', 'content')];

      const query = createQuery('test', ['test']);

      const jsonWithControlChars =
        '[{"index":0,\x00"relevanceScore":65,\x1F"matchReason":"Match","highlights":[]}]';

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: jsonWithControlChars }],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results).toHaveLength(1);
      expect(results[0].relevanceScore).toBe(0.65);
    });

    it('should fallback to default scores on API error', async () => {
      const candidates = [
        createIndexedTab(1, 'Login', 'https://example.com/login', 'login content'),
        createIndexedTab(2, 'Home', 'https://example.com', 'home content'),
      ];

      const query = createQuery('login', ['login']);

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results).toHaveLength(2);
      expect(results[0].relevanceScore).toBe(0.5);
      expect(results[1].relevanceScore).toBe(0.5);
      expect(results[0].highlights).toEqual([]);
      expect(results[0].matchedFields).toEqual(['title', 'url', 'content']);
      expect(results[1].matchedFields).toEqual([]);

      expect(consoleSpy).toHaveBeenCalledWith('AI ranking failed:', expect.any(Error));
    });

    it('should fallback on network error', async () => {
      const candidates = [createIndexedTab(1, 'Test', 'https://test.com', 'content')];

      const query = createQuery('test', ['test']);

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results).toHaveLength(1);
      expect(results[0].relevanceScore).toBe(0.5);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should fallback on invalid JSON from API', async () => {
      const candidates = [createIndexedTab(1, 'Test', 'https://test.com', 'content')];

      const query = createQuery('test', ['test']);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: 'not valid json at all' }],
        }),
      } as Response);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results).toHaveLength(1);
      expect(results[0].relevanceScore).toBe(0.5);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should sort results by relevanceScore descending', async () => {
      const candidates = [
        createIndexedTab(1, 'Low', 'https://low.com', 'content'),
        createIndexedTab(2, 'High', 'https://high.com', 'content'),
        createIndexedTab(3, 'Medium', 'https://med.com', 'content'),
      ];

      const query = createQuery('test', ['test']);

      const mockApiResponse = [
        { index: 0, relevanceScore: 30, matchReason: 'Low', highlights: [] },
        { index: 1, relevanceScore: 90, matchReason: 'High', highlights: [] },
        { index: 2, relevanceScore: 60, matchReason: 'Medium', highlights: [] },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockApiResponse) }],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results).toHaveLength(3);
      expect(results[0].tab.id).toBe(2); // Highest score (90)
      expect(results[1].tab.id).toBe(3); // Medium score (60)
      expect(results[2].tab.id).toBe(1); // Lowest score (30)
    });

    it('should handle missing highlights in API response', async () => {
      const candidates = [createIndexedTab(1, 'Test', 'https://test.com', 'content')];

      const query = createQuery('test', ['test']);

      const mockApiResponse = [
        { index: 0, relevanceScore: 80, matchReason: 'Match' }, // No highlights field
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockApiResponse) }],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results[0].highlights).toEqual([]);
    });

    it('should skip null results from invalid indices', async () => {
      const candidates = [
        createIndexedTab(1, 'Test 1', 'https://test1.com', 'content'),
        createIndexedTab(2, 'Test 2', 'https://test2.com', 'content'),
      ];

      const query = createQuery('test', ['test']);

      const mockApiResponse = [
        { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
        { index: 99, relevanceScore: 90, matchReason: 'Invalid index', highlights: [] }, // Invalid index
        { index: 1, relevanceScore: 70, matchReason: 'Match', highlights: [] },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockApiResponse) }],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results).toHaveLength(2); // Invalid index should be filtered out
      expect(results[0].tab.id).toBe(1);
      expect(results[1].tab.id).toBe(2);
    });

    it('should send correct API request format', async () => {
      const candidates = [
        createIndexedTab(1, 'Test Tab', 'https://test.com', 'This is test content with more text'),
      ];

      const query = createQuery('test query', ['test', 'query']);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      await rankTabsByRelevance(query, candidates, 'my-api-key');

      expect(fetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'my-api-key',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: expect.stringContaining('claude-3-5-sonnet-20241022'),
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.model).toBe('claude-3-5-sonnet-20241022');
      expect(requestBody.max_tokens).toBe(1000);
      expect(requestBody.messages[0].role).toBe('user');
      expect(requestBody.messages[0].content).toContain('test query');
      expect(requestBody.messages[0].content).toContain('Test Tab');
    });

    it('should truncate content preview to 300 chars', async () => {
      const longContent = 'a'.repeat(500);
      const candidates = [createIndexedTab(1, 'Test', 'https://test.com', longContent)];

      const query = createQuery('test', ['test']);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      await rankTabsByRelevance(query, candidates, 'api-key');

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const promptContent = requestBody.messages[0].content;

      // Check that only 300 chars were included
      const contentMatch = promptContent.match(/Content: ([a]+)/);
      expect(contentMatch).toBeTruthy();
      expect(contentMatch![1].length).toBe(300);
    });

    it('should preserve lastAccessed timestamp in results', async () => {
      const lastAccessed = new Date(Date.now() - 1000).toISOString();
      const tab: IndexedTab = {
        tabId: 1,
        title: 'Test',
        url: 'https://test.com',
        content: 'content',
        contentHash: '',
        lastAccessed,
        indexed: new Date().toISOString(),
      };

      const query = createQuery('test', ['test']);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, [tab], 'api-key');

      expect(results[0].lastAccessed).toBe(lastAccessed);
    });
  });

  describe('determineMatchedFields', () => {
    it('should detect title match', async () => {
      const candidates = [
        {
          tabId: 1,
          title: 'Login Page',
          url: 'https://example.com',
          content: 'some content',
          contentHash: '',
        } as IndexedTab,
      ];

      const query: SearchQuery = {
        // originalQuery: 'login',
        rawQuery: 'login',
        keywords: ['login'],
        // tokens: ['login'],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results[0].matchedFields).toContain('title');
    });

    it('should detect URL match', async () => {
      const candidates = [
        {
          tabId: 1,
          title: 'Page',
          url: 'https://github.com/user/repo',
          content: 'content',
          contentHash: '',
        } as IndexedTab,
      ];

      const query: SearchQuery = {
        // originalQuery: 'github',
        rawQuery: 'github',
        keywords: ['github'],
        // tokens: ['github'],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results[0].matchedFields).toContain('url');
    });

    it('should detect content match', async () => {
      const candidates = [
        {
          tabId: 1,
          title: 'Article',
          url: 'https://blog.com',
          content: 'This article is about react development',
          contentHash: '',
        } as IndexedTab,
      ];

      const query: SearchQuery = {
        // originalQuery: 'react',
        rawQuery: 'react',
        keywords: ['react'],
        // tokens: ['react'],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results[0].matchedFields).toContain('content');
    });

    it('should detect multiple field matches', async () => {
      const candidates = [
        {
          tabId: 1,
          title: 'Test Page',
          url: 'https://test.com',
          content: 'This is a test content',
          contentHash: '',
        } as IndexedTab,
      ];

      const query: SearchQuery = {
        // originalQuery: 'test',
        rawQuery: 'test',
        keywords: ['test'],
        // tokens: ['test'],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results[0].matchedFields).toContain('title');
      expect(results[0].matchedFields).toContain('url');
      expect(results[0].matchedFields).toContain('content');
    });

    it('should be case-insensitive', async () => {
      const candidates = [
        {
          tabId: 1,
          title: 'UPPERCASE TITLE',
          url: 'https://UPPERCASE.COM',
          content: 'UPPERCASE CONTENT',
          contentHash: '',
        } as IndexedTab,
      ];

      const query: SearchQuery = {
        // originalQuery: 'uppercase',
        rawQuery: 'uppercase',
        keywords: ['uppercase'],
        // tokens: ['uppercase'],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results[0].matchedFields.length).toBe(3);
    });

    it('should not duplicate fields when multiple keywords match same field', async () => {
      const candidates = [
        {
          tabId: 1,
          title: 'React Tutorial for Beginners',
          url: 'https://example.com',
          content: 'content',
          contentHash: '',
        } as IndexedTab,
      ];

      const query: SearchQuery = {
        // originalQuery: 'react tutorial',
        rawQuery: 'react tutorial',
        keywords: ['react', 'tutorial'],
        // tokens: ['react', 'tutorial'],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      // Should only have 'title' once even though both keywords matched
      expect(results[0].matchedFields.filter((f) => f === 'title').length).toBe(1);
    });

    it('should return empty array when no keywords match', async () => {
      const candidates = [
        {
          tabId: 1,
          title: 'Page',
          url: 'https://example.com',
          content: 'content',
          contentHash: '',
        } as IndexedTab,
      ];

      const query: SearchQuery = {
        // originalQuery: 'nonexistent',
        rawQuery: 'nonexistent',
        keywords: ['nonexistent'],
        // tokens: ['nonexistent'],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { index: 0, relevanceScore: 80, matchReason: 'Match', highlights: [] },
              ]),
            },
          ],
        }),
      } as Response);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      const results = await rankTabsByRelevance(query, candidates, 'api-key');

      expect(results[0].matchedFields).toEqual([]);
    });
  });
});

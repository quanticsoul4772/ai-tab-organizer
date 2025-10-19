import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SemanticAnalyzer } from '../semanticAnalyzer';
import type { TabContent } from '../../../types/duplicates';

// Mock fetch globally
global.fetch = vi.fn();

describe('SemanticAnalyzer', () => {
  let analyzer: SemanticAnalyzer;
  const TEST_API_KEY = 'test-api-key';

  beforeEach(() => {
    analyzer = new SemanticAnalyzer(TEST_API_KEY);
    vi.clearAllMocks();
  });

  describe('analyzeUnclearPairs', () => {
    it('should return empty array for empty pairs', async () => {
      const contents = new Map<number, TabContent>();

      const groups = await analyzer.analyzeUnclearPairs([], contents);

      expect(groups).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should analyze single pair and detect duplicates', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://source1.com/article',
        title: 'Article from Source 1',
      } as chrome.tabs.Tab;

      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://source2.com/article',
        title: 'Same Article from Source 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Article from Source 1',
            url: 'https://source1.com/article',
            textContent: 'This is the article content about topic X',
            contentHash: 'hash1',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Same Article from Source 2',
            url: 'https://source2.com/article',
            textContent: 'This is the same article content about topic X',
            contentHash: 'hash2',
            extracted: new Date(),
          },
        ],
      ]);

      const mockApiResponse = [
        {
          areDuplicates: true,
          similarity: 0.95,
          reasoning: 'Same article from different sources',
          confidence: 0.9,
        },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockApiResponse) }],
        }),
      } as Response);

      const groups = await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toEqual([tab1, tab2]);
      expect(groups[0].similarity).toBe(0.95);
      expect(groups[0].detectionMethod).toBe('semantic');
      expect(groups[0].reason).toBe('Same article from different sources');
      expect(groups[0].recommendation.confidence).toBe(0.9);
    });

    it('should not create group when not duplicates', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/product1',
        title: 'Product 1',
      } as chrome.tabs.Tab;

      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/product2',
        title: 'Product 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Product 1',
            url: 'https://example.com/product1',
            textContent: 'Different product A',
            contentHash: 'hash1',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Product 2',
            url: 'https://example.com/product2',
            textContent: 'Different product B',
            contentHash: 'hash2',
            extracted: new Date(),
          },
        ],
      ]);

      const mockApiResponse = [
        {
          areDuplicates: false,
          similarity: 0.3,
          reasoning: 'Different products in same category',
          confidence: 0.85,
        },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockApiResponse) }],
        }),
      } as Response);

      const groups = await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      expect(groups).toEqual([]);
    });

    it('should process multiple pairs in batches', async () => {
      const pairs: Array<[chrome.tabs.Tab, chrome.tabs.Tab]> = [];
      const contents = new Map<number, TabContent>();

      // Create 15 pairs (will be processed in 2 batches: 10 + 5)
      for (let i = 0; i < 15; i++) {
        const tab1: chrome.tabs.Tab = {
          id: i * 2,
          url: `https://example.com/${i * 2}`,
          title: `Tab ${i * 2}`,
        } as chrome.tabs.Tab;
        const tab2: chrome.tabs.Tab = {
          id: i * 2 + 1,
          url: `https://example.com/${i * 2 + 1}`,
          title: `Tab ${i * 2 + 1}`,
        } as chrome.tabs.Tab;
        pairs.push([tab1, tab2]);

        contents.set(i * 2, {
          tabId: i * 2,
          title: `Tab ${i * 2}`,
          url: `https://example.com/${i * 2}`,
          textContent: 'Content',
          contentHash: 'hash',
          extracted: new Date(),
        });
        contents.set(i * 2 + 1, {
          tabId: i * 2 + 1,
          title: `Tab ${i * 2 + 1}`,
          url: `https://example.com/${i * 2 + 1}`,
          textContent: 'Content',
          contentHash: 'hash',
          extracted: new Date(),
        });
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify(
                Array(10).fill({
                  areDuplicates: false,
                  similarity: 0,
                  reasoning: 'Different',
                  confidence: 1,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any)
              ),
            },
          ],
        }),
      } as Response);

      await analyzer.analyzeUnclearPairs(pairs, contents);

      // Should call fetch twice (2 batches)
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should wait between batches', async () => {
      const pairs: Array<[chrome.tabs.Tab, chrome.tabs.Tab]> = [];
      const contents = new Map<number, TabContent>();

      for (let i = 0; i < 15; i++) {
        const tab1: chrome.tabs.Tab = {
          id: i * 2,
          url: `https://example.com/${i}`,
          title: `Tab ${i}`,
        } as chrome.tabs.Tab;
        const tab2: chrome.tabs.Tab = {
          id: i * 2 + 1,
          url: `https://example.com/${i}`,
          title: `Tab ${i}`,
        } as chrome.tabs.Tab;
        pairs.push([tab1, tab2]);

        contents.set(i * 2, {
          tabId: i * 2,
          title: `Tab ${i}`,
          url: `https://example.com/${i}`,
          textContent: 'Content',
          contentHash: 'hash',
          extracted: new Date(),
        });
        contents.set(i * 2 + 1, {
          tabId: i * 2 + 1,
          title: `Tab ${i}`,
          url: `https://example.com/${i}`,
          textContent: 'Content',
          contentHash: 'hash',
          extracted: new Date(),
        });
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify(
                Array(10).fill({
                  areDuplicates: false,
                  similarity: 0,
                  reasoning: 'Different',
                  confidence: 1,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any)
              ),
            },
          ],
        }),
      } as Response);

      const start = Date.now();
      await analyzer.analyzeUnclearPairs(pairs, contents);
      const elapsed = Date.now() - start;

      // Should wait at least 1000ms between batches
      expect(elapsed).toBeGreaterThanOrEqual(1000);
    });

    it('should handle API errors gracefully', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/1',
        title: 'Tab 1',
      } as chrome.tabs.Tab;
      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/2',
        title: 'Tab 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Tab 2',
            url: 'https://example.com/2',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
      ]);

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      } as Response);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const groups = await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      expect(groups).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/1',
        title: 'Tab 1',
      } as chrome.tabs.Tab;
      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/2',
        title: 'Tab 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Tab 2',
            url: 'https://example.com/2',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
      ]);

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const groups = await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      expect(groups).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should strip markdown code blocks from response', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/1',
        title: 'Tab 1',
      } as chrome.tabs.Tab;
      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/2',
        title: 'Tab 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Tab 2',
            url: 'https://example.com/2',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
      ]);

      const mockResponse = [
        { areDuplicates: true, similarity: 0.9, reasoning: 'Same', confidence: 0.8 },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: '```json\n' + JSON.stringify(mockResponse) + '\n```' }],
        }),
      } as Response);

      const groups = await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      expect(groups).toHaveLength(1);
    });

    it('should extract JSON array from response text', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/1',
        title: 'Tab 1',
      } as chrome.tabs.Tab;
      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/2',
        title: 'Tab 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Tab 2',
            url: 'https://example.com/2',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
      ]);

      const mockResponse = [
        { areDuplicates: true, similarity: 0.9, reasoning: 'Same', confidence: 0.8 },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            { text: `Here is the analysis:\n${JSON.stringify(mockResponse)}\nThat's the result.` },
          ],
        }),
      } as Response);

      const groups = await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      expect(groups).toHaveLength(1);
    });

    it('should truncate content to 500 characters', async () => {
      const longContent = 'a'.repeat(1000);

      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/1',
        title: 'Tab 1',
      } as chrome.tabs.Tab;
      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/2',
        title: 'Tab 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            textContent: longContent,
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Tab 2',
            url: 'https://example.com/2',
            textContent: longContent,
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
      ]);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { areDuplicates: false, similarity: 0, reasoning: 'Different', confidence: 1 },
              ]),
            },
          ],
        }),
      } as Response);

      await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const prompt = requestBody.messages[0].content;

      // Content should be truncated to 500 chars
      expect(prompt).not.toContain('a'.repeat(1000));
    });

    it('should use correct API endpoint and headers', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/1',
        title: 'Tab 1',
      } as chrome.tabs.Tab;
      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/2',
        title: 'Tab 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Tab 2',
            url: 'https://example.com/2',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
      ]);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { areDuplicates: false, similarity: 0, reasoning: 'Different', confidence: 1 },
              ]),
            },
          ],
        }),
      } as Response);

      await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': TEST_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
        })
      );
    });

    it('should use correct model and max_tokens', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/1',
        title: 'Tab 1',
      } as chrome.tabs.Tab;
      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/2',
        title: 'Tab 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Tab 2',
            url: 'https://example.com/2',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
      ]);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { areDuplicates: false, similarity: 0, reasoning: 'Different', confidence: 1 },
              ]),
            },
          ],
        }),
      } as Response);

      await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);

      expect(requestBody.model).toBe('claude-3-5-sonnet-20241022');
      expect(requestBody.max_tokens).toBe(1000);
    });

    it('should handle missing content gracefully', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/1',
        title: 'Tab 1',
      } as chrome.tabs.Tab;
      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/2',
        title: 'Tab 2',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>();

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { areDuplicates: false, similarity: 0, reasoning: 'Different', confidence: 1 },
              ]),
            },
          ],
        }),
      } as Response);

      const groups = await analyzer.analyzeUnclearPairs([[tab1, tab2]], contents);

      expect(groups).toEqual([]);
    });

    it('should assign unique IDs to groups', async () => {
      const tab1: chrome.tabs.Tab = {
        id: 1,
        url: 'https://example.com/1',
        title: 'Tab 1',
      } as chrome.tabs.Tab;
      const tab2: chrome.tabs.Tab = {
        id: 2,
        url: 'https://example.com/2',
        title: 'Tab 2',
      } as chrome.tabs.Tab;
      const tab3: chrome.tabs.Tab = {
        id: 3,
        url: 'https://example.com/3',
        title: 'Tab 3',
      } as chrome.tabs.Tab;
      const tab4: chrome.tabs.Tab = {
        id: 4,
        url: 'https://example.com/4',
        title: 'Tab 4',
      } as chrome.tabs.Tab;

      const contents = new Map<number, TabContent>([
        [
          1,
          {
            tabId: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          2,
          {
            tabId: 2,
            title: 'Tab 2',
            url: 'https://example.com/2',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          3,
          {
            tabId: 3,
            title: 'Tab 3',
            url: 'https://example.com/3',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
        [
          4,
          {
            tabId: 4,
            title: 'Tab 4',
            url: 'https://example.com/4',
            textContent: 'Content',
            contentHash: 'hash',
            extracted: new Date(),
          },
        ],
      ]);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify([
                { areDuplicates: true, similarity: 0.9, reasoning: 'Same', confidence: 0.8 },
                { areDuplicates: true, similarity: 0.85, reasoning: 'Similar', confidence: 0.75 },
              ]),
            },
          ],
        }),
      } as Response);

      const groups = await analyzer.analyzeUnclearPairs(
        [
          [tab1, tab2],
          [tab3, tab4],
        ],
        contents
      );

      expect(groups).toHaveLength(2);
      expect(groups[0].id).not.toBe(groups[1].id);
      expect(groups[0].id).toContain('semantic-');
      expect(groups[1].id).toContain('semantic-');
    });
  });
});

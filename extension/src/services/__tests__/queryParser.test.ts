import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseSearchQuery, extractTemporal } from '../queryParser';

// Mock fetch globally
global.fetch = vi.fn();

describe('queryParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseSearchQuery', () => {
    it('should parse query using Claude API successfully', async () => {
      const mockResponse = {
        keywords: ['react', 'tutorial'],
        temporal: { type: 'relative', relative: 'today' },
        category: 'Development',
        domain: 'github.com',
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockResponse) }],
        }),
      } as Response);

      const result = await parseSearchQuery('react tutorial today github.com', 'test-api-key');

      expect(result.rawQuery).toBe('react tutorial today github.com');
      expect(result.keywords).toEqual(['react', 'tutorial']);
      expect(result.temporal).toEqual({ type: 'relative', relative: 'today' });
      expect(result.category).toBe('Development');
      expect(result.domain).toBe('github.com');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
          }),
        })
      );
    });

    it('should strip markdown code blocks from API response', async () => {
      const mockResponse = {
        keywords: ['test'],
        temporal: null,
        category: null,
        domain: null,
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: '```json\n' + JSON.stringify(mockResponse) + '\n```' }],
        }),
      } as Response);

      const result = await parseSearchQuery('test query', 'api-key');

      expect(result.keywords).toEqual(['test']);
    });

    it('should handle API returning partial data', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ keywords: ['search'] }) }],
        }),
      } as Response);

      const result = await parseSearchQuery('search query', 'api-key');

      expect(result.keywords).toEqual(['search']);
      expect(result.temporal).toBeUndefined();
      expect(result.category).toBeUndefined();
      expect(result.domain).toBeUndefined();
    });

    it('should fallback to simple parsing on API error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await parseSearchQuery('important search terms today', 'api-key');

      expect(result.rawQuery).toBe('important search terms today');
      expect(result.keywords).toContain('important');
      expect(result.keywords).toContain('search');
      expect(result.keywords).toContain('terms');
      expect(result.temporal).toEqual({ type: 'relative', relative: 'today' });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should fallback on network error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await parseSearchQuery('test query', 'api-key');

      expect(result.keywords).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should fallback on invalid JSON from API', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: 'not valid json' }],
        }),
      } as Response);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await parseSearchQuery('query', 'api-key');

      expect(result.keywords).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should send correct API request format', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ keywords: ['test'] }) }],
        }),
      } as Response);

      await parseSearchQuery('test', 'my-api-key');

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
    });
  });

  describe('extractTemporal', () => {
    it('should extract "today" constraint', () => {
      expect(extractTemporal('show me tabs from today')).toEqual({
        type: 'relative',
        relative: 'today',
      });
    });

    it('should extract "yesterday" constraint', () => {
      expect(extractTemporal('tabs I opened yesterday')).toEqual({
        type: 'relative',
        relative: 'yesterday',
      });
    });

    it('should extract "this week" constraint', () => {
      expect(extractTemporal('find tabs from this week')).toEqual({
        type: 'relative',
        relative: 'this-week',
      });
    });

    it('should extract "this month" constraint', () => {
      expect(extractTemporal('search this month')).toEqual({
        type: 'relative',
        relative: 'this-month',
      });
    });

    it('should extract date in MM/DD/YYYY format', () => {
      const result = extractTemporal('tabs from 12/25/2024');

      expect(result).toBeDefined();
      expect(result?.type).toBe('absolute');
      expect(result?.absolute).toBeInstanceOf(Date);
      expect((result?.absolute as Date).getMonth()).toBe(11); // December (0-indexed)
      expect((result?.absolute as Date).getDate()).toBe(25);
      expect((result?.absolute as Date).getFullYear()).toBe(2024);
    });

    it('should extract date in MM/DD/YY format', () => {
      const result = extractTemporal('from 3/15/24');

      expect(result).toBeDefined();
      expect(result?.type).toBe('absolute');
      const date = result?.absolute as Date;
      expect(date.getMonth()).toBe(2); // March (0-indexed)
      expect(date.getDate()).toBe(15);
      expect(date.getFullYear()).toBe(2024);
    });

    it('should be case-insensitive', () => {
      expect(extractTemporal('SHOW TODAY')).toEqual({
        type: 'relative',
        relative: 'today',
      });

      expect(extractTemporal('YESTERDAY TABS')).toEqual({
        type: 'relative',
        relative: 'yesterday',
      });
    });

    it('should return undefined for queries without temporal constraints', () => {
      expect(extractTemporal('search for login page')).toBeUndefined();
      expect(extractTemporal('github repositories')).toBeUndefined();
      expect(extractTemporal('')).toBeUndefined();
    });

    it('should prioritize explicit temporal words over dates', () => {
      // If both present, should find the first temporal match
      const result = extractTemporal('today 12/25/2024');
      expect(result).toEqual({
        type: 'relative',
        relative: 'today',
      });
    });
  });

  describe('fallback keyword extraction', () => {
    it('should extract keywords without stop words on API failure', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await parseSearchQuery(
        'find the important documents about react and typescript',
        'api-key'
      );

      expect(result.keywords).not.toContain('the');
      expect(result.keywords).not.toContain('and');
      expect(result.keywords).not.toContain('about');
      expect(result.keywords).toContain('important');
      expect(result.keywords).toContain('documents');
      expect(result.keywords).toContain('react');
      expect(result.keywords).toContain('typescript');
    });

    it('should filter out short words', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await parseSearchQuery('a to do list for me', 'api-key');

      expect(result.keywords).not.toContain('a');
      expect(result.keywords).not.toContain('to');
      expect(result.keywords).not.toContain('me');
      expect(result.keywords).toContain('list');
    });

    it('should limit to 5 keywords', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await parseSearchQuery(
        'first second third fourth fifth sixth seventh eighth',
        'api-key'
      );

      expect(result.keywords.length).toBeLessThanOrEqual(5);
    });

    it('should convert to lowercase', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await parseSearchQuery('IMPORTANT SEARCH TERMS', 'api-key');

      expect(result.keywords.every((k) => k === k.toLowerCase())).toBe(true);
    });

    it('should remove punctuation', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await parseSearchQuery('hello, world! test?', 'api-key');

      expect(result.keywords).toContain('hello');
      expect(result.keywords).toContain('world');
      expect(result.keywords).toContain('test');
    });

    it('should combine fallback with temporal extraction', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await parseSearchQuery('important documents from yesterday', 'api-key');

      expect(result.keywords).toContain('important');
      expect(result.keywords).toContain('documents');
      expect(result.temporal).toEqual({
        type: 'relative',
        relative: 'yesterday',
      });
    });
  });
});

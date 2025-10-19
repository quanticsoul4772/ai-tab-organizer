import { describe, it, expect, beforeEach } from 'vitest';
import { URLMatcher } from '../urlMatcher';

describe('URLMatcher', () => {
  let matcher: URLMatcher;

  beforeEach(() => {
    matcher = new URLMatcher();
  });

  describe('normalizeUrl', () => {
    it('should remove protocol', () => {
      const http = matcher.normalizeUrl('http://example.com');
      const https = matcher.normalizeUrl('https://example.com');

      expect(http).toBe('example.com');
      expect(https).toBe('example.com');
    });

    it('should remove www prefix', () => {
      const withWww = matcher.normalizeUrl('https://www.example.com');
      const withoutWww = matcher.normalizeUrl('https://example.com');

      expect(withWww).toBe(withoutWww);
      expect(withWww).toBe('example.com');
    });

    it('should remove trailing slash', () => {
      const withSlash = matcher.normalizeUrl('https://example.com/');
      const withoutSlash = matcher.normalizeUrl('https://example.com');

      expect(withSlash).toBe(withoutSlash);
      expect(withSlash).toBe('example.com');
    });

    it('should convert to lowercase', () => {
      const upper = matcher.normalizeUrl('https://EXAMPLE.COM/PATH');
      const lower = matcher.normalizeUrl('https://example.com/path');

      expect(upper).toBe(lower);
      expect(upper).toBe('example.com/path');
    });

    it('should remove UTM tracking parameters', () => {
      const withUTM = matcher.normalizeUrl(
        'https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=test&id=123'
      );

      expect(withUTM).toBe('example.com/page?id=123');
    });

    it('should remove fbclid parameter', () => {
      const withFbclid = matcher.normalizeUrl('https://example.com/page?fbclid=abc123&id=456');

      expect(withFbclid).toBe('example.com/page?id=456');
    });

    it('should remove gclid parameter', () => {
      const withGclid = matcher.normalizeUrl('https://example.com/page?gclid=xyz789&id=456');

      expect(withGclid).toBe('example.com/page?id=456');
    });

    it('should remove multiple tracking parameters', () => {
      const url = matcher.normalizeUrl(
        'https://www.example.com/page?utm_source=fb&utm_campaign=test&fbclid=abc&gclid=xyz&ref=twitter&actual=param'
      );

      expect(url).toBe('example.com/page?actual=param');
    });

    it('should preserve non-tracking query parameters', () => {
      const url = matcher.normalizeUrl('https://example.com/search?q=test&page=2&sort=date');

      expect(url).toContain('q=test');
      expect(url).toContain('page=2');
      expect(url).toContain('sort=date');
    });

    it('should handle URLs without query parameters', () => {
      const url = matcher.normalizeUrl('https://example.com/path/to/page');
      expect(url).toBe('example.com/path/to/page');
    });

    it('should handle invalid URLs gracefully', () => {
      const invalid = 'not-a-valid-url';
      const result = matcher.normalizeUrl(invalid);

      expect(result).toBe('not-a-valid-url');
    });

    it('should handle URLs with fragments', () => {
      const url = matcher.normalizeUrl('https://example.com/page#section');
      expect(url).toBe('example.com/page#section');
    });

    it('should handle URLs with ports', () => {
      const url = matcher.normalizeUrl('https://example.com:8080/page');
      expect(url).toBe('example.com:8080/page');
    });

    it('should normalize identical URLs differently written', () => {
      const url1 = matcher.normalizeUrl('HTTP://WWW.EXAMPLE.COM/PAGE/?utm_source=test');
      const url2 = matcher.normalizeUrl('https://example.com/page');

      expect(url1).toBe(url2);
    });
  });

  describe('detectAMPCanonical', () => {
    it('should detect /amp/ in path', () => {
      const amp = 'https://example.com/amp/article';
      const canonical = 'https://example.com/article';

      expect(matcher.detectAMPCanonical(amp, canonical)).toBe(true);
      expect(matcher.detectAMPCanonical(canonical, amp)).toBe(true);
    });

    it('should detect .amp in URL', () => {
      const amp = 'https://example.com/article.amp';
      const canonical = 'https://example.com/article';

      expect(matcher.detectAMPCanonical(amp, canonical)).toBe(true);
    });

    it('should detect /amp. in URL', () => {
      const amp = 'https://example.com/amp.article';
      const canonical = 'https://example.com/article';

      expect(matcher.detectAMPCanonical(amp, canonical)).toBe(true);
    });

    it('should return false for both AMP', () => {
      const amp1 = 'https://example.com/amp/article';
      const amp2 = 'https://example.com/amp/other';

      expect(matcher.detectAMPCanonical(amp1, amp2)).toBe(false);
    });

    it('should return false for both canonical', () => {
      const url1 = 'https://example.com/article';
      const url2 = 'https://example.com/other';

      expect(matcher.detectAMPCanonical(url1, url2)).toBe(false);
    });

    it('should return false for unrelated AMP and canonical', () => {
      const amp = 'https://example.com/amp/article1';
      const canonical = 'https://example.com/article2';

      expect(matcher.detectAMPCanonical(amp, canonical)).toBe(false);
    });

    it('should handle tracking parameters in AMP detection', () => {
      const amp = 'https://example.com/amp/article?utm_source=test';
      const canonical = 'https://example.com/article?utm_campaign=other';

      expect(matcher.detectAMPCanonical(amp, canonical)).toBe(true);
    });

    it('should handle www prefix in AMP detection', () => {
      const amp = 'https://www.example.com/amp/article';
      const canonical = 'https://example.com/article';

      expect(matcher.detectAMPCanonical(amp, canonical)).toBe(true);
    });
  });

  describe('findURLDuplicates', () => {
    it('should find exact URL duplicates', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'Page 2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://different.com', title: 'Different' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toHaveLength(2);
      expect(groups[0].similarity).toBe(1.0);
      expect(groups[0].detectionMethod).toBe('url');
    });

    it('should find duplicates with different tracking params', () => {
      const tabs: chrome.tabs.Tab[] = [
        {
          id: 1,
          url: 'https://example.com/page?utm_source=fb',
          title: 'Page 1',
        } as chrome.tabs.Tab,
        {
          id: 2,
          url: 'https://example.com/page?utm_source=twitter',
          title: 'Page 2',
        } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toHaveLength(2);
    });

    it('should find duplicates with www vs non-www', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://www.example.com/page', title: 'With WWW' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'Without WWW' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toHaveLength(2);
    });

    it('should find duplicates with http vs https', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'http://example.com/page', title: 'HTTP' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'HTTPS' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toHaveLength(2);
    });

    it('should find duplicates with trailing slash differences', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page/', title: 'With slash' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'Without slash' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toHaveLength(2);
    });

    it('should detect AMP/canonical pairs', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/amp/article', title: 'AMP' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/article', title: 'Canonical' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toHaveLength(2);
      expect(groups[0].similarity).toBe(0.98);
      expect(groups[0].reason).toContain('AMP');
    });

    it('should handle tabs without URLs', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: undefined, title: 'No URL' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com', title: 'Has URL' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(0);
    });

    it('should return empty array for no duplicates', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example1.com', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example2.com', title: 'Page 2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://example3.com', title: 'Page 3' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(0);
    });

    it('should handle multiple duplicate groups', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'P1-1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page1', title: 'P1-2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://example.com/page2', title: 'P2-1' } as chrome.tabs.Tab,
        { id: 4, url: 'https://example.com/page2', title: 'P2-2' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(2);
      expect(groups[0].tabs).toHaveLength(2);
      expect(groups[1].tabs).toHaveLength(2);
    });

    it('should handle triple duplicates', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page', title: 'Page 1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'Page 2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://example.com/page', title: 'Page 3' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toHaveLength(3);
    });

    it('should provide recommendation for duplicates', () => {
      const tabs: chrome.tabs.Tab[] = [
        {
          id: 1,
          url: 'https://example.com/page',
          title: 'Page 1',
          active: false,
        } as chrome.tabs.Tab,
        {
          id: 2,
          url: 'https://example.com/page',
          title: 'Page 2',
          active: true,
        } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups[0].recommendation).toBeDefined();
      expect(groups[0].recommendation.keepTabId).toBeDefined();
      expect(groups[0].recommendation.closeTabIds).toHaveLength(1);
      expect(groups[0].recommendation.confidence).toBe(0.95);
    });

    it('should recommend keeping active tab', () => {
      const tabs: chrome.tabs.Tab[] = [
        {
          id: 1,
          url: 'https://example.com/page',
          title: 'Page 1',
          active: false,
        } as chrome.tabs.Tab,
        {
          id: 2,
          url: 'https://example.com/page',
          title: 'Page 2',
          active: true,
        } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups[0].recommendation.keepTabId).toBe(2);
      expect(groups[0].recommendation.closeTabIds).toContain(1);
    });

    it('should recommend keeping HTTPS over HTTP', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'http://example.com/page', title: 'HTTP', active: false } as chrome.tabs.Tab,
        {
          id: 2,
          url: 'https://example.com/page',
          title: 'HTTPS',
          active: false,
        } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups[0].recommendation.keepTabId).toBe(2);
    });

    it('should recommend keeping canonical over AMP', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/amp/article', title: 'AMP' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/article', title: 'Canonical' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups[0].recommendation.keepTabId).toBe(2);
    });

    it('should recommend keeping non-mobile over mobile URL path', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/mobile/page', title: 'Mobile' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/mobile/page', title: 'Desktop' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      // Even though both have /mobile/ in path, tab 2 would be kept (same URL, quality score decides)
      expect(groups).toHaveLength(1);
      expect(groups[0].recommendation.keepTabId).toBeDefined();
    });

    it('should handle empty tab array', () => {
      const groups = matcher.findURLDuplicates([]);
      expect(groups).toEqual([]);
    });

    it('should assign unique IDs to groups', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page1', title: 'P1-1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page1', title: 'P1-2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://example.com/page2', title: 'P2-1' } as chrome.tabs.Tab,
        { id: 4, url: 'https://example.com/page2', title: 'P2-2' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      expect(groups[0].id).not.toBe(groups[1].id);
      expect(groups[0].id).toContain('url-');
      expect(groups[1].id).toContain('url-');
    });

    it('should only process each tab once', () => {
      const tabs: chrome.tabs.Tab[] = [
        { id: 1, url: 'https://example.com/page', title: 'P1' } as chrome.tabs.Tab,
        { id: 2, url: 'https://example.com/page', title: 'P2' } as chrome.tabs.Tab,
        { id: 3, url: 'https://example.com/page', title: 'P3' } as chrome.tabs.Tab,
      ];

      const groups = matcher.findURLDuplicates(tabs);

      // Should have one group with all 3 tabs, not multiple overlapping groups
      expect(groups).toHaveLength(1);
      expect(groups[0].tabs).toHaveLength(3);
    });
  });
});

import type { DuplicateGroup } from '../../types/duplicates';

export class URLMatcher {
  /**
   * Normalize URL for comparison
   */
  normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Remove common tracking params
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'fbclid',
        'gclid',
        'ref',
        'source',
        '_ga',
        'mc_cid',
        'mc_eid',
      ];
      trackingParams.forEach((param) => parsed.searchParams.delete(param));

      // Normalize protocol and www
      const normalized = parsed
        .toString()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, ''); // Remove trailing slash

      return normalized.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Check if one URL is AMP version of the other
   */
  detectAMPCanonical(url1: string, url2: string): boolean {
    const amp1 = url1.includes('/amp/') || url1.includes('.amp') || url1.includes('/amp.');
    const amp2 = url2.includes('/amp/') || url2.includes('.amp') || url2.includes('/amp.');

    if (amp1 !== amp2) {
      const canonical1 = url1
        .replace(/\/amp\//, '/')
        .replace(/\.amp/, '')
        .replace(/\/amp\./, '/');
      const canonical2 = url2
        .replace(/\/amp\//, '/')
        .replace(/\.amp/, '')
        .replace(/\/amp\./, '/');
      return this.normalizeUrl(canonical1) === this.normalizeUrl(canonical2);
    }

    return false;
  }

  /**
   * Find URL-based duplicates
   */
  findURLDuplicates(tabs: chrome.tabs.Tab[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const urlMap = new Map<string, chrome.tabs.Tab[]>();
    const processed = new Set<number>();

    // Group by normalized URL
    tabs.forEach((tab) => {
      if (!tab.url) return;
      const normalized = this.normalizeUrl(tab.url);
      if (!urlMap.has(normalized)) {
        urlMap.set(normalized, []);
      }
      urlMap.get(normalized)!.push(tab);
    });

    // Create duplicate groups for exact matches
    urlMap.forEach((tabGroup) => {
      if (tabGroup.length > 1) {
        const group: DuplicateGroup = {
          id: `url-${Date.now()}-${Math.random()}`,
          tabs: tabGroup,
          similarity: 1.0,
          detectionMethod: 'url',
          reason: 'Identical URL (ignoring tracking parameters)',
          recommendation: this.recommendBestTab(tabGroup),
        };
        groups.push(group);
        tabGroup.forEach((t) => t.id && processed.add(t.id));
      }
    });

    // Check for AMP/canonical pairs among remaining tabs
    const remaining = tabs.filter((t) => t.id && !processed.has(t.id));

    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        const tab1 = remaining[i];
        const tab2 = remaining[j];

        if (!tab1.url || !tab2.url) continue;

        if (this.detectAMPCanonical(tab1.url, tab2.url)) {
          groups.push({
            id: `amp-${Date.now()}-${Math.random()}`,
            tabs: [tab1, tab2],
            similarity: 0.98,
            detectionMethod: 'url',
            reason: 'AMP and canonical version of same page',
            recommendation: this.recommendBestTab([tab1, tab2]),
          });

          if (tab1.id) processed.add(tab1.id);
          if (tab2.id) processed.add(tab2.id);
        }
      }
    }

    return groups;
  }

  /**
   * Recommend which tab to keep
   */
  private recommendBestTab(tabs: chrome.tabs.Tab[]): {
    keepTabId: number;
    closeTabIds: number[];
    confidence: number;
  } {
    const scored = tabs.map((tab) => ({
      tab,
      score: this.calculateTabQualityScore(tab),
    }));

    scored.sort((a, b) => b.score - a.score);

    const best = scored[0].tab;
    const rest = scored.slice(1).map((s) => s.tab.id!);

    return {
      keepTabId: best.id!,
      closeTabIds: rest,
      confidence: 0.95,
    };
  }

  /**
   * Calculate quality score for a tab
   */
  private calculateTabQualityScore(tab: chrome.tabs.Tab): number {
    let score = 0;

    if (!tab.url) return score;

    // Prefer canonical over AMP
    if (!tab.url.includes('/amp/') && !tab.url.includes('.amp')) {
      score += 10;
    }

    // Prefer non-mobile
    if (!tab.url.includes('m.') && !tab.url.includes('/mobile/')) {
      score += 5;
    }

    // Prefer HTTPS
    if (tab.url.startsWith('https://')) {
      score += 3;
    }

    // Prefer active tab
    if (tab.active) {
      score += 15;
    }

    // Prefer recently accessed (if we have that data)
    // This would require tracking lastAccessed, not available by default
    // Could be added in future version

    return score;
  }
}

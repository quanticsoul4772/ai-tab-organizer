import type { DuplicateGroup, TabContent } from '../../types/duplicates';
import { SimHash } from './simHash';

export class ContentMatcher {
  private simHash = new SimHash();
  private contentCache = new Map<number, TabContent>();

  /**
   * Check if URL can be accessed for content extraction
   */
  private isAccessibleUrl(url: string): boolean {
    if (!url) return false;

    const protectedProtocols = [
      'chrome://',
      'chrome-extension://',
      'edge://',
      'about:',
      'file://',
      'view-source:',
      'data:',
      'javascript:'
    ];

    return !protectedProtocols.some(protocol => url.startsWith(protocol));
  }

  /**
   * Extract tab content for fingerprinting
   */
  async extractTabContent(tab: chrome.tabs.Tab): Promise<TabContent> {
    if (!tab.id || !tab.url) {
      throw new Error('Invalid tab');
    }

    // Skip protected URLs immediately
    if (!this.isAccessibleUrl(tab.url)) {
      console.log(`Skipping protected URL: ${tab.url}`);
      const fallback = `${tab.title} ${tab.url}`;
      const contentHash = this.simHash.generate(fallback);

      const tabContent: TabContent = {
        tabId: tab.id,
        title: tab.title || '',
        url: tab.url,
        textContent: fallback,
        contentHash,
        extracted: new Date(),
      };

      this.contentCache.set(tab.id, tabContent);
      return tabContent;
    }

    // Check cache first
    if (this.contentCache.has(tab.id)) {
      return this.contentCache.get(tab.id)!;
    }

    try {
      // Request content extraction from background script
      const response = await chrome.runtime.sendMessage({
        action: 'extractContent',
        tabId: tab.id,
        url: tab.url,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const { content, metaDescription } = response.data;

      // Combine title, description, and content for fingerprinting
      const combined = [tab.title || '', metaDescription || '', content || ''].join(' ');

      const contentHash = this.simHash.generate(combined);

      const tabContent: TabContent = {
        tabId: tab.id,
        title: tab.title || '',
        url: tab.url,
        metaDescription,
        textContent: content || '',
        contentHash,
        extracted: new Date(),
      };

      this.contentCache.set(tab.id, tabContent);
      return tabContent;
    } catch (error) {
      console.warn(`Failed to extract content from tab ${tab.id}:`, error);

      // Fallback: use only title and URL
      const fallback = `${tab.title} ${tab.url}`;
      const contentHash = this.simHash.generate(fallback);

      const tabContent: TabContent = {
        tabId: tab.id,
        title: tab.title || '',
        url: tab.url,
        textContent: fallback,
        contentHash,
        extracted: new Date(),
      };

      this.contentCache.set(tab.id, tabContent);
      return tabContent;
    }
  }

  /**
   * Find content-based duplicates using SimHash
   */
  async findContentDuplicates(
    tabs: chrome.tabs.Tab[],
    threshold: number = 0.9
  ): Promise<DuplicateGroup[]> {
    const groups: DuplicateGroup[] = [];

    // Extract content from all tabs
    const contents: TabContent[] = [];
    for (const tab of tabs) {
      try {
        const content = await this.extractTabContent(tab);
        contents.push(content);
      } catch (error) {
        console.warn(`Skipping tab ${tab.id} due to extraction error`);
      }

      // Small delay to avoid overwhelming the browser
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Compare all pairs
    const compared = new Set<string>();

    for (let i = 0; i < contents.length; i++) {
      for (let j = i + 1; j < contents.length; j++) {
        const c1 = contents[i];
        const c2 = contents[j];

        const pairKey = [c1.tabId, c2.tabId].sort((a, b) => a - b).join('-');
        if (compared.has(pairKey)) continue;
        compared.add(pairKey);

        const similarity = this.simHash.similarity(c1.contentHash, c2.contentHash);

        if (similarity >= threshold) {
          const tab1 = tabs.find((t) => t.id === c1.tabId)!;
          const tab2 = tabs.find((t) => t.id === c2.tabId)!;

          groups.push({
            id: `content-${Date.now()}-${Math.random()}`,
            tabs: [tab1, tab2],
            similarity,
            detectionMethod: 'fingerprint',
            reason: `${Math.round(similarity * 100)}% identical content`,
            recommendation: this.recommendBestTab([tab1, tab2]),
          });
        }
      }
    }

    return groups;
  }

  /**
   * Recommend which tab to keep based on quality score
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

    return {
      keepTabId: scored[0].tab.id!,
      closeTabIds: scored.slice(1).map((s) => s.tab.id!),
      confidence: 0.85,
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

    return score;
  }

  /**
   * Clear content cache
   */
  clearCache(): void {
    this.contentCache.clear();
  }
}

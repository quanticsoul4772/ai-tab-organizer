import type { DetectionResult, DuplicateGroup, TabContent } from '../../types/duplicates';
import { URLMatcher } from './urlMatcher';
import { ContentMatcher } from './contentMatcher';
import { SemanticAnalyzer } from './semanticAnalyzer';
import { SimHash } from './simHash';

export interface DetectionOptions {
  enableSemanticAnalysis?: boolean;
  fingerprintThreshold?: number;
  semanticThreshold?: number;
}

export class DuplicateDetectionService {
  private urlMatcher = new URLMatcher();
  private contentMatcher = new ContentMatcher();
  private semanticAnalyzer?: SemanticAnalyzer;

  constructor(claudeApiKey?: string) {
    if (claudeApiKey) {
      this.semanticAnalyzer = new SemanticAnalyzer(claudeApiKey);
    }
  }

  /**
   * Detect duplicates using three-tier approach
   */
  async detectDuplicates(
    tabs: chrome.tabs.Tab[],
    options: DetectionOptions = {}
  ): Promise<DetectionResult> {
    const startTime = Date.now();
    let apiCost = 0;

    console.log(`🔍 Starting duplicate detection for ${tabs.length} tabs...`);

    // TIER 1: URL-based detection
    console.log('Tier 1: URL matching...');
    const tier1Groups = this.urlMatcher.findURLDuplicates(tabs);
    const tier1TabIds = new Set(tier1Groups.flatMap((g) => g.tabs.map((t) => t.id)));

    console.log(`✅ Tier 1 found ${tier1Groups.length} duplicate groups`);

    // Remaining tabs for Tier 2
    const tier2Tabs = tabs.filter((t) => !tier1TabIds.has(t.id));

    // TIER 2: Content fingerprinting
    console.log(`Tier 2: Content fingerprinting ${tier2Tabs.length} tabs...`);
    const tier2Groups = await this.contentMatcher.findContentDuplicates(
      tier2Tabs,
      options.fingerprintThreshold || 0.9
    );
    const tier2TabIds = new Set(tier2Groups.flatMap((g) => g.tabs.map((t) => t.id)));

    console.log(`✅ Tier 2 found ${tier2Groups.length} duplicate groups`);

    // Remaining tabs for Tier 3
    const tier3Tabs = tier2Tabs.filter((t) => !tier2TabIds.has(t.id));

    let tier3Groups: DuplicateGroup[] = [];

    // TIER 3: Semantic analysis (optional)
    if (
      options.enableSemanticAnalysis &&
      this.semanticAnalyzer &&
      tier3Tabs.length > 1
    ) {
      console.log(`Tier 3: AI semantic analysis for ${tier3Tabs.length} unclear tabs...`);

      // Only analyze tabs with moderate similarity (0.70-0.89)
      const uncertainPairs: Array<[chrome.tabs.Tab, chrome.tabs.Tab]> = [];
      const contents = new Map<number, TabContent>();

      // Extract content for remaining tabs
      for (const tab of tier3Tabs) {
        try {
          const content = await this.contentMatcher.extractTabContent(tab);
          contents.set(tab.id!, content);
        } catch (error) {
          console.warn(`Failed to extract content for tab ${tab.id}`);
        }
      }

      // Find pairs with moderate similarity
      const simHash = new SimHash();
      for (let i = 0; i < tier3Tabs.length; i++) {
        for (let j = i + 1; j < tier3Tabs.length; j++) {
          const tab1 = tier3Tabs[i];
          const tab2 = tier3Tabs[j];

          const c1 = contents.get(tab1.id!);
          const c2 = contents.get(tab2.id!);

          if (!c1 || !c2) continue;

          const similarity = simHash.similarity(c1.contentHash, c2.contentHash);

          // Only send to AI if similarity is in the "uncertain" range
          if (similarity >= 0.7 && similarity < 0.9) {
            uncertainPairs.push([tab1, tab2]);
          }
        }
      }

      if (uncertainPairs.length > 0) {
        console.log(`📊 Analyzing ${uncertainPairs.length} uncertain pairs with AI...`);
        tier3Groups = await this.semanticAnalyzer.analyzeUnclearPairs(
          uncertainPairs,
          contents
        );

        // Estimate API cost
        const batches = Math.ceil(uncertainPairs.length / 10);
        apiCost = batches * 0.003; // ~$0.003 per batch
      }

      console.log(`✅ Tier 3 found ${tier3Groups.length} duplicate groups`);
    }

    const processingTime = Date.now() - startTime;

    const result: DetectionResult = {
      totalTabs: tabs.length,
      duplicateGroups: [...tier1Groups, ...tier2Groups, ...tier3Groups],
      processingTime,
      apiCost,
      tier1Found: tier1Groups.length,
      tier2Found: tier2Groups.length,
      tier3Found: tier3Groups.length,
    };

    console.log(
      `✨ Detection complete: ${result.duplicateGroups.length} groups in ${processingTime}ms`
    );
    if (apiCost > 0) {
      console.log(`💰 API cost: $${apiCost.toFixed(4)}`);
    }

    return result;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.contentMatcher.clearCache();
  }
}

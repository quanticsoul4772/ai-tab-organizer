import type { SearchQuery, IndexedTab } from '../types/search';

/**
 * Filter tabs locally using keywords and constraints
 * Returns candidate tabs for AI ranking
 */
export async function filterTabsLocally(
  query: SearchQuery,
  indexedTabs: Map<number, IndexedTab>
): Promise<IndexedTab[]> {
  const candidates: Array<{ tab: IndexedTab; score: number }> = [];

  for (const tab of indexedTabs.values()) {
    let score = 0;

    // Keyword matching
    const keywordScore = scoreKeywordMatch(query.keywords, tab);
    if (keywordScore === 0) continue; // Skip if no keyword match
    score += keywordScore;

    // Temporal filtering
    if (query.temporal) {
      if (!matchesTemporal(query.temporal, tab)) continue;
      score += 10; // Bonus for temporal match
    }

    // Category filtering
    if (query.category) {
      if (tab.category?.toLowerCase() !== query.category.toLowerCase()) continue;
      score += 20; // Bonus for category match
    }

    // Domain filtering
    if (query.domain) {
      if (!tab.url.includes(query.domain)) continue;
      score += 15; // Bonus for domain match
    }

    candidates.push({ tab, score });
  }

  // Sort by local score and return top 20 for AI ranking
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((c) => c.tab);
}

/**
 * Score keyword match (0-100)
 */
function scoreKeywordMatch(keywords: string[], tab: IndexedTab): number {
  if (keywords.length === 0) return 100; // No keywords = match all

  const lowerTitle = tab.title.toLowerCase();
  const lowerUrl = tab.url.toLowerCase();
  const lowerContent = tab.content.toLowerCase();

  let score = 0;
  let matchedCount = 0;

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();

    // Title match (highest weight)
    if (lowerTitle.includes(lowerKeyword)) {
      score += 40;
      matchedCount++;
    }
    // URL match (medium weight)
    else if (lowerUrl.includes(lowerKeyword)) {
      score += 20;
      matchedCount++;
    }
    // Content match (lower weight)
    else if (lowerContent.includes(lowerKeyword)) {
      score += 10;
      matchedCount++;
    }
  }

  // Require at least one keyword match
  if (matchedCount === 0) return 0;

  // Bonus for matching multiple keywords
  if (matchedCount > 1) {
    score += matchedCount * 5;
  }

  return Math.min(score, 100);
}

/**
 * Check if tab matches temporal constraint
 */
function matchesTemporal(temporal: NonNullable<SearchQuery['temporal']>, tab: IndexedTab): boolean {
  const now = new Date();
  const tabDate = new Date(tab.lastAccessed);

  if (temporal.type === 'relative') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tabDay = new Date(tabDate.getFullYear(), tabDate.getMonth(), tabDate.getDate());

    switch (temporal.relative) {
      case 'today':
        return tabDay.getTime() === today.getTime();

      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return tabDay.getTime() === yesterday.getTime();
      }

      case 'this-week': {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return tabDate >= weekStart;
      }

      case 'this-month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return tabDate >= monthStart;
      }

      default:
        return true;
    }
  } else if (temporal.type === 'absolute' && temporal.absolute) {
    const targetDate = new Date(temporal.absolute);
    const targetDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    const tabDay = new Date(tabDate.getFullYear(), tabDate.getMonth(), tabDate.getDate());
    return tabDay.getTime() === targetDay.getTime();
  }

  return true;
}

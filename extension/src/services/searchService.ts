import type { SearchResult } from '../types/search';
import { parseSearchQuery } from './queryParser';
import { getIndexedTabs } from './tabIndexer';
import { filterTabsLocally } from './localSearch';
import { rankTabsByRelevance } from './aiRanker';
import { getCachedSearch, cacheSearchResults } from '../utils/searchCache';
import { JiraSearchEnhancer } from './jira/jiraSearchEnhancer';
import { tabs } from '../core/browserApi';

/**
 * Main search function
 */
export async function searchTabs(queryText: string, apiKey: string): Promise<SearchResult[]> {
  console.log(`Searching tabs for: "${queryText}"`);

  // Check cache first
  const cached = await getCachedSearch(queryText);
  if (cached) {
    console.log('Returning cached results');
    return cached;
  }

  // Try Jira-enhanced search first (for ticket patterns and project filters)
  if (
    JiraSearchEnhancer.isTicketPattern(queryText) ||
    JiraSearchEnhancer.isProjectPattern(queryText)
  ) {
    console.log('Using Jira-enhanced search');
    const allTabs = await tabs.getAll();
    const jiraResults = JiraSearchEnhancer.searchJiraTabs(queryText, allTabs);

    if (jiraResults.length > 0) {
      // Convert to SearchResult format
      const results: SearchResult[] = jiraResults.map(({ tab, score, reason }) => ({
        tab,
        relevanceScore: score,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        matchedFields: ['jira-ticket'] as any,
        highlights: [queryText],
        matchReason: reason,
      }));

      // Cache and return
      await cacheSearchResults(queryText, results);
      return results;
    }
  }

  // Parse query
  const query = await parseSearchQuery(queryText, apiKey);
  console.log('Parsed query:', query);

  // Get indexed tabs
  const indexedTabs = await getIndexedTabs();
  console.log(`Found ${indexedTabs.size} indexed tabs`);

  if (indexedTabs.size === 0) {
    return [];
  }

  // Local filtering
  const candidates = await filterTabsLocally(query, indexedTabs);
  console.log(`Filtered to ${candidates.length} candidates`);

  if (candidates.length === 0) {
    return [];
  }

  // AI ranking
  const results = await rankTabsByRelevance(query, candidates, apiKey);
  console.log(`Ranked ${results.length} results`);

  // Cache results
  await cacheSearchResults(queryText, results);

  // Return top 10
  return results.slice(0, 10);
}

/**
 * Switch to a tab
 */
export async function switchToTab(tabId: number): Promise<void> {
  const tab = await tabs.getById(tabId);
  if (tab) {
    await tabs.switchTo(tabId);
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

/**
 * Close a tab
 */
export async function closeTab(tabId: number): Promise<void> {
  await tabs.close(tabId);
}

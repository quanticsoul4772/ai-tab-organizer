import type { SearchQuery, IndexedTab, SearchResult } from '../types/search';

/**
 * Rank tabs using Claude AI
 */
export async function rankTabsByRelevance(
  query: SearchQuery,
  candidates: IndexedTab[],
  apiKey: string
): Promise<SearchResult[]> {
  if (candidates.length === 0) return [];

  // Prepare tabs for ranking
  const tabSummaries = candidates.map((tab, index) => ({
    index,
    title: tab.title,
    url: tab.url,
    contentPreview: tab.content.substring(0, 300), // First 300 chars
  }));

  const prompt = `Rank these browser tabs by relevance to the search query.

CRITICAL: Your response must be ONLY a single-line JSON array. Do not include any explanations, comments, or text before or after the JSON.

Search Query: "${query.rawQuery}"

Tabs:
${tabSummaries
  .map(
    (t) => `${t.index}. Title: "${t.title}"
   URL: ${t.url}
   Content: ${t.contentPreview}...`
  )
  .join('\n\n')}

Format (single line, all tabs must be included):
[{"index":0,"relevanceScore":95,"matchReason":"Brief reason","highlights":["phrase 1","phrase 2"]},...]

Rules:
- Score based on query relevance (0-100)
- Include ALL tabs even if low relevance
- Keep matchReason under 10 words
- Max 2 highlights per tab

Return only the JSON array as a single line, nothing else:`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content[0].text;
    console.log('AI Ranker raw response:', rawText);

    // Parse response with robust JSON cleaning
    let jsonText = rawText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Extract JSON array if response contains additional text
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Clean up common JSON issues
    jsonText = jsonText
      // Remove control characters
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Remove trailing commas
      .replace(/,\s*]/g, ']')
      .replace(/,\s*}/g, '}')
      .trim();

    console.log('AI Ranker cleaned JSON:', jsonText);
    const rankings = JSON.parse(jsonText);

    // Build search results
    const results: SearchResult[] = rankings
      .map((ranking: any) => {
        const tab = candidates[ranking.index];
        if (!tab) return null;

        // Convert to chrome.tabs.Tab format
        const chromeTab: chrome.tabs.Tab = {
          id: tab.tabId,
          title: tab.title,
          url: tab.url,
          active: false,
          pinned: false,
          highlighted: false,
          windowId: 0,
          selected: false,
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
          incognito: false,
          index: 0,
        };

        return {
          tab: chromeTab,
          relevanceScore: ranking.relevanceScore / 100, // Normalize to 0-1
          matchedFields: determineMatchedFields(query, tab),
          highlights: ranking.highlights || [],
          matchReason: ranking.matchReason,
          lastAccessed: tab.lastAccessed,
        };
      })
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results;
  } catch (error) {
    console.error('AI ranking failed:', error);

    // Fallback: return candidates with default scores
    return candidates.map((tab) => ({
      tab: {
        id: tab.tabId,
        title: tab.title,
        url: tab.url,
        active: false,
        pinned: false,
        highlighted: false,
        windowId: 0,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        incognito: false,
        index: 0,
      },
      relevanceScore: 0.5,
      matchedFields: determineMatchedFields(query, tab),
      highlights: [],
      lastAccessed: tab.lastAccessed,
    }));
  }
}

/**
 * Determine which fields matched the query
 */
function determineMatchedFields(
  query: SearchQuery,
  tab: IndexedTab
): Array<'title' | 'url' | 'content'> {
  const matched: Array<'title' | 'url' | 'content'> = [];

  const lowerTitle = tab.title.toLowerCase();
  const lowerUrl = tab.url.toLowerCase();
  const lowerContent = tab.content.toLowerCase();

  for (const keyword of query.keywords) {
    const lowerKeyword = keyword.toLowerCase();

    if (lowerTitle.includes(lowerKeyword) && !matched.includes('title')) {
      matched.push('title');
    }
    if (lowerUrl.includes(lowerKeyword) && !matched.includes('url')) {
      matched.push('url');
    }
    if (lowerContent.includes(lowerKeyword) && !matched.includes('content')) {
      matched.push('content');
    }
  }

  return matched;
}

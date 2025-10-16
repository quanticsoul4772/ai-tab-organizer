import type { SearchQuery } from '../types/search';

/**
 * Parse natural language search query using Claude API
 */
export async function parseSearchQuery(rawQuery: string, apiKey: string): Promise<SearchQuery> {
  const prompt = `Parse this tab search query into structured format:

Query: "${rawQuery}"

Extract:
1. Keywords (important terms for matching)
2. Temporal constraint (today, yesterday, this week, specific date)
3. Category filter (Work, Research, Shopping, etc.)
4. Domain filter (github.com, reddit.com, etc.)

Respond ONLY with valid JSON:
{
  "keywords": ["array", "of", "keywords"],
  "temporal": {
    "type": "relative",
    "relative": "yesterday"
  },
  "category": "Research",
  "domain": "github.com"
}

Rules:
- Extract 2-5 most important keywords
- Temporal is optional (null if not mentioned)
- Category is optional (null if not mentioned)
- Domain is optional (null if not mentioned)
- DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Strip markdown code blocks if present
    let jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(jsonText);

    return {
      rawQuery,
      keywords: parsed.keywords || [],
      temporal: parsed.temporal || undefined,
      category: parsed.category || undefined,
      domain: parsed.domain || undefined
    };
  } catch (error) {
    console.error('Query parsing failed:', error);

    // Fallback: simple keyword extraction
    return {
      rawQuery,
      keywords: extractSimpleKeywords(rawQuery),
      temporal: extractTemporal(rawQuery),
      category: undefined,
      domain: undefined
    };
  }
}

/**
 * Fallback: Extract keywords without AI
 */
function extractSimpleKeywords(query: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'from', 'about', 'that', 'this', 'was', 'were', 'is'
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}

/**
 * Extract temporal constraint from query
 */
export function extractTemporal(query: string): SearchQuery['temporal'] | undefined {
  const lower = query.toLowerCase();

  if (lower.includes('today')) {
    return { type: 'relative', relative: 'today' };
  }
  if (lower.includes('yesterday')) {
    return { type: 'relative', relative: 'yesterday' };
  }
  if (lower.includes('this week')) {
    return { type: 'relative', relative: 'this-week' };
  }
  if (lower.includes('this month')) {
    return { type: 'relative', relative: 'this-month' };
  }

  // Try to extract specific date (basic)
  const dateMatch = lower.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    return {
      type: 'absolute',
      absolute: new Date(fullYear, parseInt(month) - 1, parseInt(day))
    };
  }

  return undefined;
}

import type {
  DuplicateGroup,
  TabContent,
  SemanticAnalysisRequest,
  SemanticAnalysisResponse,
} from '../../types/duplicates';

export class SemanticAnalyzer {
  private readonly apiKey: string;
  private readonly batchSize = 10;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Batch analyze unclear tab pairs using Claude API
   */
  async analyzeUnclearPairs(
    pairs: Array<[chrome.tabs.Tab, chrome.tabs.Tab]>,
    contents: Map<number, TabContent>
  ): Promise<DuplicateGroup[]> {
    const groups: DuplicateGroup[] = [];

    // Process in batches to minimize API calls
    for (let i = 0; i < pairs.length; i += this.batchSize) {
      const batch = pairs.slice(i, i + this.batchSize);
      const results = await this.analyzeBatch(batch, contents);

      results.forEach((result, index) => {
        if (result.areDuplicates) {
          const [tab1, tab2] = batch[index];
          groups.push({
            id: `semantic-${Date.now()}-${Math.random()}`,
            tabs: [tab1, tab2],
            similarity: result.similarity,
            detectionMethod: 'semantic',
            reason: result.reasoning,
            recommendation: {
              keepTabId: tab1.id!,
              closeTabIds: [tab2.id!],
              confidence: result.confidence,
            },
          });
        }
      });

      // Rate limiting: wait between batches
      if (i + this.batchSize < pairs.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return groups;
  }

  /**
   * Analyze a batch of tab pairs
   */
  private async analyzeBatch(
    pairs: Array<[chrome.tabs.Tab, chrome.tabs.Tab]>,
    contents: Map<number, TabContent>
  ): Promise<SemanticAnalysisResponse[]> {
    const requests: SemanticAnalysisRequest[] = pairs.map(([tab1, tab2]) => {
      const content1 = contents.get(tab1.id!)?.textContent || '';
      const content2 = contents.get(tab2.id!)?.textContent || '';

      return {
        tab1: {
          title: tab1.title || '',
          url: tab1.url || '',
          content: content1.substring(0, 500), // Limit content to reduce tokens
        },
        tab2: {
          title: tab2.title || '',
          url: tab2.url || '',
          content: content2.substring(0, 500),
        },
      };
    });

    const prompt = this.buildBatchPrompt(requests);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
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
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const resultText = data.content[0].text;

      // Clean up the response text
      let jsonText = resultText;

      // Remove markdown code blocks
      jsonText = jsonText.replace(/```json\s*|```\s*/g, '');

      // Find JSON array
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }

      // Clean up common JSON issues
      jsonText = jsonText.trim();

      const results: SemanticAnalysisResponse[] = JSON.parse(jsonText);
      return results;
    } catch (error) {
      console.error('Semantic analysis failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      // Return no duplicates on error
      return pairs.map(() => ({
        areDuplicates: false,
        similarity: 0,
        reasoning: 'Analysis failed',
        confidence: 0,
      }));
    }
  }

  /**
   * Build prompt for batch analysis
   */
  private buildBatchPrompt(requests: SemanticAnalysisRequest[]): string {
    return `You are a duplicate tab detector. Analyze these ${requests.length} tab pairs and determine if they contain substantially the same content or information, even if from different sources or with different URLs.

For each pair, respond with:
- areDuplicates: boolean (true if >85% semantic overlap)
- similarity: number 0-1 (semantic similarity score)
- reasoning: string (brief explanation)
- confidence: number 0-1 (how confident you are)

Consider duplicates if:
- Same article/content from different sources
- Same product from different retailers
- Different pages about same specific topic (not just same general category)
- Tutorial/guide covering same exact steps
- Mirror/syndicated content

NOT duplicates if:
- Different products in same category
- Different articles about same general topic
- Sequential pages (part 1 vs part 2)
- Related but distinct content

CRITICAL: Respond with ONLY a valid JSON array. Use double quotes for all strings. No comments, no trailing commas, no extra text.

Tab pairs to analyze:
${JSON.stringify(requests, null, 2)}

Your response (valid JSON array only):`;
  }
}

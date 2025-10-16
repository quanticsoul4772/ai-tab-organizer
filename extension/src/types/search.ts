// Search-related TypeScript interfaces

export interface SearchQuery {
  /** Raw user input */
  rawQuery: string;

  /** Extracted keywords */
  keywords: string[];

  /** Temporal constraint */
  temporal?: {
    type: 'relative' | 'absolute';
    relative?: 'today' | 'yesterday' | 'this-week' | 'this-month';
    absolute?: Date;
  };

  /** Category filter (e.g., "Work", "Research") */
  category?: string;

  /** URL domain filter (e.g., "github.com") */
  domain?: string;
}

export interface SearchResult {
  /** Chrome tab object */
  tab: chrome.tabs.Tab;

  /** Relevance score (0-1) */
  relevanceScore: number;

  /** Which fields matched */
  matchedFields: Array<'title' | 'url' | 'content'>;

  /** Text highlights for display */
  highlights: string[];

  /** AI explanation of match */
  matchReason?: string;

  /** When tab was last accessed */
  lastAccessed?: Date;
}

export interface IndexedTab {
  tabId: number;
  title: string;
  url: string;
  content: string; // Extracted text content
  contentHash: string; // For change detection
  category?: string;
  lastAccessed: string; // ISO date string (Date objects don't survive chrome.storage serialization)
  indexed: string; // ISO date string
}

export interface SearchCache {
  query: string;
  results: SearchResult[];
  timestamp: Date;
  expiresAt: Date;
}

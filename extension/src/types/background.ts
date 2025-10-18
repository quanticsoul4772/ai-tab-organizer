// Type definitions for background service worker

export interface ApiConfig {
  BASE_URL: string;
  MODEL: string;
  MAX_TOKENS: number;
  VERSION: string;
  TIMEOUT_MS: number;
  MAX_RETRIES: number;
  RETRY_DELAY_MS: number;
}

export interface BackgroundRequest {
  action: 'categorize' | 'summarizeTab' | 'summarizeCategory' | 'extractContent' | 'getTabMetadata';
  tabs?: any[];
  tab?: any;
  apiKey?: string;
  categoryName?: string;
  tabId?: number;
  url?: string;
}

export interface BackgroundResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CategoryResponse {
  [category: string]: number[];
}

export interface TabSummary {
  tabId: number;
  summary: string;
  timestamp: number;
}

export interface CategorySummary {
  category: string;
  summary: string;
  timestamp: number;
}

export interface TabMetadata {
  lastAccessed: number;
  isSuspended: boolean;
  duplicateCount: number;
  jiraStatus?: string;
}

export interface IndexedTab {
  id: number;
  title: string;
  url: string;
  content: string;
  contentHash: string;
  timestamp: number;
}

export interface ExtractedContent {
  headings: string[];
  paragraphs: string[];
  metaDescription: string | null;
}

export interface ClaudeApiResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Use chrome.tabs.Tab as the base type for better compatibility
export type Tab = chrome.tabs.Tab;

export interface CategorizedTabs {
  [category: string]: Tab[];
}

export interface CategoryResponse {
  [category: string]: number[];
}

export interface Settings {
  anthropicApiKey: string;
}

export interface BackgroundMessage {
  action: string;
  tabs: Tab[];
  apiKey: string;
}

export interface BackgroundResponse {
  success: boolean;
  data?: CategoryResponse;
  error?: string;
}

export interface TabSummary {
  tabId: number;
  url: string;
  title: string;
  summary: string;
  timestamp: number;
  tokens: number;
}

export interface CategorySummary {
  category: string;
  summary: string;
  tabCount: number;
  timestamp: number;
  tokens: number;
}

export interface SummaryCache {
  tabs: { [tabId: number]: TabSummary };
  categories: { [category: string]: CategorySummary };
}

export interface SummarySettings {
  enabled: boolean;
  cacheDuration: number; // in hours
}

export interface JiraSettings {
  smartMode: boolean; // Enable Jira Smart Mode (auto-group by project)
}

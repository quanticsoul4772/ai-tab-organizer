export interface Tab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

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

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

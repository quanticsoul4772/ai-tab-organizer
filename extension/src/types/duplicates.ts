// Duplicate detection types

export interface DuplicateGroup {
  id: string;
  tabs: chrome.tabs.Tab[];
  similarity: number; // 0-1 score
  detectionMethod: 'url' | 'fingerprint' | 'semantic';
  reason: string;
  recommendation: {
    keepTabId: number;
    closeTabIds: number[];
    confidence: number;
  };
}

export interface DetectionResult {
  totalTabs: number;
  duplicateGroups: DuplicateGroup[];
  processingTime: number;
  apiCost: number;
  tier1Found: number;
  tier2Found: number;
  tier3Found: number;
}

export interface TabContent {
  tabId: number;
  title: string;
  url: string;
  metaDescription?: string;
  textContent: string;
  contentHash: string;
  extracted: Date;
}

export interface SemanticAnalysisRequest {
  tab1: {
    title: string;
    url: string;
    content: string;
  };
  tab2: {
    title: string;
    url: string;
    content: string;
  };
}

export interface SemanticAnalysisResponse {
  areDuplicates: boolean;
  similarity: number;
  reasoning: string;
  confidence: number;
}

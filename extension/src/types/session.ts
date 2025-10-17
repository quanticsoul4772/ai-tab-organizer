export interface Session {
  id: string;
  name: string;
  description?: string;
  created: number;
  lastModified: number;
  tabs: SessionTab[];
  metadata: SessionMetadata;
}

export interface SessionTab {
  url: string;
  title: string;
  pinned: boolean;
  groupId?: number;
  index: number;
}

export interface SessionMetadata {
  tabCount: number;
  jiraTickets?: string[];
  categories?: string[];
  icon?: string;
}

export interface SessionListItem {
  id: string;
  name: string;
  description?: string;
  created: number;
  lastModified: number;
  tabCount: number;
  preview?: string;
  categories?: string[];
  jiraTickets?: string[];
}

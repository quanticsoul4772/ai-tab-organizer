// Jira/Confluence types

export interface JiraTicketInfo {
  projectKey: string; // "ENG"
  ticketNumber: number; // 123
  fullTicket: string; // "ENG-123"
  summary: string; // "Fix login bug"
  status?: JiraStatus;
  url: string;
  tabId: number;
}

export type JiraStatus =
  | 'todo'
  | 'in-progress'
  | 'in-review'
  | 'done'
  | 'blocked'
  | 'unknown';

export interface ConfluencePageInfo {
  spaceKey: string; // "DESIGN"
  spaceId?: string;
  pageTitle: string;
  url: string;
  tabId: number;
}

export interface AtlassianGrouping {
  jiraProjects: Map<string, JiraTicketInfo[]>;
  confluenceSpaces: Map<string, ConfluencePageInfo[]>;
  otherAtlassian: chrome.tabs.Tab[];
}

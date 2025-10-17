export type TabActivityStatus = 'active' | 'idle' | 'forgotten' | 'suspended';

export type TabBadgeType = 'duplicate' | 'memory' | 'jira-status' | 'pinned';

export interface TabBadge {
  type: TabBadgeType;
  value: string | number;
  icon?: string;
}

export interface TabIndicators {
  activityStatus: TabActivityStatus;
  activityColor: string;
  badges: TabBadge[];
}

export interface TabMetadata {
  lastAccessed: number;
  memoryUsage?: number;
  isSuspended: boolean;
  duplicateCount: number;
  isPinned: boolean;
  jiraStatus?: string;
}

export const ACTIVITY_COLORS: Record<TabActivityStatus, string> = {
  active: '#10b981',    // Green
  idle: '#f59e0b',      // Yellow
  forgotten: '#ef4444', // Red
  suspended: '#9ca3af'  // Gray
};

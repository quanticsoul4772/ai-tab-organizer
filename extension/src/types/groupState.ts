export interface GroupState {
  categoryId: string;
  isCollapsed: boolean;
  lastModified: number;
}

export interface GroupStates {
  [categoryId: string]: boolean;
}

export interface GroupMetadata {
  tabCount: number;
  memoryUsage?: number;
  hasRecentActivity: boolean;
  lastAccessed: number;
}

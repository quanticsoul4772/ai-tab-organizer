import type { Tab } from '../types';
import type { GroupMetadata } from '../types/groupState';

/**
 * Determine the default collapse state for a category group
 * based on smart heuristics
 */
export function getDefaultCollapseState(
  _categoryId: string,
  tabs: Tab[],
  metadata?: GroupMetadata
): boolean {
  // Auto-collapse tiny groups (2 or fewer tabs)
  if (tabs.length <= 2) return true;

  // Auto-expand large groups (5+ tabs)
  if (tabs.length >= 5) return false;

  // Check for recent activity if metadata is available
  if (metadata?.hasRecentActivity) return false;

  // Default: collapsed for medium groups (3-4 tabs)
  return true;
}

/**
 * Check if a group has recent activity (any tab accessed within last 5 minutes)
 */
export function hasRecentActivity(tabs: Tab[], lastAccessedMap: Map<number, number>): boolean {
  const RECENT_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  return tabs.some((tab) => {
    if (!tab.id) return false;
    const lastAccessed = lastAccessedMap.get(tab.id);
    if (!lastAccessed) return false;
    return now - lastAccessed < RECENT_THRESHOLD;
  });
}

import type { TabActivityStatus, TabIndicators, TabBadge, TabMetadata } from '../types/indicators';
import { ACTIVITY_COLORS } from '../types/indicators';

export function getActivityStatus(lastAccessed: number, isSuspended: boolean): TabActivityStatus {
  if (isSuspended) {
    return 'suspended';
  }

  const idleTime = Date.now() - lastAccessed;

  if (idleTime < 5 * 60 * 1000) {
    return 'active';      // Less than 5 minutes
  }

  if (idleTime < 30 * 60 * 1000) {
    return 'idle';        // 5-30 minutes
  }

  return 'forgotten';     // More than 30 minutes
}

export function getActivityColor(status: TabActivityStatus): string {
  return ACTIVITY_COLORS[status];
}

export function getTabIndicators(metadata: TabMetadata): TabIndicators {
  const badges: TabBadge[] = [];

  // Duplicate badge
  if (metadata.duplicateCount > 1) {
    badges.push({
      type: 'duplicate',
      value: `×${metadata.duplicateCount}`,
      icon: '🔄'
    });
  }

  // Memory badge (show if > 100MB)
  if (metadata.memoryUsage && metadata.memoryUsage > 100 * 1024 * 1024) {
    badges.push({
      type: 'memory',
      value: `${Math.round(metadata.memoryUsage / (1024 * 1024))}MB`,
      icon: '📊'
    });
  }

  // Jira status badge
  if (metadata.jiraStatus) {
    const statusEmoji: Record<string, string> = {
      'Blocked': '🔴',
      'In Progress': '🟡',
      'In Review': '🟣',
      'Done': '🟢',
      'To Do': '⚪'
    };

    const emoji = statusEmoji[metadata.jiraStatus] || '⚪';

    badges.push({
      type: 'jira-status',
      value: '',
      icon: emoji
    });
  }

  // Pinned badge
  if (metadata.isPinned) {
    badges.push({
      type: 'pinned',
      value: '',
      icon: '📌'
    });
  }

  const activityStatus = getActivityStatus(metadata.lastAccessed, metadata.isSuspended);

  return {
    activityStatus,
    activityColor: getActivityColor(activityStatus),
    badges
  };
}

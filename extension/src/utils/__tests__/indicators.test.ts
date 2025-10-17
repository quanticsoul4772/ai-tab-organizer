import { describe, it, expect } from 'vitest';
import { getActivityStatus, getActivityColor, getTabIndicators } from '../indicators';
import type { TabMetadata } from '../../types/indicators';

describe('indicators', () => {
  describe('getActivityStatus', () => {
    it('should return suspended for suspended tabs', () => {
      const result = getActivityStatus(Date.now(), true);
      expect(result).toBe('suspended');
    });

    it('should return active for tabs accessed within 5 minutes', () => {
      const lastAccessed = Date.now() - 4 * 60 * 1000; // 4 minutes ago
      const result = getActivityStatus(lastAccessed, false);
      expect(result).toBe('active');
    });

    it('should return idle for tabs accessed 5-30 minutes ago', () => {
      const lastAccessed = Date.now() - 15 * 60 * 1000; // 15 minutes ago
      const result = getActivityStatus(lastAccessed, false);
      expect(result).toBe('idle');
    });

    it('should return forgotten for tabs accessed over 30 minutes ago', () => {
      const lastAccessed = Date.now() - 45 * 60 * 1000; // 45 minutes ago
      const result = getActivityStatus(lastAccessed, false);
      expect(result).toBe('forgotten');
    });
  });

  describe('getActivityColor', () => {
    it('should return correct color for each status', () => {
      expect(getActivityColor('active')).toBe('#10b981');
      expect(getActivityColor('idle')).toBe('#f59e0b');
      expect(getActivityColor('forgotten')).toBe('#ef4444');
      expect(getActivityColor('suspended')).toBe('#9ca3af');
    });
  });

  describe('getTabIndicators', () => {
    it('should include duplicate badge when count > 1', () => {
      const metadata: TabMetadata = {
        lastAccessed: Date.now(),
        isSuspended: false,
        duplicateCount: 3,
        isPinned: false,
      };

      const result = getTabIndicators(metadata);

      expect(result.badges).toContainEqual({
        type: 'duplicate',
        value: '×3',
        icon: '🔄',
      });
    });

    it('should include memory badge when usage > 100MB', () => {
      const metadata: TabMetadata = {
        lastAccessed: Date.now(),
        isSuspended: false,
        duplicateCount: 1,
        isPinned: false,
        memoryUsage: 150 * 1024 * 1024, // 150MB
      };

      const result = getTabIndicators(metadata);

      expect(result.badges).toContainEqual({
        type: 'memory',
        value: '150MB',
        icon: '📊',
      });
    });

    it('should include Jira status badge', () => {
      const metadata: TabMetadata = {
        lastAccessed: Date.now(),
        isSuspended: false,
        duplicateCount: 1,
        isPinned: false,
        jiraStatus: 'In Progress',
      };

      const result = getTabIndicators(metadata);

      expect(result.badges).toContainEqual({
        type: 'jira-status',
        value: 'In Progress',
        icon: '',
      });
    });

    it('should include pinned badge', () => {
      const metadata: TabMetadata = {
        lastAccessed: Date.now(),
        isSuspended: false,
        duplicateCount: 1,
        isPinned: true,
      };

      const result = getTabIndicators(metadata);

      expect(result.badges).toContainEqual({
        type: 'pinned',
        value: '',
        icon: '📌',
      });
    });

    it('should return correct activity status and color', () => {
      const metadata: TabMetadata = {
        lastAccessed: Date.now() - 2 * 60 * 1000, // 2 minutes ago
        isSuspended: false,
        duplicateCount: 1,
        isPinned: false,
      };

      const result = getTabIndicators(metadata);

      expect(result.activityStatus).toBe('active');
      expect(result.activityColor).toBe('#10b981');
    });

    it('should handle multiple badges', () => {
      const metadata: TabMetadata = {
        lastAccessed: Date.now(),
        isSuspended: false,
        duplicateCount: 2,
        isPinned: true,
        jiraStatus: 'Done',
        memoryUsage: 120 * 1024 * 1024,
      };

      const result = getTabIndicators(metadata);

      expect(result.badges.length).toBe(4);
    });
  });
});

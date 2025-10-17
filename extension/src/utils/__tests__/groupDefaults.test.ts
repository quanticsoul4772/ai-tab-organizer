import { describe, it, expect } from 'vitest';
import { getDefaultCollapseState, hasRecentActivity } from '../groupDefaults';
import type { Tab } from '../../types';

describe('groupDefaults', () => {
  describe('getDefaultCollapseState', () => {
    it('should collapse groups with 2 or fewer tabs', () => {
      const tabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
        { id: 2, title: 'Tab 2', url: 'https://example.com' },
      ];

      const result = getDefaultCollapseState('Test', tabs);

      expect(result).toBe(true);
    });

    it('should collapse single tab groups', () => {
      const tabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
      ];

      const result = getDefaultCollapseState('Test', tabs);

      expect(result).toBe(true);
    });

    it('should expand groups with 5 or more tabs', () => {
      const tabs: Tab[] = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        title: `Tab ${i + 1}`,
        url: 'https://example.com',
      }));

      const result = getDefaultCollapseState('Test', tabs);

      expect(result).toBe(false);
    });

    it('should expand groups with recent activity', () => {
      const tabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
        { id: 2, title: 'Tab 2', url: 'https://example.com' },
        { id: 3, title: 'Tab 3', url: 'https://example.com' },
      ];

      const metadata = {
        tabCount: 3,
        hasRecentActivity: true,
        lastAccessed: Date.now(),
      };

      const result = getDefaultCollapseState('Test', tabs, metadata);

      expect(result).toBe(false);
    });

    it('should collapse medium groups without recent activity', () => {
      const tabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
        { id: 2, title: 'Tab 2', url: 'https://example.com' },
        { id: 3, title: 'Tab 3', url: 'https://example.com' },
      ];

      const result = getDefaultCollapseState('Test', tabs);

      expect(result).toBe(true);
    });
  });

  describe('hasRecentActivity', () => {
    it('should return true for tabs accessed within 5 minutes', () => {
      const tabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
      ];

      const lastAccessedMap = new Map<number, number>();
      lastAccessedMap.set(1, Date.now() - 2 * 60 * 1000); // 2 minutes ago

      const result = hasRecentActivity(tabs, lastAccessedMap);

      expect(result).toBe(true);
    });

    it('should return false for tabs accessed over 5 minutes ago', () => {
      const tabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
      ];

      const lastAccessedMap = new Map<number, number>();
      lastAccessedMap.set(1, Date.now() - 10 * 60 * 1000); // 10 minutes ago

      const result = hasRecentActivity(tabs, lastAccessedMap);

      expect(result).toBe(false);
    });

    it('should return false when no access times are tracked', () => {
      const tabs: Tab[] = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
      ];

      const lastAccessedMap = new Map<number, number>();

      const result = hasRecentActivity(tabs, lastAccessedMap);

      expect(result).toBe(false);
    });
  });
});

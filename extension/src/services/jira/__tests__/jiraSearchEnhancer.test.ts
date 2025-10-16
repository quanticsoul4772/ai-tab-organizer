import { describe, it, expect } from 'vitest';
import { JiraSearchEnhancer } from '../jiraSearchEnhancer';

describe('JiraSearchEnhancer', () => {
  describe('isTicketPattern', () => {
    it('should detect PROJECT-NUMBER pattern', () => {
      expect(JiraSearchEnhancer.isTicketPattern('ENG-123')).toBe(true);
      expect(JiraSearchEnhancer.isTicketPattern('DESIGN-45')).toBe(true);
      expect(JiraSearchEnhancer.isTicketPattern('PROJ123-999')).toBe(true);
    });

    it('should detect PROJECT NUMBER pattern (with space)', () => {
      expect(JiraSearchEnhancer.isTicketPattern('ENG 123')).toBe(true);
      expect(JiraSearchEnhancer.isTicketPattern('DESIGN 45')).toBe(true);
    });

    it('should detect just NUMBER pattern', () => {
      expect(JiraSearchEnhancer.isTicketPattern('123')).toBe(true);
      expect(JiraSearchEnhancer.isTicketPattern('45')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(JiraSearchEnhancer.isTicketPattern('eng-123')).toBe(true);
      expect(JiraSearchEnhancer.isTicketPattern('Eng-123')).toBe(true);
    });

    it('should reject non-ticket patterns', () => {
      expect(JiraSearchEnhancer.isTicketPattern('ENG-')).toBe(false);
      expect(JiraSearchEnhancer.isTicketPattern('-123')).toBe(false);
      expect(JiraSearchEnhancer.isTicketPattern('ENG-123-456')).toBe(false);
      expect(JiraSearchEnhancer.isTicketPattern('random text')).toBe(false);
      expect(JiraSearchEnhancer.isTicketPattern('')).toBe(false);
    });
  });

  describe('isProjectPattern', () => {
    it('should detect valid project keys', () => {
      expect(JiraSearchEnhancer.isProjectPattern('ENG')).toBe(true);
      expect(JiraSearchEnhancer.isProjectPattern('DESIGN')).toBe(true);
      expect(JiraSearchEnhancer.isProjectPattern('PROJ123')).toBe(true);
    });

    it('should require uppercase to avoid false positives', () => {
      // Lowercase "eng" could be a regular word, so require uppercase
      expect(JiraSearchEnhancer.isProjectPattern('eng')).toBe(false);
      expect(JiraSearchEnhancer.isProjectPattern('Eng')).toBe(false);
      // Only all-uppercase is treated as project pattern
      expect(JiraSearchEnhancer.isProjectPattern('ENG')).toBe(true);
    });

    it('should reject too short keys', () => {
      expect(JiraSearchEnhancer.isProjectPattern('E')).toBe(false);
    });

    it('should reject too long keys', () => {
      expect(JiraSearchEnhancer.isProjectPattern('VERYLONGPROJECT')).toBe(false);
    });

    it('should reject non-project patterns', () => {
      expect(JiraSearchEnhancer.isProjectPattern('ENG-123')).toBe(false);
      expect(JiraSearchEnhancer.isProjectPattern('123')).toBe(false);
      expect(JiraSearchEnhancer.isProjectPattern('ENG 123')).toBe(false);
      expect(JiraSearchEnhancer.isProjectPattern('random text')).toBe(false);
      expect(JiraSearchEnhancer.isProjectPattern('')).toBe(false);
    });
  });

  describe('parseTicketQuery', () => {
    it('should parse PROJECT-NUMBER format', () => {
      expect(JiraSearchEnhancer.parseTicketQuery('ENG-123')).toBe('ENG-123');
      expect(JiraSearchEnhancer.parseTicketQuery('DESIGN-45')).toBe('DESIGN-45');
    });

    it('should parse PROJECT NUMBER format (with space)', () => {
      expect(JiraSearchEnhancer.parseTicketQuery('ENG 123')).toBe('ENG-123');
      expect(JiraSearchEnhancer.parseTicketQuery('DESIGN 45')).toBe('DESIGN-45');
    });

    it('should normalize to uppercase', () => {
      expect(JiraSearchEnhancer.parseTicketQuery('eng-123')).toBe('ENG-123');
      expect(JiraSearchEnhancer.parseTicketQuery('Eng-123')).toBe('ENG-123');
    });

    it('should return null for invalid patterns', () => {
      expect(JiraSearchEnhancer.parseTicketQuery('123')).toBeNull();
      expect(JiraSearchEnhancer.parseTicketQuery('ENG')).toBeNull();
      expect(JiraSearchEnhancer.parseTicketQuery('random')).toBeNull();
    });
  });

  describe('extractJiraTickets', () => {
    it('should extract Jira tickets from tabs', () => {
      const tabs: chrome.tabs.Tab[] = [
        {
          id: 1,
          url: 'https://company.atlassian.net/browse/ENG-123',
          title: '[ENG-123] Fix login bug - In Progress',
          index: 0,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
        },
        {
          id: 2,
          url: 'https://google.com',
          title: 'Google',
          index: 1,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
        },
      ];

      const tickets = JiraSearchEnhancer.extractJiraTickets(tabs);

      expect(tickets.size).toBe(1);
      expect(tickets.get(1)).toMatchObject({
        projectKey: 'ENG',
        ticketNumber: 123,
        fullTicket: 'ENG-123',
        summary: 'Fix login bug',
        status: 'in-progress',
        tabId: 1,
      });
    });

    it('should handle tabs without URL or ID', () => {
      const tabs: chrome.tabs.Tab[] = [
        {
          id: undefined,
          url: 'https://company.atlassian.net/browse/ENG-123',
          title: 'Test',
          index: 0,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
        } as any,
      ];

      const tickets = JiraSearchEnhancer.extractJiraTickets(tabs);
      expect(tickets.size).toBe(0);
    });
  });

  describe('searchJiraTabs', () => {
    const mockTabs: chrome.tabs.Tab[] = [
      {
        id: 1,
        url: 'https://company.atlassian.net/browse/ENG-123',
        title: '[ENG-123] Fix login bug - In Progress',
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: false,
        incognito: false,
        selected: false,
      },
      {
        id: 2,
        url: 'https://company.atlassian.net/browse/ENG-456',
        title: '[ENG-456] Add new feature',
        index: 1,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: false,
        incognito: false,
        selected: false,
      },
      {
        id: 3,
        url: 'https://company.atlassian.net/browse/DESIGN-789',
        title: '[DESIGN-789] Update mockups',
        index: 2,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: false,
        incognito: false,
        selected: false,
      },
    ];

    it('should find exact ticket match', () => {
      const results = JiraSearchEnhancer.searchJiraTabs('ENG-123', mockTabs);

      expect(results).toHaveLength(1);
      expect(results[0].tab.id).toBe(1);
      expect(results[0].score).toBe(1.0);
      expect(results[0].reason).toContain('Exact match');
    });

    it('should be case insensitive for exact match', () => {
      const results = JiraSearchEnhancer.searchJiraTabs('eng-123', mockTabs);

      expect(results).toHaveLength(1);
      expect(results[0].tab.id).toBe(1);
    });

    it('should find partial number match', () => {
      const results = JiraSearchEnhancer.searchJiraTabs('eng 123', mockTabs);

      expect(results).toHaveLength(1);
      expect(results[0].tab.id).toBe(1);
    });

    it('should find all tickets in project', () => {
      const results = JiraSearchEnhancer.searchJiraTabs('ENG', mockTabs);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.tab.id)).toContain(1);
      expect(results.map((r) => r.tab.id)).toContain(2);
      expect(results.every((r) => r.score === 0.85)).toBe(true);
    });

    it('should sort project results by ticket number descending', () => {
      const results = JiraSearchEnhancer.searchJiraTabs('ENG', mockTabs);

      expect(results[0].tab.id).toBe(2); // ENG-456
      expect(results[1].tab.id).toBe(1); // ENG-123
    });

    it('should search by text in summary', () => {
      const results = JiraSearchEnhancer.searchJiraTabs('login', mockTabs);

      expect(results).toHaveLength(1);
      expect(results[0].tab.id).toBe(1);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const results = JiraSearchEnhancer.searchJiraTabs('NONEXISTENT-999', mockTabs);
      expect(results).toHaveLength(0);
    });

    it('should return empty for non-Jira tabs', () => {
      const nonJiraTabs: chrome.tabs.Tab[] = [
        {
          id: 1,
          url: 'https://google.com',
          title: 'Google',
          index: 0,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
        },
      ];

      const results = JiraSearchEnhancer.searchJiraTabs('ENG-123', nonJiraTabs);
      expect(results).toHaveLength(0);
    });
  });

  describe('getTicketInfo', () => {
    it('should get ticket info from Jira tab', () => {
      const tab: chrome.tabs.Tab = {
        id: 1,
        url: 'https://company.atlassian.net/browse/ENG-123',
        title: '[ENG-123] Fix login bug - In Progress',
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: false,
        incognito: false,
        selected: false,
      };

      const info = JiraSearchEnhancer.getTicketInfo(tab);

      expect(info).toMatchObject({
        projectKey: 'ENG',
        ticketNumber: 123,
        fullTicket: 'ENG-123',
        summary: 'Fix login bug',
        status: 'in-progress',
        tabId: 1,
      });
    });

    it('should return null for non-Jira tab', () => {
      const tab: chrome.tabs.Tab = {
        id: 1,
        url: 'https://google.com',
        title: 'Google',
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: false,
        incognito: false,
        selected: false,
      };

      const info = JiraSearchEnhancer.getTicketInfo(tab);
      expect(info).toBeNull();
    });

    it('should handle tab without URL or ID', () => {
      const tab: chrome.tabs.Tab = {
        id: undefined,
        url: undefined,
        title: 'Test',
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: false,
        incognito: false,
        selected: false,
      } as any;

      const info = JiraSearchEnhancer.getTicketInfo(tab);
      expect(info).toBeNull();
    });
  });

  describe('formatResultDescription', () => {
    it('should format Jira ticket description with status', () => {
      const tab: chrome.tabs.Tab = {
        id: 1,
        url: 'https://company.atlassian.net/browse/ENG-123',
        title: '[ENG-123] Fix login bug - In Progress',
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: false,
        incognito: false,
        selected: false,
      };

      const description = JiraSearchEnhancer.formatResultDescription(tab);
      expect(description).toBe('ENG-123: Fix login bug [In Progress]');
    });

    it('should format Jira ticket description without status', () => {
      const tab: chrome.tabs.Tab = {
        id: 1,
        url: 'https://company.atlassian.net/browse/ENG-123',
        title: '[ENG-123] Fix login bug',
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: false,
        incognito: false,
        selected: false,
      };

      const description = JiraSearchEnhancer.formatResultDescription(tab);
      expect(description).toBe('ENG-123: Fix login bug');
    });

    it('should return tab title for non-Jira tab', () => {
      const tab: chrome.tabs.Tab = {
        id: 1,
        url: 'https://google.com',
        title: 'Google',
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: false,
        incognito: false,
        selected: false,
      };

      const description = JiraSearchEnhancer.formatResultDescription(tab);
      expect(description).toBe('Google');
    });
  });
});

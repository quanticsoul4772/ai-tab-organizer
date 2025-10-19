import { describe, it, expect, beforeEach } from 'vitest';
import { AtlassianDetectionService } from '../atlassianDetectionService';
import type { JiraTicketInfo, ConfluencePageInfo } from '../../../types/jira';

describe('AtlassianDetectionService', () => {
  let service: AtlassianDetectionService;

  beforeEach(() => {
    service = new AtlassianDetectionService();
  });

  describe('detectAtlassianTabs', () => {
    it('should detect Jira tabs', async () => {
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
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
        },
        {
          id: 2,
          url: 'https://jira.company.com/browse/DESIGN-45',
          title: 'DESIGN-45: Update mockups',
          index: 1,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
        },
      ];

      const result = await service.detectAtlassianTabs(tabs);

      expect(result.jiraTabs).toHaveLength(2);
      expect(result.confluenceTabs).toHaveLength(0);
      expect(result.otherAtlassian).toHaveLength(0);

      expect(result.jiraTabs[0]).toMatchObject({
        projectKey: 'ENG',
        ticketNumber: 123,
        fullTicket: 'ENG-123',
        summary: 'Fix login bug',
        status: 'in-progress',
        tabId: 1,
      });
    });

    it('should detect Confluence tabs', async () => {
      const tabs: chrome.tabs.Tab[] = [
        {
          id: 1,
          url: 'https://company.atlassian.net/wiki/spaces/DESIGN/pages/123456/Page+Title',
          title: 'Page Title - DESIGN - Confluence',
          index: 0,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
        },
      ];

      const result = await service.detectAtlassianTabs(tabs);

      expect(result.jiraTabs).toHaveLength(0);
      expect(result.confluenceTabs).toHaveLength(1);
      expect(result.otherAtlassian).toHaveLength(0);

      expect(result.confluenceTabs[0]).toMatchObject({
        spaceKey: 'DESIGN',
        pageTitle: 'Page Title - DESIGN',
        tabId: 1,
      });
    });

    it('should detect other Atlassian tabs', async () => {
      const tabs: chrome.tabs.Tab[] = [
        {
          id: 1,
          url: 'https://company.atlassian.net/admin/settings',
          title: 'Admin Settings',
          index: 0,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
        },
      ];

      const result = await service.detectAtlassianTabs(tabs);

      expect(result.jiraTabs).toHaveLength(0);
      expect(result.confluenceTabs).toHaveLength(0);
      expect(result.otherAtlassian).toHaveLength(1);
    });

    it('should skip tabs without URL or ID', async () => {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        {
          id: 1,
          url: undefined,
          title: 'Test',
          index: 1,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: false,
          incognito: false,
          selected: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ];

      const result = await service.detectAtlassianTabs(tabs);

      expect(result.jiraTabs).toHaveLength(0);
      expect(result.confluenceTabs).toHaveLength(0);
      expect(result.otherAtlassian).toHaveLength(0);
    });
  });

  describe('groupAtlassianTabs', () => {
    it('should group Jira tickets by project', () => {
      const jiraTabs: JiraTicketInfo[] = [
        {
          projectKey: 'ENG',
          ticketNumber: 123,
          fullTicket: 'ENG-123',
          summary: 'Bug 1',
          url: 'https://test.com',
          tabId: 1,
        },
        {
          projectKey: 'ENG',
          ticketNumber: 456,
          fullTicket: 'ENG-456',
          summary: 'Bug 2',
          url: 'https://test.com',
          tabId: 2,
        },
        {
          projectKey: 'DESIGN',
          ticketNumber: 789,
          fullTicket: 'DESIGN-789',
          summary: 'Task 1',
          url: 'https://test.com',
          tabId: 3,
        },
      ];

      const result = service.groupAtlassianTabs(jiraTabs, [], []);

      expect(result.jiraProjects.size).toBe(2);
      expect(result.jiraProjects.get('ENG')).toHaveLength(2);
      expect(result.jiraProjects.get('DESIGN')).toHaveLength(1);
    });

    it('should sort tickets by ticket number descending', () => {
      const jiraTabs: JiraTicketInfo[] = [
        {
          projectKey: 'ENG',
          ticketNumber: 100,
          fullTicket: 'ENG-100',
          summary: 'Bug 1',
          url: 'https://test.com',
          tabId: 1,
        },
        {
          projectKey: 'ENG',
          ticketNumber: 500,
          fullTicket: 'ENG-500',
          summary: 'Bug 2',
          url: 'https://test.com',
          tabId: 2,
        },
        {
          projectKey: 'ENG',
          ticketNumber: 200,
          fullTicket: 'ENG-200',
          summary: 'Bug 3',
          url: 'https://test.com',
          tabId: 3,
        },
      ];

      const result = service.groupAtlassianTabs(jiraTabs, [], []);
      const engTickets = result.jiraProjects.get('ENG')!;

      expect(engTickets[0].ticketNumber).toBe(500);
      expect(engTickets[1].ticketNumber).toBe(200);
      expect(engTickets[2].ticketNumber).toBe(100);
    });

    it('should group Confluence pages by space', () => {
      const confluenceTabs: ConfluencePageInfo[] = [
        {
          spaceKey: 'DESIGN',
          pageTitle: 'Page 1',
          url: 'https://test.com',
          tabId: 1,
        },
        {
          spaceKey: 'DESIGN',
          pageTitle: 'Page 2',
          url: 'https://test.com',
          tabId: 2,
        },
        {
          spaceKey: 'ENG',
          pageTitle: 'Page 3',
          url: 'https://test.com',
          tabId: 3,
        },
      ];

      const result = service.groupAtlassianTabs([], confluenceTabs, []);

      expect(result.confluenceSpaces.size).toBe(2);
      expect(result.confluenceSpaces.get('DESIGN')).toHaveLength(2);
      expect(result.confluenceSpaces.get('ENG')).toHaveLength(1);
    });

    it('should sort pages alphabetically by title', () => {
      const confluenceTabs: ConfluencePageInfo[] = [
        {
          spaceKey: 'DESIGN',
          pageTitle: 'Zebra',
          url: 'https://test.com',
          tabId: 1,
        },
        {
          spaceKey: 'DESIGN',
          pageTitle: 'Apple',
          url: 'https://test.com',
          tabId: 2,
        },
        {
          spaceKey: 'DESIGN',
          pageTitle: 'Mango',
          url: 'https://test.com',
          tabId: 3,
        },
      ];

      const result = service.groupAtlassianTabs([], confluenceTabs, []);
      const designPages = result.confluenceSpaces.get('DESIGN')!;

      expect(designPages[0].pageTitle).toBe('Apple');
      expect(designPages[1].pageTitle).toBe('Mango');
      expect(designPages[2].pageTitle).toBe('Zebra');
    });
  });

  describe('getTicketsByStatus', () => {
    it('should filter tickets by status', () => {
      const tickets: JiraTicketInfo[] = [
        {
          projectKey: 'ENG',
          ticketNumber: 1,
          fullTicket: 'ENG-1',
          summary: 'Task 1',
          status: 'todo',
          url: 'https://test.com',
          tabId: 1,
        },
        {
          projectKey: 'ENG',
          ticketNumber: 2,
          fullTicket: 'ENG-2',
          summary: 'Task 2',
          status: 'in-progress',
          url: 'https://test.com',
          tabId: 2,
        },
        {
          projectKey: 'ENG',
          ticketNumber: 3,
          fullTicket: 'ENG-3',
          summary: 'Task 3',
          status: 'in-progress',
          url: 'https://test.com',
          tabId: 3,
        },
      ];

      const inProgress = service.getTicketsByStatus(tickets, 'in-progress');
      expect(inProgress).toHaveLength(2);
      expect(inProgress.every((t) => t.status === 'in-progress')).toBe(true);

      const todo = service.getTicketsByStatus(tickets, 'todo');
      expect(todo).toHaveLength(1);
      expect(todo[0].fullTicket).toBe('ENG-1');
    });
  });

  describe('getJiraStats', () => {
    it('should calculate correct statistics', () => {
      const tickets: JiraTicketInfo[] = [
        {
          projectKey: 'ENG',
          ticketNumber: 1,
          fullTicket: 'ENG-1',
          summary: 'Task 1',
          status: 'todo',
          url: 'https://test.com',
          tabId: 1,
        },
        {
          projectKey: 'ENG',
          ticketNumber: 2,
          fullTicket: 'ENG-2',
          summary: 'Task 2',
          status: 'in-progress',
          url: 'https://test.com',
          tabId: 2,
        },
        {
          projectKey: 'DESIGN',
          ticketNumber: 1,
          fullTicket: 'DESIGN-1',
          summary: 'Task 3',
          status: 'done',
          url: 'https://test.com',
          tabId: 3,
        },
      ];

      const stats = service.getJiraStats(tickets);

      expect(stats.totalTickets).toBe(3);
      expect(stats.projectCount).toBe(2);
      expect(stats.byStatus.todo).toBe(1);
      expect(stats.byStatus['in-progress']).toBe(1);
      expect(stats.byStatus.done).toBe(1);
      expect(stats.topProjects).toHaveLength(2);
      expect(stats.topProjects[0]).toEqual({ projectKey: 'ENG', count: 2 });
      expect(stats.topProjects[1]).toEqual({ projectKey: 'DESIGN', count: 1 });
    });
  });

  describe('getConfluenceStats', () => {
    it('should calculate correct statistics', () => {
      const pages: ConfluencePageInfo[] = [
        {
          spaceKey: 'DESIGN',
          pageTitle: 'Page 1',
          url: 'https://test.com',
          tabId: 1,
        },
        {
          spaceKey: 'DESIGN',
          pageTitle: 'Page 2',
          url: 'https://test.com',
          tabId: 2,
        },
        {
          spaceKey: 'ENG',
          pageTitle: 'Page 3',
          url: 'https://test.com',
          tabId: 3,
        },
      ];

      const stats = service.getConfluenceStats(pages);

      expect(stats.totalPages).toBe(3);
      expect(stats.spaceCount).toBe(2);
      expect(stats.topSpaces).toHaveLength(2);
      expect(stats.topSpaces[0]).toEqual({ spaceKey: 'DESIGN', count: 2 });
      expect(stats.topSpaces[1]).toEqual({ spaceKey: 'ENG', count: 1 });
    });
  });

  describe('searchJiraTickets', () => {
    const tickets: JiraTicketInfo[] = [
      {
        projectKey: 'ENG',
        ticketNumber: 123,
        fullTicket: 'ENG-123',
        summary: 'Fix login bug',
        url: 'https://test.com',
        tabId: 1,
      },
      {
        projectKey: 'DESIGN',
        ticketNumber: 456,
        fullTicket: 'DESIGN-456',
        summary: 'Update mockups',
        url: 'https://test.com',
        tabId: 2,
      },
    ];

    it('should search by full ticket number', () => {
      const results = service.searchJiraTickets(tickets, 'ENG-123');
      expect(results).toHaveLength(1);
      expect(results[0].fullTicket).toBe('ENG-123');
    });

    it('should search by partial ticket number', () => {
      const results = service.searchJiraTickets(tickets, '123');
      expect(results).toHaveLength(1);
      expect(results[0].ticketNumber).toBe(123);
    });

    it('should search by summary', () => {
      const results = service.searchJiraTickets(tickets, 'login');
      expect(results).toHaveLength(1);
      expect(results[0].summary).toContain('login');
    });

    it('should be case insensitive', () => {
      const results = service.searchJiraTickets(tickets, 'MOCKUPS');
      expect(results).toHaveLength(1);
      expect(results[0].summary.toLowerCase()).toContain('mockups');
    });

    it('should return empty array for no matches', () => {
      const results = service.searchJiraTickets(tickets, 'nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('searchConfluencePages', () => {
    const pages: ConfluencePageInfo[] = [
      {
        spaceKey: 'DESIGN',
        pageTitle: 'Design System Overview',
        url: 'https://test.com',
        tabId: 1,
      },
      {
        spaceKey: 'ENG',
        pageTitle: 'API Documentation',
        url: 'https://test.com',
        tabId: 2,
      },
    ];

    it('should search by space key', () => {
      const results = service.searchConfluencePages(pages, 'DESIGN');
      expect(results).toHaveLength(1);
      expect(results[0].spaceKey).toBe('DESIGN');
    });

    it('should search by page title', () => {
      const results = service.searchConfluencePages(pages, 'API');
      expect(results).toHaveLength(1);
      expect(results[0].pageTitle).toContain('API');
    });

    it('should be case insensitive', () => {
      const results = service.searchConfluencePages(pages, 'design system');
      expect(results).toHaveLength(1);
      expect(results[0].pageTitle.toLowerCase()).toContain('design system');
    });

    it('should return empty array for no matches', () => {
      const results = service.searchConfluencePages(pages, 'nonexistent');
      expect(results).toHaveLength(0);
    });
  });
});

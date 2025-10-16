import type { JiraTicketInfo, ConfluencePageInfo, AtlassianGrouping } from '../../types/jira';
import { AtlassianUrlParser } from './urlParser';
import { JiraTitleParser } from './titleParser';

/**
 * Service for detecting and organizing Atlassian (Jira/Confluence) tabs
 */
export class AtlassianDetectionService {
  /**
   * Detect and parse all Atlassian tabs from a list of Chrome tabs
   */
  async detectAtlassianTabs(tabs: chrome.tabs.Tab[]): Promise<{
    jiraTabs: JiraTicketInfo[];
    confluenceTabs: ConfluencePageInfo[];
    otherAtlassian: chrome.tabs.Tab[];
  }> {
    const jiraTabs: JiraTicketInfo[] = [];
    const confluenceTabs: ConfluencePageInfo[] = [];
    const otherAtlassian: chrome.tabs.Tab[] = [];

    for (const tab of tabs) {
      if (!tab.url || !tab.id) continue;

      const atlassianType = AtlassianUrlParser.getAtlassianType(tab.url);

      if (atlassianType === 'jira') {
        const jiraInfo = this.parseJiraTab(tab);
        if (jiraInfo) {
          jiraTabs.push(jiraInfo);
        }
      } else if (atlassianType === 'confluence') {
        const confluenceInfo = this.parseConfluenceTab(tab);
        if (confluenceInfo) {
          confluenceTabs.push(confluenceInfo);
        }
      } else if (atlassianType === 'other') {
        otherAtlassian.push(tab);
      }
    }

    return { jiraTabs, confluenceTabs, otherAtlassian };
  }

  /**
   * Parse a Jira tab to extract ticket information
   */
  private parseJiraTab(tab: chrome.tabs.Tab): JiraTicketInfo | null {
    if (!tab.url || !tab.id) return null;

    // Parse URL first (most reliable)
    const urlInfo = AtlassianUrlParser.parseJiraUrl(tab.url);
    if (!urlInfo) return null;

    // Parse title for summary and status
    const titleInfo = JiraTitleParser.parseTitle(tab.title || '');

    // Combine information
    return {
      projectKey: urlInfo.projectKey,
      ticketNumber: urlInfo.ticketNumber,
      fullTicket: urlInfo.fullTicket,
      summary: titleInfo.summary || tab.title || 'Untitled',
      status: titleInfo.status,
      url: tab.url,
      tabId: tab.id,
    };
  }

  /**
   * Parse a Confluence tab to extract page information
   */
  private parseConfluenceTab(tab: chrome.tabs.Tab): ConfluencePageInfo | null {
    if (!tab.url || !tab.id) return null;

    const urlInfo = AtlassianUrlParser.parseConfluenceUrl(tab.url);
    if (!urlInfo) return null;

    // Extract page title from tab title
    // Confluence titles often have format: "Page Title - Space Name - Confluence"
    let pageTitle = tab.title || 'Untitled';

    // Clean up common Confluence title suffixes
    pageTitle = pageTitle
      .replace(/\s*-\s*Confluence\s*$/, '')
      .replace(/\s*\|\s*Confluence\s*$/, '')
      .trim();

    return {
      spaceKey: urlInfo.spaceKey,
      pageTitle,
      url: tab.url,
      tabId: tab.id,
    };
  }

  /**
   * Group Jira and Confluence tabs by project/space
   */
  groupAtlassianTabs(
    jiraTabs: JiraTicketInfo[],
    confluenceTabs: ConfluencePageInfo[],
    otherAtlassian: chrome.tabs.Tab[]
  ): AtlassianGrouping {
    // Group Jira tickets by project
    const jiraProjects = new Map<string, JiraTicketInfo[]>();
    for (const ticket of jiraTabs) {
      const existing = jiraProjects.get(ticket.projectKey) || [];
      existing.push(ticket);
      jiraProjects.set(ticket.projectKey, existing);
    }

    // Sort tickets within each project by ticket number (descending)
    for (const [projectKey, tickets] of jiraProjects.entries()) {
      tickets.sort((a, b) => b.ticketNumber - a.ticketNumber);
      jiraProjects.set(projectKey, tickets);
    }

    // Group Confluence pages by space
    const confluenceSpaces = new Map<string, ConfluencePageInfo[]>();
    for (const page of confluenceTabs) {
      const existing = confluenceSpaces.get(page.spaceKey) || [];
      existing.push(page);
      confluenceSpaces.set(page.spaceKey, existing);
    }

    // Sort pages within each space by title
    for (const [spaceKey, pages] of confluenceSpaces.entries()) {
      pages.sort((a, b) => a.pageTitle.localeCompare(b.pageTitle));
      confluenceSpaces.set(spaceKey, pages);
    }

    return {
      jiraProjects,
      confluenceSpaces,
      otherAtlassian,
    };
  }

  /**
   * Get Jira tickets by status for a specific project
   */
  getTicketsByStatus(
    tickets: JiraTicketInfo[],
    status: 'todo' | 'in-progress' | 'in-review' | 'done' | 'blocked'
  ): JiraTicketInfo[] {
    return tickets.filter((ticket) => ticket.status === status);
  }

  /**
   * Get statistics for Jira tickets
   */
  getJiraStats(jiraTabs: JiraTicketInfo[]): {
    totalTickets: number;
    projectCount: number;
    byStatus: Record<string, number>;
    topProjects: Array<{ projectKey: string; count: number }>;
  } {
    const projectCounts = new Map<string, number>();
    const statusCounts: Record<string, number> = {
      todo: 0,
      'in-progress': 0,
      'in-review': 0,
      done: 0,
      blocked: 0,
      unknown: 0,
    };

    for (const ticket of jiraTabs) {
      // Count by project
      projectCounts.set(ticket.projectKey, (projectCounts.get(ticket.projectKey) || 0) + 1);

      // Count by status
      statusCounts[ticket.status || 'unknown']++;
    }

    // Get top projects sorted by count
    const topProjects = Array.from(projectCounts.entries())
      .map(([projectKey, count]) => ({ projectKey, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalTickets: jiraTabs.length,
      projectCount: projectCounts.size,
      byStatus: statusCounts,
      topProjects,
    };
  }

  /**
   * Get statistics for Confluence pages
   */
  getConfluenceStats(confluenceTabs: ConfluencePageInfo[]): {
    totalPages: number;
    spaceCount: number;
    topSpaces: Array<{ spaceKey: string; count: number }>;
  } {
    const spaceCounts = new Map<string, number>();

    for (const page of confluenceTabs) {
      spaceCounts.set(page.spaceKey, (spaceCounts.get(page.spaceKey) || 0) + 1);
    }

    const topSpaces = Array.from(spaceCounts.entries())
      .map(([spaceKey, count]) => ({ spaceKey, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalPages: confluenceTabs.length,
      spaceCount: spaceCounts.size,
      topSpaces,
    };
  }

  /**
   * Search for Jira tickets by ticket number or summary
   */
  searchJiraTickets(tickets: JiraTicketInfo[], query: string): JiraTicketInfo[] {
    const lowerQuery = query.toLowerCase().trim();

    return tickets.filter((ticket) => {
      // Match by full ticket number (e.g., "ENG-123")
      if (ticket.fullTicket.toLowerCase().includes(lowerQuery)) return true;

      // Match by partial ticket number (e.g., "123")
      if (ticket.ticketNumber.toString().includes(lowerQuery)) return true;

      // Match by summary
      if (ticket.summary.toLowerCase().includes(lowerQuery)) return true;

      return false;
    });
  }

  /**
   * Search for Confluence pages by title or space
   */
  searchConfluencePages(pages: ConfluencePageInfo[], query: string): ConfluencePageInfo[] {
    const lowerQuery = query.toLowerCase().trim();

    return pages.filter((page) => {
      // Match by space key
      if (page.spaceKey.toLowerCase().includes(lowerQuery)) return true;

      // Match by page title
      if (page.pageTitle.toLowerCase().includes(lowerQuery)) return true;

      return false;
    });
  }
}

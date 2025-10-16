import { AtlassianUrlParser } from './urlParser';
import { JiraTitleParser } from './titleParser';
import type { JiraTicketInfo } from '../../types/jira';

/**
 * Enhanced search functionality for Jira tickets
 */
export class JiraSearchEnhancer {
  /**
   * Check if query is a Jira ticket pattern (e.g., "ENG-123", "eng 123", "123")
   */
  static isTicketPattern(query: string): boolean {
    const trimmed = query.trim();
    // Match: PROJECT-NUMBER (including numbers in project key), project number, just number
    return /^[a-z][a-z0-9]*[-\s]?\d+$/i.test(trimmed) || /^\d+$/.test(trimmed);
  }

  /**
   * Check if query is a project key pattern (e.g., "ENG", "DESIGN")
   * Must be uppercase or start with uppercase to avoid false positives
   */
  static isProjectPattern(query: string): boolean {
    const trimmed = query.trim();
    // Match pattern starting with uppercase, reasonable length
    // This avoids matching regular words like "login", "feature", etc.
    // Case-sensitive to require uppercase
    return /^[A-Z][A-Z0-9]*$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 10;
  }

  /**
   * Parse ticket number from query
   * Handles: "ENG-123", "eng-123", "eng 123"
   */
  static parseTicketQuery(query: string): string | null {
    const trimmed = query.trim();

    // Try exact pattern: PROJECT-NUMBER or PROJECT NUMBER
    const match = trimmed.match(/^([a-z]+)[-\s]?(\d+)$/i);
    if (match) {
      const [, project, number] = match;
      return `${project.toUpperCase()}-${number}`;
    }

    return null;
  }

  /**
   * Extract all Jira tickets from tabs
   */
  static extractJiraTickets(tabs: chrome.tabs.Tab[]): Map<number, JiraTicketInfo> {
    const jiraTickets = new Map<number, JiraTicketInfo>();

    for (const tab of tabs) {
      if (!tab.url || !tab.id) continue;

      const urlInfo = AtlassianUrlParser.parseJiraUrl(tab.url);
      if (urlInfo) {
        const titleInfo = JiraTitleParser.parseTitle(tab.title || '');
        jiraTickets.set(tab.id, {
          ...urlInfo,
          summary: titleInfo.summary || tab.title || 'Untitled',
          status: titleInfo.status,
          url: tab.url,
          tabId: tab.id,
        });
      }
    }

    return jiraTickets;
  }

  /**
   * Enhanced search for Jira tabs
   * Returns results with priority scoring
   */
  static searchJiraTabs(
    query: string,
    allTabs: chrome.tabs.Tab[]
  ): Array<{ tab: chrome.tabs.Tab; score: number; reason: string }> {
    const trimmedQuery = query.trim();
    const lowerQuery = trimmedQuery.toLowerCase();
    const results: Array<{ tab: chrome.tabs.Tab; score: number; reason: string }> = [];

    // Extract all Jira tickets
    const jiraTickets = this.extractJiraTickets(allTabs);

    // Case 1: Exact ticket number search (highest priority)
    if (this.isTicketPattern(lowerQuery)) {
      const ticketNumber = this.parseTicketQuery(lowerQuery);
      if (ticketNumber) {
        // Exact match
        for (const [tabId, ticket] of jiraTickets) {
          if (ticket.fullTicket === ticketNumber) {
            const tab = allTabs.find((t) => t.id === tabId);
            if (tab) {
              results.push({
                tab,
                score: 1.0,
                reason: `Exact match: ${ticket.fullTicket}`,
              });
            }
          }
        }

        // If exact match found, return immediately
        if (results.length > 0) {
          return results;
        }

        // Partial match by number only
        const numberOnly = lowerQuery.match(/\d+$/)?.[0];
        if (numberOnly) {
          for (const [tabId, ticket] of jiraTickets) {
            if (ticket.ticketNumber.toString() === numberOnly) {
              const tab = allTabs.find((t) => t.id === tabId);
              if (tab) {
                results.push({
                  tab,
                  score: 0.9,
                  reason: `Ticket number match: ${ticket.fullTicket}`,
                });
              }
            }
          }
        }
      }

      // If ticket pattern but no matches, return empty (don't fall through)
      return results;
    }

    // Case 2: Project filter (e.g., "ENG" → all ENG-* tickets)
    if (this.isProjectPattern(trimmedQuery)) {
      const projectKey = trimmedQuery.toUpperCase();
      for (const [tabId, ticket] of jiraTickets) {
        if (ticket.projectKey === projectKey) {
          const tab = allTabs.find((t) => t.id === tabId);
          if (tab) {
            results.push({
              tab,
              score: 0.85,
              reason: `Project match: ${projectKey}`,
            });
          }
        }
      }

      // Sort by ticket number descending
      results.sort((a, b) => {
        const aTicket = jiraTickets.get(a.tab.id!);
        const bTicket = jiraTickets.get(b.tab.id!);
        if (aTicket && bTicket) {
          return bTicket.ticketNumber - aTicket.ticketNumber;
        }
        return 0;
      });

      return results;
    }

    // Case 3: Text search in ticket summary (only if not a ticket/project pattern)
    if (!this.isTicketPattern(lowerQuery) && !this.isProjectPattern(trimmedQuery)) {
      const keywords = lowerQuery.split(/\s+/).filter((k) => k.length > 0);
      if (keywords.length > 0) {
        for (const [tabId, ticket] of jiraTickets) {
          const searchText = `${ticket.fullTicket} ${ticket.summary}`.toLowerCase();
          const matchCount = keywords.filter((keyword) => searchText.includes(keyword)).length;

          if (matchCount > 0) {
            const tab = allTabs.find((t) => t.id === tabId);
            if (tab) {
              const score = 0.7 * (matchCount / keywords.length);
              results.push({
                tab,
                score,
                reason: `Summary match: ${matchCount}/${keywords.length} keywords`,
              });
            }
          }
        }
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Get ticket info for a tab (if it's a Jira tab)
   */
  static getTicketInfo(tab: chrome.tabs.Tab): JiraTicketInfo | null {
    if (!tab.url || !tab.id) return null;

    const urlInfo = AtlassianUrlParser.parseJiraUrl(tab.url);
    if (!urlInfo) return null;

    const titleInfo = JiraTitleParser.parseTitle(tab.title || '');
    return {
      ...urlInfo,
      summary: titleInfo.summary || tab.title || 'Untitled',
      status: titleInfo.status,
      url: tab.url,
      tabId: tab.id,
    };
  }

  /**
   * Format search result description for Jira tickets
   */
  static formatResultDescription(tab: chrome.tabs.Tab): string {
    const ticketInfo = this.getTicketInfo(tab);
    if (!ticketInfo) return tab.title || 'Untitled';

    const statusText = ticketInfo.status && ticketInfo.status !== 'unknown'
      ? ` [${JiraTitleParser.getStatusDisplayName(ticketInfo.status)}]`
      : '';

    return `${ticketInfo.fullTicket}: ${ticketInfo.summary}${statusText}`;
  }
}

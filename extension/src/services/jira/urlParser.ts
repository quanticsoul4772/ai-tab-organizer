import type { JiraTicketInfo, ConfluencePageInfo } from '../../types/jira';

/**
 * Parse Jira and Confluence URLs to extract structured data
 */
export class AtlassianUrlParser {
  private static JIRA_PATTERNS = [
    // Atlassian Cloud: https://company.atlassian.net/browse/ENG-123
    /\/browse\/([A-Z][A-Z0-9]*)-(\d+)/,
    // Jira Server/Data Center: https://jira.company.com/browse/ENG-123
    /jira.*?\/browse\/([A-Z][A-Z0-9]*)-(\d+)/,
    // Alternative pattern: /projects/ENG/issues/ENG-123
    /\/projects\/[A-Z][A-Z0-9]*\/issues\/([A-Z][A-Z0-9]*)-(\d+)/,
  ];

  private static CONFLUENCE_PATTERNS = [
    // Atlassian Cloud: /wiki/spaces/KEY/...
    /\/wiki\/spaces\/([A-Z0-9]+)/,
    // Confluence Server: /display/KEY/...
    /\/display\/([A-Z0-9]+)/,
    // Alternative: /confluence/display/KEY/...
    /\/confluence\/display\/([A-Z0-9]+)/,
  ];

  /**
   * Parse Jira ticket information from URL
   */
  static parseJiraUrl(
    url: string
  ): Pick<JiraTicketInfo, 'projectKey' | 'ticketNumber' | 'fullTicket'> | null {
    if (!url) return null;

    for (const pattern of this.JIRA_PATTERNS) {
      const match = url.match(pattern);
      if (match) {
        const [, projectKey, ticketNumber] = match;
        return {
          projectKey: projectKey.toUpperCase(),
          ticketNumber: parseInt(ticketNumber, 10),
          fullTicket: `${projectKey.toUpperCase()}-${ticketNumber}`,
        };
      }
    }

    return null;
  }

  /**
   * Parse Confluence space information from URL
   */
  static parseConfluenceUrl(url: string): Pick<ConfluencePageInfo, 'spaceKey'> | null {
    if (!url) return null;

    for (const pattern of this.CONFLUENCE_PATTERNS) {
      const match = url.match(pattern);
      if (match) {
        return {
          spaceKey: match[1].toUpperCase(),
        };
      }
    }

    return null;
  }

  /**
   * Check if URL is from Atlassian (Jira or Confluence)
   */
  static isAtlassianUrl(url: string): boolean {
    if (!url) return false;

    return (
      url.includes('atlassian.net') ||
      url.includes('/jira/') ||
      url.includes('/browse/') ||
      url.includes('/wiki/') ||
      url.includes('/confluence/') ||
      url.includes('/display/')
    );
  }

  /**
   * Detect type of Atlassian URL
   */
  static getAtlassianType(url: string): 'jira' | 'confluence' | 'other' | null {
    if (!this.isAtlassianUrl(url)) return null;

    if (this.parseJiraUrl(url)) return 'jira';
    if (this.parseConfluenceUrl(url)) return 'confluence';

    return 'other';
  }
}

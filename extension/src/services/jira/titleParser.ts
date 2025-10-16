import type { JiraStatus } from '../../types/jira';

/**
 * Parse Jira ticket information from tab titles
 */
export class JiraTitleParser {
  /**
   * Parse Jira ticket info from tab title
   *
   * Supported patterns:
   * - [ENG-123] Fix login bug - In Progress
   * - [ENG-123] Fix login bug
   * - ENG-123: Fix login bug (In Progress)
   * - ENG-123 | Fix login bug - In Progress
   */
  static parseTitle(title: string): {
    fullTicket?: string;
    summary?: string;
    status?: JiraStatus;
  } {
    if (!title) return {};

    // Pattern 1: [TICKET] Summary - Status
    let match = title.match(/\[([A-Z][A-Z0-9]+-\d+)\]\s*(.+?)(?:\s*-\s*(.+))?$/);
    if (match) {
      return {
        fullTicket: match[1],
        summary: match[2]?.trim(),
        status: this.parseStatus(match[3]),
      };
    }

    // Pattern 2: TICKET: Summary (Status)
    match = title.match(/^([A-Z][A-Z0-9]+-\d+):\s*(.+?)(?:\s*\((.+?)\))?$/);
    if (match) {
      return {
        fullTicket: match[1],
        summary: match[2]?.trim(),
        status: this.parseStatus(match[3]),
      };
    }

    // Pattern 3: TICKET | Summary - Status
    match = title.match(/^([A-Z][A-Z0-9]+-\d+)\s*\|\s*(.+?)(?:\s*-\s*(.+))?$/);
    if (match) {
      return {
        fullTicket: match[1],
        summary: match[2]?.trim(),
        status: this.parseStatus(match[3]),
      };
    }

    // Pattern 4: [TICKET] Summary (Status)
    match = title.match(/\[([A-Z][A-Z0-9]+-\d+)\]\s*(.+?)(?:\s*\((.+?)\))?$/);
    if (match) {
      return {
        fullTicket: match[1],
        summary: match[2]?.trim(),
        status: this.parseStatus(match[3]),
      };
    }

    return {};
  }

  /**
   * Parse status from text
   */
  static parseStatus(statusText?: string): JiraStatus {
    if (!statusText) return 'unknown';

    const lower = statusText.toLowerCase().trim();

    // To Do / Open
    if (
      lower.includes('to do') ||
      lower.includes('todo') ||
      lower.includes('open') ||
      lower.includes('backlog')
    ) {
      return 'todo';
    }

    // In Progress
    if (
      lower.includes('in progress') ||
      lower.includes('in-progress') ||
      lower.includes('doing') ||
      lower.includes('working') ||
      lower.includes('started')
    ) {
      return 'in-progress';
    }

    // In Review
    if (
      lower.includes('in review') ||
      lower.includes('in-review') ||
      lower.includes('review') ||
      lower.includes('reviewing') ||
      lower.includes('code review') ||
      lower.includes('pr review')
    ) {
      return 'in-review';
    }

    // Done / Closed
    if (
      lower.includes('done') ||
      lower.includes('closed') ||
      lower.includes('resolved') ||
      lower.includes('complete') ||
      lower.includes('finished')
    ) {
      return 'done';
    }

    // Blocked
    if (
      lower.includes('blocked') ||
      lower.includes('waiting') ||
      lower.includes('on hold') ||
      lower.includes('paused') ||
      lower.includes('impediment')
    ) {
      return 'blocked';
    }

    return 'unknown';
  }

  /**
   * Extract ticket number from title (any format)
   */
  static extractTicketNumber(title: string): string | null {
    if (!title) return null;

    // Match any TICKET-NUMBER pattern in the title
    const match = title.match(/([A-Z][A-Z0-9]+-\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Get display name for status
   */
  static getStatusDisplayName(status: JiraStatus): string {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in-progress':
        return 'In Progress';
      case 'in-review':
        return 'In Review';
      case 'done':
        return 'Done';
      case 'blocked':
        return 'Blocked';
      default:
        return '';
    }
  }

  /**
   * Get status color
   */
  static getStatusColor(status: JiraStatus): string {
    switch (status) {
      case 'todo':
        return '#0052cc'; // Blue
      case 'in-progress':
        return '#ffab00'; // Yellow
      case 'in-review':
        return '#6554c0'; // Purple
      case 'done':
        return '#36b37e'; // Green
      case 'blocked':
        return '#ff5630'; // Red
      default:
        return '#6b7280'; // Gray
    }
  }
}

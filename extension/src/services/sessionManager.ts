import type { Session, SessionTab } from '../types/session';
import { storage } from '../utils/storage';
import { tabManager } from './tabManager';
import { AtlassianDetectionService } from './jira/atlassianDetectionService';
import { tabs } from '../core/browserApi';

const atlassianService = new AtlassianDetectionService();

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert Chrome tabs to SessionTabs
 */
function convertToSessionTabs(tabs: chrome.tabs.Tab[]): SessionTab[] {
  return tabs
    .filter(tab => tab.url && tab.url.startsWith('http'))
    .map((tab, index) => ({
      url: tab.url!,
      title: tab.title || tab.url!,
      pinned: tab.pinned || false,
      groupId: tab.groupId === -1 ? undefined : tab.groupId,
      index,
    }));
}

/**
 * Extract Jira tickets and determine workspace categories
 */
async function analyzeJiraWorkspace(tabs: chrome.tabs.Tab[]): Promise<{
  jiraTickets: string[];
  categories: string[];
}> {
  const { jiraTabs } = await atlassianService.detectAtlassianTabs(tabs);

  if (jiraTabs.length === 0) {
    return { jiraTickets: [], categories: [] };
  }

  // Extract unique ticket keys
  const tickets = jiraTabs.map(t => t.fullTicket);

  // Get categories (project keys)
  const categories = Array.from(new Set(jiraTabs.map(t => t.projectKey)));

  return { jiraTickets: tickets, categories };
}

export const sessionManager = {
  /**
   * Save current browser tabs as a session
   */
  async saveCurrentSession(name: string, description?: string): Promise<Session> {
    const tabs = await tabManager.getAllTabs();
    const sessionTabs = convertToSessionTabs(tabs);
    const { jiraTickets, categories } = await analyzeJiraWorkspace(tabs);

    const session: Session = {
      id: generateSessionId(),
      name,
      description,
      created: Date.now(),
      lastModified: Date.now(),
      tabs: sessionTabs,
      metadata: {
        tabCount: sessionTabs.length,
        jiraTickets: jiraTickets.length > 0 ? jiraTickets : undefined,
        categories: categories.length > 0 ? categories : undefined,
      },
    };

    await storage.saveSession(session);
    return session;
  },

  /**
   * Restore a session (opens all tabs from session)
   */
  async restoreSession(sessionId: string, closeExisting: boolean = false): Promise<void> {
    const session = await storage.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Close existing tabs if requested
    if (closeExisting) {
      const existingTabs = await tabManager.getAllTabs();
      const tabIds = existingTabs
        .filter(tab => !tab.pinned) // Don't close pinned tabs
        .map(tab => tab.id)
        .filter((id): id is number => id !== undefined);

      if (tabIds.length > 0) {
        await tabs.closeMultiple(tabIds);
      }
    }

    // Open session tabs
    for (const sessionTab of session.tabs) {
      await tabs.create({
        url: sessionTab.url,
        pinned: sessionTab.pinned,
        active: false,
      });
    }

    // Update last modified timestamp
    await storage.updateSessionMetadata(sessionId, {});
  },

  /**
   * Get all saved sessions
   */
  async getAllSessions() {
    return storage.getAllSessions();
  },

  /**
   * Get a specific session
   */
  async getSession(sessionId: string) {
    return storage.getSession(sessionId);
  },

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await storage.deleteSession(sessionId);
  },

  /**
   * Update session name or description
   */
  async updateSession(
    sessionId: string,
    updates: { name?: string; description?: string }
  ): Promise<void> {
    await storage.updateSessionMetadata(sessionId, updates);
  },

  /**
   * Duplicate a session with a new name
   */
  async duplicateSession(sessionId: string, newName: string): Promise<Session> {
    const originalSession = await storage.getSession(sessionId);
    if (!originalSession) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const duplicatedSession: Session = {
      ...originalSession,
      id: generateSessionId(),
      name: newName,
      created: Date.now(),
      lastModified: Date.now(),
    };

    await storage.saveSession(duplicatedSession);
    return duplicatedSession;
  },

  /**
   * Get all workspaces (unique Jira projects across all sessions)
   */
  async getAllWorkspaces(): Promise<string[]> {
    const sessions = await storage.getAllSessions();
    const workspaces = new Set<string>();

    for (const sessionItem of sessions) {
      const session = await storage.getSession(sessionItem.id);
      if (session?.metadata.categories) {
        session.metadata.categories.forEach(cat => workspaces.add(cat));
      }
    }

    return Array.from(workspaces).sort();
  },

  /**
   * Filter sessions by workspace (Jira project)
   */
  async getSessionsByWorkspace(workspace: string) {
    const sessions = await storage.getAllSessions();
    const filtered = [];

    for (const sessionItem of sessions) {
      const session = await storage.getSession(sessionItem.id);
      if (session?.metadata.categories?.includes(workspace)) {
        filtered.push(sessionItem);
      }
    }

    return filtered;
  },

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(): Promise<{
    totalWorkspaces: number;
    workspaceSessionCounts: Array<{ workspace: string; sessionCount: number }>;
  }> {
    const sessions = await storage.getAllSessions();
    const workspaceCounts = new Map<string, number>();

    for (const sessionItem of sessions) {
      const session = await storage.getSession(sessionItem.id);
      if (session?.metadata.categories) {
        session.metadata.categories.forEach(workspace => {
          workspaceCounts.set(workspace, (workspaceCounts.get(workspace) || 0) + 1);
        });
      }
    }

    const workspaceSessionCounts = Array.from(workspaceCounts.entries())
      .map(([workspace, sessionCount]) => ({ workspace, sessionCount }))
      .sort((a, b) => b.sessionCount - a.sessionCount);

    return {
      totalWorkspaces: workspaceCounts.size,
      workspaceSessionCounts,
    };
  },

  /**
   * Export a session to JSON
   */
  async exportSession(sessionId: string): Promise<string> {
    const session = await storage.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      session,
    };

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Export all sessions to JSON
   */
  async exportAllSessions(): Promise<string> {
    const sessions = await storage.getAllSessions();
    const fullSessions: Session[] = [];

    for (const sessionItem of sessions) {
      const fullSession = await storage.getSession(sessionItem.id);
      if (fullSession) {
        fullSessions.push(fullSession);
      }
    }

    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      sessionCount: fullSessions.length,
      sessions: fullSessions,
    };

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Import a session from JSON
   */
  async importSession(jsonData: string): Promise<Session> {
    try {
      const data = JSON.parse(jsonData);

      // Validate import data
      if (!data.version || !data.session) {
        throw new Error('Invalid session export format');
      }

      const importedSession = data.session as Session;

      // Generate new ID to avoid conflicts
      const newSession: Session = {
        ...importedSession,
        id: generateSessionId(),
        created: Date.now(),
        lastModified: Date.now(),
      };

      await storage.saveSession(newSession);
      return newSession;
    } catch (error) {
      throw new Error('Failed to import session: ' + (error as Error).message);
    }
  },

  /**
   * Import multiple sessions from JSON
   */
  async importSessions(jsonData: string): Promise<Session[]> {
    try {
      const data = JSON.parse(jsonData);

      // Validate import data
      if (!data.version || !data.sessions || !Array.isArray(data.sessions)) {
        throw new Error('Invalid sessions export format');
      }

      const importedSessions: Session[] = [];

      for (const session of data.sessions) {
        const newSession: Session = {
          ...session,
          id: generateSessionId(),
          created: Date.now(),
          lastModified: Date.now(),
        };

        await storage.saveSession(newSession);
        importedSessions.push(newSession);
      }

      return importedSessions;
    } catch (error) {
      throw new Error('Failed to import sessions: ' + (error as Error).message);
    }
  },
};

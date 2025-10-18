import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '../../utils/storage';
import { tabManager } from '../tabManager';
import type { Session } from '../../types/session';

// Mock dependencies
vi.mock('../../utils/storage');
vi.mock('../tabManager');

// Mock AtlassianDetectionService with a mutable mock function we can override per test
const mockDetectAtlassianTabs = vi.fn().mockResolvedValue({
  jiraTabs: [],
  confluenceTabs: [],
  otherAtlassian: [],
});

vi.mock('../jira/atlassianDetectionService', () => ({
  AtlassianDetectionService: vi.fn().mockImplementation(() => ({
    detectAtlassianTabs: mockDetectAtlassianTabs,
  })),
}));

// Import sessionManager AFTER setting up mocks
const { sessionManager } = await import('../sessionManager');

describe('sessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock behavior
    mockDetectAtlassianTabs.mockResolvedValue({
      jiraTabs: [],
      confluenceTabs: [],
      otherAtlassian: [],
    });
  });

  describe('saveCurrentSession', () => {
    it('should save session with tabs and metadata', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', pinned: false, groupId: -1 },
        { id: 2, url: 'https://test.com', title: 'Test', pinned: true, groupId: -1 },
      ] as chrome.tabs.Tab[];

      vi.mocked(tabManager.getAllTabs).mockResolvedValue(mockTabs);
      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      const session = await sessionManager.saveCurrentSession('My Session', 'Description');

      expect(session.name).toBe('My Session');
      expect(session.description).toBe('Description');
      expect(session.tabs).toHaveLength(2);
      expect(session.metadata.tabCount).toBe(2);
      expect(storage.saveSession).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My Session',
        description: 'Description',
      }));
    });

    it('should generate unique session ID', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', pinned: false, groupId: -1 },
      ] as chrome.tabs.Tab[];

      vi.mocked(tabManager.getAllTabs).mockResolvedValue(mockTabs);
      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      const session1 = await sessionManager.saveCurrentSession('Session 1');
      const session2 = await sessionManager.saveCurrentSession('Session 2');

      expect(session1.id).not.toBe(session2.id);
      expect(session1.id).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should filter out non-http tabs', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', pinned: false, groupId: -1 },
        { id: 2, url: 'chrome://extensions', title: 'Extensions', pinned: false, groupId: -1 },
        { id: 3, url: 'about:blank', title: 'Blank', pinned: false, groupId: -1 },
      ] as chrome.tabs.Tab[];

      vi.mocked(tabManager.getAllTabs).mockResolvedValue(mockTabs);
      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      const session = await sessionManager.saveCurrentSession('Test');

      expect(session.tabs).toHaveLength(1);
      expect(session.tabs[0].url).toBe('https://example.com');
    });

    it('should detect Jira workspaces in tabs', async () => {
      const mockTabs = [
        { id: 1, url: 'https://jira.atlassian.com/browse/ENG-123', title: 'ENG-123: Bug fix', pinned: false, groupId: -1 },
        { id: 2, url: 'https://example.com', title: 'Example', pinned: false, groupId: -1 },
      ] as chrome.tabs.Tab[];

      vi.mocked(tabManager.getAllTabs).mockResolvedValue(mockTabs);
      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      // Override the default mock for this test
      mockDetectAtlassianTabs.mockResolvedValueOnce({
        jiraTabs: [{
          projectKey: 'ENG',
          ticketNumber: 123,
          fullTicket: 'ENG-123',
          summary: 'Bug fix',
          status: undefined,
          url: 'https://jira.atlassian.com/browse/ENG-123',
          tabId: 1,
        }],
        confluenceTabs: [],
        otherAtlassian: [],
      });

      const session = await sessionManager.saveCurrentSession('Jira Session');

      expect(session.metadata.categories).toContain('ENG');
      expect(session.metadata.jiraTickets).toContain('ENG-123');
    });

    it('should handle sessions with no Jira tabs', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', pinned: false, groupId: -1 },
      ] as chrome.tabs.Tab[];

      vi.mocked(tabManager.getAllTabs).mockResolvedValue(mockTabs);
      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      // This test uses the default mock (empty jiraTabs array), which is already set up
      const session = await sessionManager.saveCurrentSession('Regular Session');

      expect(session.metadata.jiraTickets).toBeUndefined();
      expect(session.metadata.categories).toBeUndefined();
    });

    it('should preserve pinned and groupId properties', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', pinned: true, groupId: 5 },
      ] as chrome.tabs.Tab[];

      vi.mocked(tabManager.getAllTabs).mockResolvedValue(mockTabs);
      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      const session = await sessionManager.saveCurrentSession('Test');

      expect(session.tabs[0].pinned).toBe(true);
      expect(session.tabs[0].groupId).toBe(5);
    });

    it('should convert groupId -1 to undefined', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', pinned: false, groupId: -1 },
      ] as chrome.tabs.Tab[];

      vi.mocked(tabManager.getAllTabs).mockResolvedValue(mockTabs);
      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      const session = await sessionManager.saveCurrentSession('Test');

      expect(session.tabs[0].groupId).toBeUndefined();
    });
  });

  describe('restoreSession', () => {
    it('should restore session tabs', async () => {
      const mockSession: Session = {
        id: 'session_123',
        name: 'Test Session',
        created: Date.now(),
        lastModified: Date.now(),
        tabs: [
          { url: 'https://example.com', title: 'Example', pinned: false, index: 0 },
          { url: 'https://test.com', title: 'Test', pinned: false, index: 1 },
        ],
        metadata: { tabCount: 2 },
      };

      vi.mocked(storage.getSession).mockResolvedValue(mockSession);
      vi.mocked(storage.updateSessionMetadata).mockResolvedValue(undefined);

      await sessionManager.restoreSession('session_123', false);

      expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://example.com',
        pinned: false,
        active: false,
      });
    });

    it('should throw error if session not found', async () => {
      vi.mocked(storage.getSession).mockResolvedValue(null);

      await expect(sessionManager.restoreSession('invalid_id')).rejects.toThrow(
        'Session not found: invalid_id'
      );
    });

    it('should close existing tabs when closeExisting is true', async () => {
      const mockSession: Session = {
        id: 'session_123',
        name: 'Test Session',
        created: Date.now(),
        lastModified: Date.now(),
        tabs: [
          { url: 'https://example.com', title: 'Example', pinned: false, index: 0 },
        ],
        metadata: { tabCount: 1 },
      };

      const existingTabs = [
        { id: 1, pinned: false },
        { id: 2, pinned: false },
      ] as chrome.tabs.Tab[];

      vi.mocked(storage.getSession).mockResolvedValue(mockSession);
      vi.mocked(tabManager.getAllTabs).mockResolvedValue(existingTabs);
      vi.mocked(storage.updateSessionMetadata).mockResolvedValue(undefined);

      await sessionManager.restoreSession('session_123', true);

      expect(chrome.tabs.remove).toHaveBeenCalledWith([1, 2]);
    });

    it('should preserve pinned tabs when closeExisting is true', async () => {
      const mockSession: Session = {
        id: 'session_123',
        name: 'Test Session',
        created: Date.now(),
        lastModified: Date.now(),
        tabs: [
          { url: 'https://example.com', title: 'Example', pinned: false, index: 0 },
        ],
        metadata: { tabCount: 1 },
      };

      const existingTabs = [
        { id: 1, pinned: true },
        { id: 2, pinned: false },
        { id: 3, pinned: false },
      ] as chrome.tabs.Tab[];

      vi.mocked(storage.getSession).mockResolvedValue(mockSession);
      vi.mocked(tabManager.getAllTabs).mockResolvedValue(existingTabs);
      vi.mocked(storage.updateSessionMetadata).mockResolvedValue(undefined);

      await sessionManager.restoreSession('session_123', true);

      expect(chrome.tabs.remove).toHaveBeenCalledWith([2, 3]);
      expect(chrome.tabs.remove).not.toHaveBeenCalledWith(expect.arrayContaining([1]));
    });

    it('should update session lastModified timestamp', async () => {
      const mockSession: Session = {
        id: 'session_123',
        name: 'Test Session',
        created: Date.now(),
        lastModified: Date.now(),
        tabs: [
          { url: 'https://example.com', title: 'Example', pinned: false, index: 0 },
        ],
        metadata: { tabCount: 1 },
      };

      vi.mocked(storage.getSession).mockResolvedValue(mockSession);
      vi.mocked(storage.updateSessionMetadata).mockResolvedValue(undefined);

      await sessionManager.restoreSession('session_123');

      expect(storage.updateSessionMetadata).toHaveBeenCalledWith('session_123', {});
    });
  });

  describe('getAllSessions', () => {
    it('should return all sessions from storage', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1', created: 1, lastModified: 1, tabCount: 5 },
        { id: '2', name: 'Session 2', created: 2, lastModified: 2, tabCount: 3 },
      ];

      vi.mocked(storage.getAllSessions).mockResolvedValue(mockSessions);

      const result = await sessionManager.getAllSessions();

      expect(result).toEqual(mockSessions);
      expect(storage.getAllSessions).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return specific session by ID', async () => {
      const mockSession: Session = {
        id: 'session_123',
        name: 'Test Session',
        created: Date.now(),
        lastModified: Date.now(),
        tabs: [],
        metadata: { tabCount: 0 },
      };

      vi.mocked(storage.getSession).mockResolvedValue(mockSession);

      const result = await sessionManager.getSession('session_123');

      expect(result).toEqual(mockSession);
      expect(storage.getSession).toHaveBeenCalledWith('session_123');
    });
  });

  describe('deleteSession', () => {
    it('should delete session from storage', async () => {
      vi.mocked(storage.deleteSession).mockResolvedValue(undefined);

      await sessionManager.deleteSession('session_123');

      expect(storage.deleteSession).toHaveBeenCalledWith('session_123');
    });
  });

  describe('updateSession', () => {
    it('should update session name and description', async () => {
      vi.mocked(storage.updateSessionMetadata).mockResolvedValue(undefined);

      await sessionManager.updateSession('session_123', {
        name: 'New Name',
        description: 'New Description',
      });

      expect(storage.updateSessionMetadata).toHaveBeenCalledWith('session_123', {
        name: 'New Name',
        description: 'New Description',
      });
    });
  });

  describe('duplicateSession', () => {
    it('should create a copy with new ID and timestamps', async () => {
      const originalSession: Session = {
        id: 'session_123',
        name: 'Original Session',
        created: 1000,
        lastModified: 2000,
        tabs: [
          { url: 'https://example.com', title: 'Example', pinned: false, index: 0 },
        ],
        metadata: { tabCount: 1 },
      };

      vi.mocked(storage.getSession).mockResolvedValue(originalSession);
      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      const duplicated = await sessionManager.duplicateSession('session_123', 'Copy of Original');

      expect(duplicated.id).not.toBe(originalSession.id);
      expect(duplicated.name).toBe('Copy of Original');
      expect(duplicated.created).toBeGreaterThan(originalSession.created);
      expect(duplicated.lastModified).toBeGreaterThan(originalSession.lastModified);
      expect(duplicated.tabs).toEqual(originalSession.tabs);
      expect(storage.saveSession).toHaveBeenCalledWith(duplicated);
    });

    it('should throw error if original session not found', async () => {
      vi.mocked(storage.getSession).mockResolvedValue(null);

      await expect(
        sessionManager.duplicateSession('invalid_id', 'Copy')
      ).rejects.toThrow('Session not found: invalid_id');
    });
  });

  describe('getAllWorkspaces', () => {
    it('should return unique workspace categories from all sessions', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1', categories: ['ENG', 'APPS'], created: 1, lastModified: 1, tabCount: 5 },
        { id: '2', name: 'Session 2', categories: ['ENG', 'DATA'], created: 2, lastModified: 2, tabCount: 3 },
        { id: '3', name: 'Session 3', created: 3, lastModified: 3, tabCount: 2 },
      ];

      const mockFullSessions: Session[] = [
        {
          id: '1',
          name: 'Session 1',
          created: 1,
          lastModified: 1,
          tabs: [],
          metadata: { tabCount: 5, categories: ['ENG', 'APPS'] },
        },
        {
          id: '2',
          name: 'Session 2',
          created: 2,
          lastModified: 2,
          tabs: [],
          metadata: { tabCount: 3, categories: ['ENG', 'DATA'] },
        },
        {
          id: '3',
          name: 'Session 3',
          created: 3,
          lastModified: 3,
          tabs: [],
          metadata: { tabCount: 2 },
        },
      ];

      vi.mocked(storage.getAllSessions).mockResolvedValue(mockSessions);
      vi.mocked(storage.getSession).mockImplementation(async (id) => {
        return mockFullSessions.find(s => s.id === id) || null;
      });

      const workspaces = await sessionManager.getAllWorkspaces();

      expect(workspaces).toEqual(['APPS', 'DATA', 'ENG']); // Sorted alphabetically
      expect(workspaces).toHaveLength(3);
    });

    it('should return empty array if no sessions have categories', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1', created: 1, lastModified: 1, tabCount: 5 },
      ];

      const mockFullSession: Session = {
        id: '1',
        name: 'Session 1',
        created: 1,
        lastModified: 1,
        tabs: [],
        metadata: { tabCount: 5 },
      };

      vi.mocked(storage.getAllSessions).mockResolvedValue(mockSessions);
      vi.mocked(storage.getSession).mockResolvedValue(mockFullSession);

      const workspaces = await sessionManager.getAllWorkspaces();

      expect(workspaces).toEqual([]);
    });
  });

  describe('getSessionsByWorkspace', () => {
    it('should filter sessions by workspace', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1', categories: ['ENG', 'APPS'], created: 1, lastModified: 1, tabCount: 5 },
        { id: '2', name: 'Session 2', categories: ['DATA'], created: 2, lastModified: 2, tabCount: 3 },
        { id: '3', name: 'Session 3', categories: ['ENG'], created: 3, lastModified: 3, tabCount: 2 },
      ];

      const mockFullSessions: Session[] = [
        {
          id: '1',
          name: 'Session 1',
          created: 1,
          lastModified: 1,
          tabs: [],
          metadata: { tabCount: 5, categories: ['ENG', 'APPS'] },
        },
        {
          id: '2',
          name: 'Session 2',
          created: 2,
          lastModified: 2,
          tabs: [],
          metadata: { tabCount: 3, categories: ['DATA'] },
        },
        {
          id: '3',
          name: 'Session 3',
          created: 3,
          lastModified: 3,
          tabs: [],
          metadata: { tabCount: 2, categories: ['ENG'] },
        },
      ];

      vi.mocked(storage.getAllSessions).mockResolvedValue(mockSessions);
      vi.mocked(storage.getSession).mockImplementation(async (id) => {
        return mockFullSessions.find(s => s.id === id) || null;
      });

      const engSessions = await sessionManager.getSessionsByWorkspace('ENG');

      expect(engSessions).toHaveLength(2);
      expect(engSessions[0].id).toBe('1');
      expect(engSessions[1].id).toBe('3');
    });

    it('should return empty array if no sessions match workspace', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1', categories: ['DATA'], created: 1, lastModified: 1, tabCount: 5 },
      ];

      const mockFullSession: Session = {
        id: '1',
        name: 'Session 1',
        created: 1,
        lastModified: 1,
        tabs: [],
        metadata: { tabCount: 5, categories: ['DATA'] },
      };

      vi.mocked(storage.getAllSessions).mockResolvedValue(mockSessions);
      vi.mocked(storage.getSession).mockResolvedValue(mockFullSession);

      const result = await sessionManager.getSessionsByWorkspace('ENG');

      expect(result).toEqual([]);
    });
  });

  describe('exportSession', () => {
    it('should export session as JSON string', async () => {
      const mockSession: Session = {
        id: 'session_123',
        name: 'Test Session',
        created: 1000,
        lastModified: 2000,
        tabs: [
          { url: 'https://example.com', title: 'Example', pinned: false, index: 0 },
        ],
        metadata: { tabCount: 1 },
      };

      vi.mocked(storage.getSession).mockResolvedValue(mockSession);

      const jsonData = await sessionManager.exportSession('session_123');
      const parsed = JSON.parse(jsonData);

      expect(parsed.version).toBe('1.0');
      expect(parsed.exportedAt).toBeGreaterThan(0);
      expect(parsed.session).toEqual(mockSession);
    });

    it('should throw error if session not found for export', async () => {
      vi.mocked(storage.getSession).mockResolvedValue(null);

      await expect(sessionManager.exportSession('invalid_id')).rejects.toThrow(
        'Session not found: invalid_id'
      );
    });
  });

  describe('exportAllSessions', () => {
    it('should export all sessions as JSON string', async () => {
      const mockSessionItems = [
        { id: '1', name: 'Session 1', created: 1, lastModified: 1, tabCount: 5 },
        { id: '2', name: 'Session 2', created: 2, lastModified: 2, tabCount: 3 },
      ];

      const mockFullSessions: Session[] = [
        {
          id: '1',
          name: 'Session 1',
          created: 1,
          lastModified: 1,
          tabs: [{ url: 'https://example.com', title: 'Example', pinned: false, index: 0 }],
          metadata: { tabCount: 5 },
        },
        {
          id: '2',
          name: 'Session 2',
          created: 2,
          lastModified: 2,
          tabs: [{ url: 'https://test.com', title: 'Test', pinned: false, index: 0 }],
          metadata: { tabCount: 3 },
        },
      ];

      vi.mocked(storage.getAllSessions).mockResolvedValue(mockSessionItems);
      vi.mocked(storage.getSession).mockImplementation(async (id) => {
        return mockFullSessions.find(s => s.id === id) || null;
      });

      const jsonData = await sessionManager.exportAllSessions();
      const parsed = JSON.parse(jsonData);

      expect(parsed.version).toBe('1.0');
      expect(parsed.exportedAt).toBeGreaterThan(0);
      expect(parsed.sessionCount).toBe(2);
      expect(parsed.sessions).toHaveLength(2);
      expect(parsed.sessions[0]).toEqual(mockFullSessions[0]);
      expect(parsed.sessions[1]).toEqual(mockFullSessions[1]);
    });

    it('should export empty array if no sessions', async () => {
      vi.mocked(storage.getAllSessions).mockResolvedValue([]);

      const jsonData = await sessionManager.exportAllSessions();
      const parsed = JSON.parse(jsonData);

      expect(parsed.sessionCount).toBe(0);
      expect(parsed.sessions).toEqual([]);
    });
  });

  describe('importSession', () => {
    it('should import session from valid JSON', async () => {
      const exportData = {
        version: '1.0',
        exportedAt: Date.now(),
        session: {
          id: 'old_id',
          name: 'Imported Session',
          created: 1000,
          lastModified: 2000,
          tabs: [
            { url: 'https://example.com', title: 'Example', pinned: false, index: 0 },
          ],
          metadata: { tabCount: 1 },
        },
      };

      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      const imported = await sessionManager.importSession(JSON.stringify(exportData));

      expect(imported.id).not.toBe('old_id'); // New ID generated
      expect(imported.name).toBe('Imported Session');
      expect(imported.tabs).toEqual(exportData.session.tabs);
      expect(imported.created).toBeGreaterThan(exportData.session.created);
      expect(storage.saveSession).toHaveBeenCalled();
    });

    it('should throw error for invalid JSON format', async () => {
      await expect(sessionManager.importSession('invalid json')).rejects.toThrow(
        'Failed to import session'
      );
    });

    it('should throw error for missing version', async () => {
      const badData = {
        session: { name: 'Test' },
      };

      await expect(sessionManager.importSession(JSON.stringify(badData))).rejects.toThrow(
        'Invalid session export format'
      );
    });

    it('should throw error for missing session data', async () => {
      const badData = {
        version: '1.0',
        exportedAt: Date.now(),
      };

      await expect(sessionManager.importSession(JSON.stringify(badData))).rejects.toThrow(
        'Invalid session export format'
      );
    });
  });

  describe('importSessions', () => {
    it('should import multiple sessions from valid JSON', async () => {
      const exportData = {
        version: '1.0',
        exportedAt: Date.now(),
        sessionCount: 2,
        sessions: [
          {
            id: 'old_id_1',
            name: 'Session 1',
            created: 1000,
            lastModified: 2000,
            tabs: [{ url: 'https://example.com', title: 'Example', pinned: false, index: 0 }],
            metadata: { tabCount: 1 },
          },
          {
            id: 'old_id_2',
            name: 'Session 2',
            created: 1500,
            lastModified: 2500,
            tabs: [{ url: 'https://test.com', title: 'Test', pinned: false, index: 0 }],
            metadata: { tabCount: 1 },
          },
        ],
      };

      vi.mocked(storage.saveSession).mockResolvedValue(undefined);

      const imported = await sessionManager.importSessions(JSON.stringify(exportData));

      expect(imported).toHaveLength(2);
      expect(imported[0].id).not.toBe('old_id_1');
      expect(imported[1].id).not.toBe('old_id_2');
      expect(imported[0].name).toBe('Session 1');
      expect(imported[1].name).toBe('Session 2');
      expect(storage.saveSession).toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid JSON format', async () => {
      await expect(sessionManager.importSessions('invalid json')).rejects.toThrow(
        'Failed to import sessions'
      );
    });

    it('should throw error if sessions is not an array', async () => {
      const badData = {
        version: '1.0',
        sessions: 'not an array',
      };

      await expect(sessionManager.importSessions(JSON.stringify(badData))).rejects.toThrow(
        'Invalid sessions export format'
      );
    });

    it('should import empty sessions array', async () => {
      const exportData = {
        version: '1.0',
        exportedAt: Date.now(),
        sessionCount: 0,
        sessions: [],
      };

      const imported = await sessionManager.importSessions(JSON.stringify(exportData));

      expect(imported).toEqual([]);
      expect(storage.saveSession).not.toHaveBeenCalled();
    });
  });

  describe('getWorkspaceStats', () => {
    it('should return workspace statistics', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1', categories: ['ENG', 'APPS'], created: 1, lastModified: 1, tabCount: 5 },
        { id: '2', name: 'Session 2', categories: ['ENG'], created: 2, lastModified: 2, tabCount: 3 },
        { id: '3', name: 'Session 3', categories: ['DATA'], created: 3, lastModified: 3, tabCount: 2 },
      ];

      const mockFullSessions: Session[] = [
        {
          id: '1',
          name: 'Session 1',
          created: 1,
          lastModified: 1,
          tabs: [],
          metadata: { tabCount: 5, categories: ['ENG', 'APPS'] },
        },
        {
          id: '2',
          name: 'Session 2',
          created: 2,
          lastModified: 2,
          tabs: [],
          metadata: { tabCount: 3, categories: ['ENG'] },
        },
        {
          id: '3',
          name: 'Session 3',
          created: 3,
          lastModified: 3,
          tabs: [],
          metadata: { tabCount: 2, categories: ['DATA'] },
        },
      ];

      vi.mocked(storage.getAllSessions).mockResolvedValue(mockSessions);
      vi.mocked(storage.getSession).mockImplementation(async (id) => {
        return mockFullSessions.find(s => s.id === id) || null;
      });

      const stats = await sessionManager.getWorkspaceStats();

      expect(stats.totalWorkspaces).toBe(3);
      expect(stats.workspaceSessionCounts).toHaveLength(3);
      expect(stats.workspaceSessionCounts[0]).toEqual({ workspace: 'ENG', sessionCount: 2 });
      expect(stats.workspaceSessionCounts[1]).toEqual({ workspace: 'APPS', sessionCount: 1 });
      expect(stats.workspaceSessionCounts[2]).toEqual({ workspace: 'DATA', sessionCount: 1 });
    });
  });
});

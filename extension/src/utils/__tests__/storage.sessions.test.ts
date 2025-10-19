import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '../storage';
import type { Session } from '../../types/session';

describe('storage - session methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSessions', () => {
    it('should return list of all sessions with preview', async () => {
      const mockSessions = {
        session_1: {
          id: 'session_1',
          name: 'Work Session',
          description: 'My work tabs',
          created: 1000,
          lastModified: 2000,
          tabs: [
            { url: 'https://example.com', title: 'Example', pinned: false, index: 0 },
            { url: 'https://test.com', title: 'Test', pinned: false, index: 1 },
            { url: 'https://demo.com', title: 'Demo', pinned: false, index: 2 },
            { url: 'https://extra.com', title: 'Extra', pinned: false, index: 3 },
          ],
          metadata: {
            tabCount: 4,
            categories: ['ENG'],
            jiraTickets: ['ENG-123'],
          },
        },
        session_2: {
          id: 'session_2',
          name: 'Personal',
          created: 3000,
          lastModified: 4000,
          tabs: [{ url: 'https://personal.com', title: 'Personal', pinned: false, index: 0 }],
          metadata: { tabCount: 1 },
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ sessions: mockSessions });

      const result = await storage.getAllSessions();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'session_1',
        name: 'Work Session',
        description: 'My work tabs',
        created: 1000,
        lastModified: 2000,
        tabCount: 4,
        preview: 'Example, Test, Demo', // First 3 tabs
        categories: ['ENG'],
        jiraTickets: ['ENG-123'],
      });
      expect(result[1]).toEqual({
        id: 'session_2',
        name: 'Personal',
        description: undefined,
        created: 3000,
        lastModified: 4000,
        tabCount: 1,
        preview: 'Personal',
        categories: undefined,
        jiraTickets: undefined,
      });
    });

    it('should return empty array when no sessions exist', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const result = await storage.getAllSessions();

      expect(result).toEqual([]);
    });

    it('should handle sessions with fewer than 3 tabs in preview', async () => {
      const mockSessions = {
        session_1: {
          id: 'session_1',
          name: 'Small Session',
          created: 1000,
          lastModified: 2000,
          tabs: [{ url: 'https://single.com', title: 'Single', pinned: false, index: 0 }],
          metadata: { tabCount: 1 },
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ sessions: mockSessions });

      const result = await storage.getAllSessions();

      expect(result[0].preview).toBe('Single');
    });
  });

  describe('getSession', () => {
    it('should return full session by ID', async () => {
      const mockSession: Session = {
        id: 'session_123',
        name: 'Test Session',
        description: 'Test description',
        created: 1000,
        lastModified: 2000,
        tabs: [{ url: 'https://example.com', title: 'Example', pinned: false, index: 0 }],
        metadata: { tabCount: 1 },
      };

      const mockSessions = {
        session_123: mockSession,
        session_456: {
          id: 'session_456',
          name: 'Other Session',
          created: 3000,
          lastModified: 4000,
          tabs: [],
          metadata: { tabCount: 0 },
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ sessions: mockSessions });

      const result = await storage.getSession('session_123');

      expect(result).toEqual(mockSession);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['sessions']);
    });

    it('should return null if session not found', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ sessions: {} });

      const result = await storage.getSession('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if no sessions exist', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const result = await storage.getSession('any_id');

      expect(result).toBeNull();
    });
  });

  describe('saveSession', () => {
    it('should save a new session', async () => {
      const newSession: Session = {
        id: 'session_new',
        name: 'New Session',
        created: Date.now(),
        lastModified: Date.now(),
        tabs: [{ url: 'https://example.com', title: 'Example', pinned: false, index: 0 }],
        metadata: { tabCount: 1 },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ sessions: {} });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.saveSession(newSession);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        sessions: {
          session_new: newSession,
        },
      });
    });

    it('should update existing session', async () => {
      const existingSession: Session = {
        id: 'session_1',
        name: 'Old Name',
        created: 1000,
        lastModified: 2000,
        tabs: [],
        metadata: { tabCount: 0 },
      };

      const updatedSession: Session = {
        ...existingSession,
        name: 'New Name',
        lastModified: 3000,
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        sessions: { session_1: existingSession },
      });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.saveSession(updatedSession);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        sessions: {
          session_1: updatedSession,
        },
      });
    });

    it('should preserve other sessions when saving', async () => {
      const existingSession: Session = {
        id: 'session_1',
        name: 'Session 1',
        created: 1000,
        lastModified: 2000,
        tabs: [],
        metadata: { tabCount: 0 },
      };

      const newSession: Session = {
        id: 'session_2',
        name: 'Session 2',
        created: 3000,
        lastModified: 4000,
        tabs: [],
        metadata: { tabCount: 0 },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        sessions: { session_1: existingSession },
      });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.saveSession(newSession);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        sessions: {
          session_1: existingSession,
          session_2: newSession,
        },
      });
    });
  });

  describe('deleteSession', () => {
    it('should delete a session by ID', async () => {
      const mockSessions = {
        session_1: {
          id: 'session_1',
          name: 'Session 1',
          created: 1000,
          lastModified: 2000,
          tabs: [],
          metadata: { tabCount: 0 },
        },
        session_2: {
          id: 'session_2',
          name: 'Session 2',
          created: 3000,
          lastModified: 4000,
          tabs: [],
          metadata: { tabCount: 0 },
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ sessions: mockSessions });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.deleteSession('session_1');

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        sessions: {
          session_2: mockSessions['session_2'],
        },
      });
    });

    it('should handle deleting nonexistent session', async () => {
      const mockSessions = {
        session_1: {
          id: 'session_1',
          name: 'Session 1',
          created: 1000,
          lastModified: 2000,
          tabs: [],
          metadata: { tabCount: 0 },
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ sessions: mockSessions });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.deleteSession('nonexistent');

      // Should still call set but without the nonexistent session
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        sessions: mockSessions,
      });
    });

    it('should handle deleting from empty sessions', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.deleteSession('any_id');

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ sessions: {} });
    });
  });

  describe('updateSessionMetadata', () => {
    it('should update session name', async () => {
      const originalSession: Session = {
        id: 'session_123',
        name: 'Old Name',
        description: 'Description',
        created: 1000,
        lastModified: 2000,
        tabs: [{ url: 'https://example.com', title: 'Example', pinned: false, index: 0 }],
        metadata: { tabCount: 1 },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        sessions: { session_123: originalSession },
      });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.updateSessionMetadata('session_123', { name: 'New Name' });

      const expectedUpdated = {
        ...originalSession,
        name: 'New Name',
        lastModified: expect.any(Number),
      };

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        sessions: {
          session_123: expectedUpdated,
        },
      });

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(callArg.sessions['session_123'].lastModified).toBeGreaterThan(2000);
    });

    it('should update session description', async () => {
      const originalSession: Session = {
        id: 'session_123',
        name: 'Name',
        created: 1000,
        lastModified: 2000,
        tabs: [],
        metadata: { tabCount: 0 },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        sessions: { session_123: originalSession },
      });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.updateSessionMetadata('session_123', { description: 'New Description' });

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(callArg.sessions['session_123'].description).toBe('New Description');
      expect(callArg.sessions['session_123'].name).toBe('Name'); // Unchanged
    });

    it('should update both name and description', async () => {
      const originalSession: Session = {
        id: 'session_123',
        name: 'Old Name',
        description: 'Old Description',
        created: 1000,
        lastModified: 2000,
        tabs: [],
        metadata: { tabCount: 0 },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        sessions: { session_123: originalSession },
      });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.updateSessionMetadata('session_123', {
        name: 'New Name',
        description: 'New Description',
      });

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(callArg.sessions['session_123'].name).toBe('New Name');
      expect(callArg.sessions['session_123'].description).toBe('New Description');
    });

    it('should preserve tabs and metadata when updating', async () => {
      const originalSession: Session = {
        id: 'session_123',
        name: 'Name',
        created: 1000,
        lastModified: 2000,
        tabs: [{ url: 'https://example.com', title: 'Example', pinned: true, index: 0 }],
        metadata: {
          tabCount: 1,
          categories: ['ENG'],
          jiraTickets: ['ENG-123'],
        },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        sessions: { session_123: originalSession },
      });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.updateSessionMetadata('session_123', { name: 'New Name' });

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(callArg.sessions['session_123'].tabs).toEqual(originalSession.tabs);
      expect(callArg.sessions['session_123'].metadata).toEqual(originalSession.metadata);
    });

    it('should do nothing if session not found', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ sessions: {} });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      await storage.updateSessionMetadata('nonexistent', { name: 'New Name' });

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should update lastModified timestamp', async () => {
      const originalSession: Session = {
        id: 'session_123',
        name: 'Name',
        created: 1000,
        lastModified: 2000,
        tabs: [],
        metadata: { tabCount: 0 },
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        sessions: { session_123: originalSession },
      });
      vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

      const beforeUpdate = Date.now();
      await storage.updateSessionMetadata('session_123', { name: 'New Name' });
      const afterUpdate = Date.now();

      const callArg = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      const newLastModified = callArg.sessions['session_123'].lastModified;

      expect(newLastModified).toBeGreaterThanOrEqual(beforeUpdate);
      expect(newLastModified).toBeLessThanOrEqual(afterUpdate);
      expect(newLastModified).toBeGreaterThan(2000);
    });
  });
});

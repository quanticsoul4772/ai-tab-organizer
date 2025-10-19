import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '../storage';

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Key', () => {
    it('should get API key from storage', async () => {
      const mockKey = 'test-api-key';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
        anthropicApiKey: mockKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await storage.getApiKey();

      expect(result).toBe(mockKey);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['anthropicApiKey']);
    });

    it('should return null when no API key exists', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

      const result = await storage.getApiKey();

      expect(result).toBeNull();
    });

    it('should set API key in storage', async () => {
      const mockKey = 'new-api-key';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

      await storage.setApiKey(mockKey);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ anthropicApiKey: mockKey });
    });

    it('should clear API key from storage', async () => {
      vi.mocked(chrome.storage.local.remove).mockResolvedValue(undefined);

      await storage.clearApiKey();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith('anthropicApiKey');
    });
  });

  describe('Group States', () => {
    it('should get group states from storage', async () => {
      const mockStates = { Work: true, Research: false };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
        groupStates: mockStates,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await storage.getGroupStates();

      expect(result).toEqual(mockStates);
    });

    it('should return empty object when no group states exist', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

      const result = await storage.getGroupStates();

      expect(result).toEqual({});
    });

    it('should set group state for a specific category', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.get as any).mockResolvedValue({ groupStates: {} });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

      await storage.setGroupState('Work', true);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        groupStates: { Work: true },
      });
    });

    it('should merge new group state with existing states', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
        groupStates: { Work: true },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

      await storage.setGroupState('Research', false);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        groupStates: { Work: true, Research: false },
      });
    });

    it('should clear all group states', async () => {
      vi.mocked(chrome.storage.local.remove).mockResolvedValue(undefined);

      await storage.clearGroupStates();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith('groupStates');
    });
  });

  describe('Density Mode', () => {
    it('should get density mode from storage', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
        densityMode: 'compact',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await storage.getDensityMode();

      expect(result).toBe('compact');
    });

    it('should return null when no density mode exists', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

      const result = await storage.getDensityMode();

      expect(result).toBeNull();
    });

    it('should set density mode in storage', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

      await storage.setDensityMode('spacious');

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ densityMode: 'spacious' });
    });
  });

  describe('Jira Settings', () => {
    it('should get Jira settings with default', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

      const result = await storage.getJiraSettings();

      expect(result).toEqual({ smartMode: true });
    });

    it('should set Jira settings', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(chrome.storage.local.set as any).mockResolvedValue(undefined);

      await storage.setJiraSettings({ smartMode: false });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        jiraSettings: { smartMode: false },
      });
    });
  });
});

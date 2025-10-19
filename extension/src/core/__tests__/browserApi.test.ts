import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tabs, storage, runtime, scripting } from '../browserApi';

// Mock Chrome APIs
const mockChrome = {
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    create: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    id: 'test-extension-id',
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    lastError: null as chrome.runtime.LastError | undefined | null,
  },
  scripting: {
    executeScript: vi.fn(),
  },
};

// Set up global chrome mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

describe('browserApi - tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all tabs', async () => {
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
        { id: 2, title: 'Tab 2', url: 'https://test.com' },
      ];
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const result = await tabs.getAll();

      expect(result).toEqual(mockTabs);
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({});
    });
  });

  describe('getActive', () => {
    it('should get the active tab', async () => {
      const mockActiveTab = { id: 1, title: 'Active Tab', url: 'https://active.com' };
      mockChrome.tabs.query.mockResolvedValue([mockActiveTab]);

      const result = await tabs.getActive();

      expect(result).toEqual(mockActiveTab);
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    });

    it('should return null if no active tab', async () => {
      mockChrome.tabs.query.mockResolvedValue([]);

      const result = await tabs.getActive();

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('should get a tab by ID', async () => {
      const mockTab = { id: 123, title: 'Test Tab', url: 'https://test.com' };
      mockChrome.tabs.get.mockResolvedValue(mockTab);

      const result = await tabs.getById(123);

      expect(result).toEqual(mockTab);
      expect(mockChrome.tabs.get).toHaveBeenCalledWith(123);
    });

    it('should return null if tab does not exist', async () => {
      mockChrome.tabs.get.mockRejectedValue(new Error('Tab not found'));

      const result = await tabs.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('switchTo', () => {
    it('should switch to a tab', async () => {
      const mockTab = { id: 1, active: true };
      mockChrome.tabs.update.mockResolvedValue(mockTab);

      await tabs.switchTo(1);

      expect(mockChrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    });
  });

  describe('close', () => {
    it('should close a tab', async () => {
      mockChrome.tabs.remove.mockResolvedValue(undefined);

      await tabs.close(1);

      expect(mockChrome.tabs.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('closeMultiple', () => {
    it('should close multiple tabs', async () => {
      mockChrome.tabs.remove.mockResolvedValue(undefined);

      await tabs.closeMultiple([1, 2, 3]);

      expect(mockChrome.tabs.remove).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  describe('create', () => {
    it('should create a new tab', async () => {
      const mockNewTab = { id: 4, url: 'https://new.com' };
      mockChrome.tabs.create.mockResolvedValue(mockNewTab);

      const result = await tabs.create({ url: 'https://new.com' });

      expect(result).toEqual(mockNewTab);
      expect(mockChrome.tabs.create).toHaveBeenCalledWith({ url: 'https://new.com' });
    });
  });
});

describe('browserApi - storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should get a value from storage', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockChrome.storage.local.get.mockResolvedValue({ testKey: 'testValue' } as any);

      const result = await storage.get('testKey');

      expect(result).toBe('testValue');
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['testKey']);
    });

    it('should return default value if key does not exist', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const result = await storage.get('nonExistent', 'defaultValue');

      expect(result).toBe('defaultValue');
    });

    it('should return null if no default value provided', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const result = await storage.get('nonExistent');

      expect(result).toBeNull();
    });
  });

  describe('getMultiple', () => {
    it('should get multiple values from storage', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        key1: 'value1',
        key2: 'value2',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await storage.getMultiple(['key1', 'key2']);

      expect(result).toEqual({ key1: 'value1', key2: 'value2' });
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['key1', 'key2']);
    });
  });

  describe('set', () => {
    it('should set a value in storage', async () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await storage.set('testKey', 'testValue');

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ testKey: 'testValue' });
    });
  });

  describe('setMultiple', () => {
    it('should set multiple values in storage', async () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await storage.setMultiple({ key1: 'value1', key2: 'value2' });

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ key1: 'value1', key2: 'value2' });
    });
  });

  describe('remove', () => {
    it('should remove a value from storage', async () => {
      mockChrome.storage.local.remove.mockResolvedValue(undefined);

      await storage.remove('testKey');

      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith('testKey');
    });
  });

  describe('removeMultiple', () => {
    it('should remove multiple values from storage', async () => {
      mockChrome.storage.local.remove.mockResolvedValue(undefined);

      await storage.removeMultiple(['key1', 'key2']);

      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(['key1', 'key2']);
    });
  });

  describe('clear', () => {
    it('should clear all storage', async () => {
      mockChrome.storage.local.clear.mockResolvedValue(undefined);

      await storage.clear();

      expect(mockChrome.storage.local.clear).toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should get all items from storage', async () => {
      const mockData = { key1: 'value1', key2: 'value2' };
      mockChrome.storage.local.get.mockResolvedValue(mockData);

      const result = await storage.getAll();

      expect(result).toEqual(mockData);
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(null);
    });
  });
});

describe('browserApi - runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.runtime.lastError = null;
  });

  describe('sendMessage', () => {
    it('should send a message and resolve on success', async () => {
      const mockResponse = { success: true, data: { result: 'test' } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockChrome.runtime.sendMessage.mockImplementation((_message: any, callback: any) => {
        callback(mockResponse);
      });

      const result = await runtime.sendMessage('testAction', { foo: 'bar' });

      expect(result).toEqual({ result: 'test' });
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'testAction', foo: 'bar' },
        expect.any(Function)
      );
    });

    it('should reject if runtime error occurs', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockChrome.runtime.sendMessage.mockImplementation((_message: any, callback: any) => {
        mockChrome.runtime.lastError = { message: 'Connection error' } as chrome.runtime.LastError;
        callback(undefined);
      });

      await expect(runtime.sendMessage('testAction')).rejects.toThrow('Connection error');
    });

    it('should reject if response is not successful', async () => {
      const mockResponse = { success: false, error: 'Test error' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockChrome.runtime.sendMessage.mockImplementation((_message: any, callback: any) => {
        callback(mockResponse);
      });

      await expect(runtime.sendMessage('testAction')).rejects.toThrow('Test error');
    });

    it('should reject with generic message if no error provided', async () => {
      const mockResponse = { success: false };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockChrome.runtime.sendMessage.mockImplementation((_message: any, callback: any) => {
        callback(mockResponse);
      });

      await expect(runtime.sendMessage('testAction')).rejects.toThrow(
        'Failed to execute action: testAction'
      );
    });
  });

  describe('getId', () => {
    it('should return extension ID', () => {
      const result = runtime.getId();

      expect(result).toBe('test-extension-id');
    });
  });

  describe('getURL', () => {
    it('should return full URL for a resource', () => {
      const result = runtime.getURL('popup.html');

      expect(result).toBe('chrome-extension://test-id/popup.html');
      expect(mockChrome.runtime.getURL).toHaveBeenCalledWith('popup.html');
    });
  });
});

describe('browserApi - scripting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeScript', () => {
    it('should execute a script and return results', async () => {
      const mockResults = [{ result: 'test result' }];
      mockChrome.scripting.executeScript.mockResolvedValue(mockResults);

      const result = await scripting.executeScript(123, { func: () => 'test' });

      expect(result).toEqual(['test result']);
      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        func: expect.any(Function),
      });
    });
  });
});

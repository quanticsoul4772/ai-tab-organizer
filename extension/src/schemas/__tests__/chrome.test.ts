import { describe, it, expect } from 'vitest';
import {
  TabSchema,
  SimplifiedTabSchema,
  StorageDataSchema,
  MessageSchema,
  MessageResponseSchema,
} from '../chrome';

describe('TabSchema', () => {
  it('validates complete tab object', () => {
    const tab = {
      id: 123,
      index: 0,
      windowId: 1,
      highlighted: true,
      active: true,
      pinned: false,
      url: 'https://example.com',
      title: 'Example',
      favIconUrl: 'https://example.com/favicon.ico',
      status: 'complete' as const,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      lastAccessed: 1234567890,
      audible: false,
      mutedInfo: { muted: false },
      incognito: false,
      width: 1920,
      height: 1080,
      sessionId: 'session_123',
    };

    expect(TabSchema.parse(tab)).toEqual(tab);
  });

  it('validates minimal tab object', () => {
    const tab = {
      index: 0,
      windowId: 1,
      highlighted: false,
      active: false,
      pinned: false,
      groupId: -1,
      incognito: false,
    };

    expect(TabSchema.parse(tab)).toEqual(tab);
  });

  it('validates both status values', () => {
    const baseTab = {
      index: 0,
      windowId: 1,
      highlighted: false,
      active: false,
      pinned: false,
      groupId: -1,
      incognito: false,
    };

    expect(() => TabSchema.parse({ ...baseTab, status: 'loading' })).not.toThrow();
    expect(() => TabSchema.parse({ ...baseTab, status: 'complete' })).not.toThrow();
  });

  it('rejects invalid status', () => {
    const tab = {
      index: 0,
      windowId: 1,
      highlighted: false,
      active: false,
      pinned: false,
      groupId: -1,
      incognito: false,
      status: 'invalid',
    };

    expect(() => TabSchema.parse(tab)).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => TabSchema.parse({})).toThrow();
    expect(() =>
      TabSchema.parse({
        index: 0,
        // missing windowId
      })
    ).toThrow();
  });
});

describe('SimplifiedTabSchema', () => {
  it('validates simplified tab with all fields', () => {
    const tab = {
      id: 123,
      title: 'Example',
      url: 'https://example.com',
      favIconUrl: 'https://example.com/favicon.ico',
    };

    expect(SimplifiedTabSchema.parse(tab)).toEqual(tab);
  });

  it('validates empty simplified tab', () => {
    const tab = {};
    expect(SimplifiedTabSchema.parse(tab)).toEqual(tab);
  });

  it('validates partial simplified tab', () => {
    const tab = {
      id: 123,
      title: 'Example',
    };

    expect(SimplifiedTabSchema.parse(tab)).toEqual(tab);
  });
});

describe('StorageDataSchema', () => {
  it('validates complete storage data', () => {
    const data = {
      apiKey: 'sk-ant-1234',
      settings: {
        jiraSmartMode: true,
        autoIndex: true,
        summaryCache: true,
        defaultDensity: 'normal' as const,
      },
      summaryCache: {
        'tab_123': { summary: 'test' },
      },
      tabIndex: {
        'tab_456': { content: 'test' },
      },
      groupStates: {
        Work: true,
        Development: false,
      },
      sessions: {
        'session_123': { name: 'My Session' },
      },
    };

    expect(StorageDataSchema.parse(data)).toEqual(data);
  });

  it('validates empty storage data', () => {
    expect(StorageDataSchema.parse({})).toEqual({});
  });

  it('validates all density modes', () => {
    ['compact', 'normal', 'spacious'].forEach((density) => {
      const data = {
        settings: { defaultDensity: density },
      };
      expect(() => StorageDataSchema.parse(data)).not.toThrow();
    });
  });

  it('rejects invalid density mode', () => {
    const data = {
      settings: { defaultDensity: 'invalid' },
    };
    expect(() => StorageDataSchema.parse(data)).toThrow();
  });

  it('validates partial settings', () => {
    const data = {
      settings: {
        jiraSmartMode: true,
      },
    };
    expect(StorageDataSchema.parse(data)).toEqual(data);
  });
});

describe('MessageSchema', () => {
  it('validates categorize message', () => {
    const message = {
      action: 'categorize' as const,
      tabs: [{ id: 123, title: 'Test' }],
      apiKey: 'sk-ant-1234',
    };

    expect(MessageSchema.parse(message)).toEqual(message);
  });

  it('validates summarizeTab message', () => {
    const message = {
      action: 'summarizeTab' as const,
      tabId: 123,
      apiKey: 'sk-ant-1234',
    };

    expect(MessageSchema.parse(message)).toEqual(message);
  });

  it('validates summarizeCategory message', () => {
    const message = {
      action: 'summarizeCategory' as const,
      category: 'Work',
      tabs: [{ id: 123, title: 'Test' }],
      apiKey: 'sk-ant-1234',
    };

    expect(MessageSchema.parse(message)).toEqual(message);
  });

  it('validates extractContent message', () => {
    const message = {
      action: 'extractContent' as const,
      tabId: 123,
    };

    expect(MessageSchema.parse(message)).toEqual(message);
  });

  it('validates indexTab message', () => {
    const message = {
      action: 'indexTab' as const,
      tabId: 123,
    };

    expect(MessageSchema.parse(message)).toEqual(message);
  });

  it('validates search message', () => {
    const message = {
      action: 'search' as const,
      query: 'test query',
    };

    expect(MessageSchema.parse(message)).toEqual(message);
  });

  it('validates all action types', () => {
    const actions = [
      'categorize',
      'summarizeTab',
      'summarizeCategory',
      'extractContent',
      'indexTab',
      'search',
    ];

    actions.forEach((action) => {
      const message = { action };
      expect(() => MessageSchema.parse(message)).not.toThrow();
    });
  });

  it('rejects invalid action', () => {
    const message = {
      action: 'invalid',
    };
    expect(() => MessageSchema.parse(message)).toThrow();
  });

  it('rejects missing action', () => {
    expect(() => MessageSchema.parse({})).toThrow();
  });
});

describe('MessageResponseSchema', () => {
  it('validates success response', () => {
    const response = {
      success: true as const,
      data: { categories: { Work: [0, 1] } },
    };

    expect(MessageResponseSchema.parse(response)).toEqual(response);
  });

  it('validates success with null data', () => {
    const response = {
      success: true as const,
      data: null,
    };

    expect(MessageResponseSchema.parse(response)).toEqual(response);
  });

  it('validates error response', () => {
    const response = {
      success: false as const,
      error: 'API call failed',
    };

    expect(MessageResponseSchema.parse(response)).toEqual(response);
  });

  it('validates error with retryable flag', () => {
    const response = {
      success: false as const,
      error: 'Network error',
      retryable: true,
    };

    expect(MessageResponseSchema.parse(response)).toEqual(response);
  });

  it('validates error with retryable false', () => {
    const response = {
      success: false as const,
      error: 'Invalid API key',
      retryable: false,
    };

    expect(MessageResponseSchema.parse(response)).toEqual(response);
  });

  it('validates success with undefined data', () => {
    const response = {
      success: true as const,
      data: undefined,
    };
    expect(MessageResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects error without message', () => {
    const response = {
      success: false,
    };
    expect(() => MessageResponseSchema.parse(response)).toThrow();
  });

  it('rejects invalid success value', () => {
    const response = {
      success: 'yes',
      data: {},
    };
    expect(() => MessageResponseSchema.parse(response)).toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import {
  ClaudeResponseSchema,
  CategoryResponseSchema,
  TabSummarySchema,
  CategorySummarySchema,
  ContentExtractionSchema,
  APIErrorSchema,
} from '../api';

describe('ClaudeResponseSchema', () => {
  it('validates valid Claude API response', () => {
    const validResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello' }],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    expect(ClaudeResponseSchema.parse(validResponse)).toEqual(validResponse);
  });

  it('validates response without optional fields', () => {
    const minimalResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello' }],
      model: 'claude-3-5-sonnet-20241022',
    };

    expect(ClaudeResponseSchema.parse(minimalResponse)).toEqual(minimalResponse);
  });

  it('validates all stop_reason values', () => {
    ['end_turn', 'max_tokens', 'stop_sequence'].forEach((reason) => {
      const response = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: reason,
      };
      expect(() => ClaudeResponseSchema.parse(response)).not.toThrow();
    });
  });

  it('rejects invalid type', () => {
    const invalidResponse = {
      id: 'msg_123',
      type: 'invalid',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello' }],
      model: 'claude-3-5-sonnet-20241022',
    };

    expect(() => ClaudeResponseSchema.parse(invalidResponse)).toThrow();
  });

  it('rejects invalid role', () => {
    const invalidResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'user',
      content: [{ type: 'text', text: 'Hello' }],
      model: 'claude-3-5-sonnet-20241022',
    };

    expect(() => ClaudeResponseSchema.parse(invalidResponse)).toThrow();
  });

  it('rejects invalid content type', () => {
    const invalidResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'image', text: 'Hello' }],
      model: 'claude-3-5-sonnet-20241022',
    };

    expect(() => ClaudeResponseSchema.parse(invalidResponse)).toThrow();
  });

  it('validates multiple content blocks', () => {
    const response = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [
        { type: 'text', text: 'First' },
        { type: 'text', text: 'Second' },
      ],
      model: 'claude-3-5-sonnet-20241022',
    };

    expect(ClaudeResponseSchema.parse(response)).toEqual(response);
  });
});

describe('CategoryResponseSchema', () => {
  it('validates valid category response', () => {
    const validCategories = {
      Work: [0, 1, 2],
      Development: [3, 4],
      Shopping: [5],
    };

    expect(CategoryResponseSchema.parse(validCategories)).toEqual(validCategories);
  });

  it('validates empty categories', () => {
    const emptyCategories = {};
    expect(CategoryResponseSchema.parse(emptyCategories)).toEqual(emptyCategories);
  });

  it('validates empty arrays', () => {
    const categories = {
      Work: [],
      Development: [1, 2],
    };
    expect(CategoryResponseSchema.parse(categories)).toEqual(categories);
  });

  it('rejects non-array values', () => {
    const invalid = {
      Work: 'invalid',
    };
    expect(() => CategoryResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects non-number array elements', () => {
    const invalid = {
      Work: ['0', '1'],
    };
    expect(() => CategoryResponseSchema.parse(invalid)).toThrow();
  });
});

describe('TabSummarySchema', () => {
  it('validates summary with all fields', () => {
    const summary = {
      summary: 'This is a GitHub issue tracker',
      keyPoints: ['Open issues', 'Pull requests'],
      confidence: 0.95,
    };

    expect(TabSummarySchema.parse(summary)).toEqual(summary);
  });

  it('validates minimal summary', () => {
    const summary = {
      summary: 'A web page',
    };
    expect(TabSummarySchema.parse(summary)).toEqual(summary);
  });

  it('validates confidence bounds', () => {
    expect(() => TabSummarySchema.parse({ summary: 'test', confidence: 0 })).not.toThrow();
    expect(() => TabSummarySchema.parse({ summary: 'test', confidence: 1 })).not.toThrow();
    expect(() => TabSummarySchema.parse({ summary: 'test', confidence: 0.5 })).not.toThrow();
  });

  it('rejects confidence out of bounds', () => {
    expect(() => TabSummarySchema.parse({ summary: 'test', confidence: -0.1 })).toThrow();
    expect(() => TabSummarySchema.parse({ summary: 'test', confidence: 1.1 })).toThrow();
  });

  it('rejects missing summary', () => {
    expect(() => TabSummarySchema.parse({ keyPoints: ['test'] })).toThrow();
  });
});

describe('CategorySummarySchema', () => {
  it('validates category summary with all fields', () => {
    const summary = {
      summary: 'Work-related tabs',
      tabCount: 5,
      commonThemes: ['Jira', 'GitHub'],
      confidence: 0.9,
    };

    expect(CategorySummarySchema.parse(summary)).toEqual(summary);
  });

  it('validates minimal category summary', () => {
    const summary = {
      summary: 'Work tabs',
      tabCount: 3,
    };
    expect(CategorySummarySchema.parse(summary)).toEqual(summary);
  });

  it('rejects missing tabCount', () => {
    expect(() => CategorySummarySchema.parse({ summary: 'test' })).toThrow();
  });

  it('validates confidence bounds', () => {
    expect(() =>
      CategorySummarySchema.parse({ summary: 'test', tabCount: 1, confidence: 0 })
    ).not.toThrow();
    expect(() =>
      CategorySummarySchema.parse({ summary: 'test', tabCount: 1, confidence: 1 })
    ).not.toThrow();
  });
});

describe('ContentExtractionSchema', () => {
  it('validates valid content extraction', () => {
    const content = {
      title: 'Page Title',
      headings: ['H1', 'H2'],
      content: 'Page content',
      metaDescription: 'Meta description',
      url: 'https://example.com',
    };

    expect(ContentExtractionSchema.parse(content)).toEqual(content);
  });

  it('validates without optional metaDescription', () => {
    const content = {
      title: 'Page Title',
      headings: ['H1'],
      content: 'Content',
      url: 'https://example.com',
    };

    expect(ContentExtractionSchema.parse(content)).toEqual(content);
  });

  it('validates empty arrays', () => {
    const content = {
      title: 'Title',
      headings: [],
      content: 'Content',
      url: 'https://example.com',
    };

    expect(ContentExtractionSchema.parse(content)).toEqual(content);
  });

  it('rejects invalid URL', () => {
    const invalid = {
      title: 'Title',
      headings: [],
      content: 'Content',
      url: 'not-a-url',
    };

    expect(() => ContentExtractionSchema.parse(invalid)).toThrow();
  });

  it('validates various URL formats', () => {
    const urls = [
      'https://example.com',
      'http://example.com',
      'https://example.com/path',
      'https://example.com/path?query=1',
      'https://sub.example.com',
    ];

    urls.forEach((url) => {
      const content = {
        title: 'Title',
        headings: [],
        content: 'Content',
        url,
      };
      expect(() => ContentExtractionSchema.parse(content)).not.toThrow();
    });
  });
});

describe('APIErrorSchema', () => {
  it('validates error with nested error object', () => {
    const error = {
      type: 'error',
      message: 'Something went wrong',
      error: {
        type: 'invalid_request',
        message: 'API key missing',
      },
    };

    expect(APIErrorSchema.parse(error)).toEqual(error);
  });

  it('validates error without nested error', () => {
    const error = {
      type: 'error',
      message: 'Something went wrong',
    };

    expect(APIErrorSchema.parse(error)).toEqual(error);
  });

  it('rejects missing type', () => {
    expect(() => APIErrorSchema.parse({ message: 'error' })).toThrow();
  });

  it('rejects missing message', () => {
    expect(() => APIErrorSchema.parse({ type: 'error' })).toThrow();
  });
});

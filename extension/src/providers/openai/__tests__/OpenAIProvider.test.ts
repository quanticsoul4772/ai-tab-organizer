/**
 * Tests for OpenAIProvider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from '../OpenAIProvider';
import { AIProvider, ProviderConfig, UnifiedRequest } from '../../base/types';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'sk-test-openai-key',
      model: 'gpt-4o',
      maxTokens: 1024,
      timeout: 30000,
      maxRetries: 2,
    };
    provider = new OpenAIProvider(mockConfig);

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('should have correct provider type', () => {
      expect(provider.provider).toBe(AIProvider.OPENAI);
    });

    it('should have correct base URL', () => {
      expect(provider.baseUrl).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('should have correct headers', () => {
      const headers = provider.headers;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Authorization).toBe('Bearer sk-test-openai-key');
    });
  });

  describe('transformRequest', () => {
    it('should transform basic request', () => {
      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;

      expect(transformed.model).toBe('gpt-4o');
      expect(transformed.max_tokens).toBe(100);
      expect(Array.isArray(transformed.messages)).toBe(true);
      expect((transformed.messages as Array<unknown>).length).toBe(1);
      expect(transformed.temperature).toBe(0.7); // Default temperature
    });

    it('should include system message in messages array', () => {
      const request: UnifiedRequest = {
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
        maxTokens: 100,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;

      expect(Array.isArray(transformed.messages)).toBe(true);
      const messages = transformed.messages as Array<Record<string, string>>;
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe('You are helpful');
    });

    it('should use custom temperature', () => {
      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
        temperature: 0.5,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;

      expect(transformed.temperature).toBe(0.5);
    });
  });

  describe('transformResponse', () => {
    it('should transform valid response', () => {
      const openAIResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I assist you today?',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      const transformed = provider.transformResponse(openAIResponse);

      expect(transformed.content).toBe('Hello! How can I assist you today?');
      expect(transformed.usage.inputTokens).toBe(10);
      expect(transformed.usage.outputTokens).toBe(20);
      expect(transformed.usage.totalTokens).toBe(30);
      expect(transformed.model).toBe('gpt-4o');
      expect(transformed.provider).toBe(AIProvider.OPENAI);
    });
  });

  describe('validateResponse', () => {
    it('should validate correct response', () => {
      const response = {
        choices: [
          {
            message: {
              content: 'Hello',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(true);
    });

    it('should reject response without choices', () => {
      const response = {
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response with empty choices', () => {
      const response = {
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response without message', () => {
      const response = {
        choices: [{}],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response without usage', () => {
      const response = {
        choices: [
          {
            message: {
              content: 'Hello',
            },
          },
        ],
      };

      expect(provider.validateResponse(response)).toBe(false);
    });
  });

  describe('complete', () => {
    it('should make successful API call', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Test response from GPT-4o',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 28,
          total_tokens: 40,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        maxTokens: 100,
      };

      const result = await provider.complete(request);

      expect(result.content).toBe('Test response from GPT-4o');
      expect(result.usage.inputTokens).toBe(12);
      expect(result.usage.outputTokens).toBe(28);
      expect(result.provider).toBe(AIProvider.OPENAI);
    });
  });
});
